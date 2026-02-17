import { access, readFile, readdir } from "fs/promises";
import { dirname, join, relative, resolve } from "path";
import type { Step } from "./types";

export type ParsedSpec = {
  id: string;
  name: string;
  path: string;
  baseURL: string;
  steps: Step[];
  warnings: string[];
};

type ParseContext = {
  variables: Record<string, string>;
  locatorVars: Record<string, string>;
};

async function resolveTestsRoot(): Promise<string> {
  const candidates = [join(process.cwd(), "tests"), join(process.cwd(), "..", "tests")];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  return candidates[0];
}

function safeId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function listSpecFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSpecFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && /\.spec\.(t|j)sx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractTestName(source: string): string {
  const match = source.match(/test\(\s*(["'`])([\s\S]*?)\1\s*,/);
  return match?.[2]?.trim() || "Imported test";
}

function extractBaseUrl(source: string): string {
  const baseUrlMatch = source.match(/WEB_BASE_URL\s*=\s*(["'`])([\s\S]*?)\1\s*;/);
  if (baseUrlMatch?.[2]) return baseUrlMatch[2];

  const gotoMatch = source.match(/await\s+page\.goto\(([^\n;]+)\);/);
  if (gotoMatch?.[1]) {
    const literalMatch = gotoMatch[1].match(/(["'`])([^"'`]+)\1/);
    if (literalMatch?.[2]?.startsWith("http")) {
      try {
        return new URL(literalMatch[2]).origin;
      } catch {
        return "http://localhost:5173";
      }
    }
  }

  return "http://localhost:5173";
}

function stripQuotes(raw: string): string {
  const trimmed = raw.trim();
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === '"' || first === "'" || first === "`") && first === last) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizeRegexLiteral(raw: string): string {
  const trimmed = raw.trim();
  const regex = trimmed.match(/^\/([^/]+)\/i?$/);
  if (regex?.[1]) return regex[1];
  return stripQuotes(trimmed);
}

function substituteVars(raw: string, variables: Record<string, string>): string {
  const trimmed = raw.trim();
  if (variables[trimmed]) return variables[trimmed];

  const unwrapped = stripQuotes(trimmed);
  const replaced = unwrapped.replace(/\$\{([^}]+)\}/g, (_all, key) => {
    const varName = key.trim();
    return variables[varName] ?? `<${varName}>`;
  });

  if (replaced.includes("WEB_BASE_URL")) {
    return replaced.replace(/WEB_BASE_URL/g, variables.WEB_BASE_URL ?? "http://localhost:5173");
  }

  return replaced;
}

function selectorFromLocatorExpression(
  locatorExpr: string,
  variables: Record<string, string>,
): string | null {
  const text = locatorExpr.trim();

  const byLabel = text.match(/page\.getByLabel\((.+)\)/);
  if (byLabel) return `label=${substituteVars(byLabel[1], variables)}`;

  const byText = text.match(/page\.getByText\((.+)\)/);
  if (byText) return `text=${substituteVars(byText[1], variables)}`;

  const byRole = text.match(/page\.getByRole\((.+)\)/);
  if (byRole) {
    const arg = byRole[1];
    const roleMatch = arg.match(/^\s*(["'`])([^"'`]+)\1\s*(?:,\s*(\{[\s\S]*\}))?\s*$/);
    if (!roleMatch) return null;
    const role = roleMatch[2];
    const options = roleMatch[3] ?? "";
    const nameMatch = options.match(/name\s*:\s*(["'`])([\s\S]*?)\1/);
    if (nameMatch?.[2]) {
      return `role=${role}[name="${nameMatch[2]}"]`;
    }
    return `role=${role}`;
  }

  const locator = text.match(/page\.locator\((.+)\)/);
  if (locator) return substituteVars(locator[1], variables);

  return null;
}

function parseVariableAssignment(line: string, ctx: ParseContext): void {
  const assign = line.match(/^const\s+(\w+)\s*=\s*(.+);$/);
  if (!assign) return;
  const [, name, rawValue] = assign;

  const locator = selectorFromLocatorExpression(rawValue, ctx.variables);
  if (locator) {
    ctx.locatorVars[name] = locator;
    return;
  }

  if (rawValue.includes("Date.now()")) {
    ctx.variables[name] = `generated-${name}`;
    return;
  }

  if (rawValue.includes("new Date()") && rawValue.includes("toISOString")) {
    ctx.variables[name] = "2026-01-01";
    return;
  }

  if (rawValue.includes("WEB_BASE_URL")) {
    ctx.variables[name] = substituteVars(rawValue, ctx.variables);
    return;
  }

  ctx.variables[name] = substituteVars(rawValue, ctx.variables);
}

function parseStep(line: string, ctx: ParseContext): Step | null {
  const goto = line.match(/await\s+page\.goto\((.*)\);/);
  if (goto) {
    return { type: "goto", url: substituteVars(goto[1], ctx.variables) };
  }

  const fillLocator = line.match(/await\s+(page\.[^\n]+)\.fill\((.+)\);/);
  if (fillLocator) {
    const selector = selectorFromLocatorExpression(fillLocator[1], ctx.variables);
    if (!selector) return null;
    return { type: "fill", selector, value: substituteVars(fillLocator[2], ctx.variables) };
  }

  const fillVar = line.match(/await\s+(\w+)\.fill\((.+)\);/);
  if (fillVar && ctx.locatorVars[fillVar[1]]) {
    return {
      type: "fill",
      selector: ctx.locatorVars[fillVar[1]],
      value: substituteVars(fillVar[2], ctx.variables),
    };
  }

  const clickLocator = line.match(/await\s+(page\.[^\n]+)\.click\(\);/);
  if (clickLocator) {
    const selector = selectorFromLocatorExpression(clickLocator[1], ctx.variables);
    if (!selector) return null;
    return { type: "click", selector };
  }

  const clickVar = line.match(/await\s+(\w+)\.click\(\);/);
  if (clickVar && ctx.locatorVars[clickVar[1]]) {
    return { type: "click", selector: ctx.locatorVars[clickVar[1]] };
  }

  const expectVisible = line.match(/await\s+expect\((.+)\)\.toBeVisible\(\);/);
  if (expectVisible) {
    const expr = expectVisible[1].trim();
    const selector = ctx.locatorVars[expr] ?? selectorFromLocatorExpression(expr, ctx.variables);
    if (!selector) return null;
    return { type: "expectVisible", selector };
  }

  const expectText = line.match(/await\s+expect\((.+)\)\.toHaveText\((.+)\);/);
  if (expectText) {
    const selector = ctx.locatorVars[expectText[1]] ?? selectorFromLocatorExpression(expectText[1], ctx.variables);
    if (!selector) return null;
    return { type: "expectText", selector, text: substituteVars(expectText[2], ctx.variables) };
  }

  const waitTimeout = line.match(/await\s+page\.waitForTimeout\((\d+)\);/);
  if (waitTimeout) {
    return { type: "waitForTimeout", ms: Number(waitTimeout[1]) };
  }

  const print = line.match(/console\.log\((.+)\);/);
  if (print) {
    return { type: "print", message: substituteVars(print[1], ctx.variables) };
  }

  return null;
}

function extractFunctionBody(source: string, functionName: string): string[] {
  const start = source.match(new RegExp(`export\\s+async\\s+function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`));
  if (!start || start.index === undefined) return [];

  const openIndex = source.indexOf("{", start.index);
  let depth = 0;
  let endIndex = -1;

  for (let i = openIndex; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex === -1) return [];

  const body = source.slice(openIndex + 1, endIndex);
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"));
}

async function buildHelperBodies(source: string, filePath: string): Promise<Record<string, string[]>> {
  const helpers: Record<string, string[]> = {};
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+(["'])(\.\.?\/[^"']+)\2\s*;/g;
  const matches = [...source.matchAll(importRegex)];

  await Promise.all(
    matches.map(async (match) => {
      const names = match[1].split(",").map((n) => n.trim()).filter(Boolean);
      const importPath = match[3];
      const resolved = resolve(dirname(filePath), `${importPath}.ts`);

      try {
        const helperSource = await readFile(resolved, "utf-8");
        for (const name of names) {
          const body = extractFunctionBody(helperSource, name);
          if (body.length > 0) helpers[name] = body;
        }
      } catch {
        // ignore missing helper files
      }
    }),
  );

  return helpers;
}

function inlineHelpers(lines: string[], helperBodies: Record<string, string[]>): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const call = line.match(/^await\s+(\w+)\(page\);$/);
    if (call && helperBodies[call[1]]) {
      out.push(...helperBodies[call[1]]);
      continue;
    }
    out.push(line);
  }
  return out;
}

function toStatements(lines: string[]): string[] {
  const statements: string[] = [];
  let current = "";

  for (const line of lines) {
    if (!line || line === "{" || line === "}") continue;
    current = current ? `${current} ${line}` : line;

    if (line.endsWith(";") || line.endsWith("{")) {
      statements.push(current.trim());
      current = "";
    }
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

function parseSteps(
  source: string,
  helperBodies: Record<string, string[]>,
  baseURL: string,
): { steps: Step[]; warnings: string[] } {
  const rawLines = source.split(/\r?\n/).map((line) => line.trim());
  const inlined = inlineHelpers(rawLines, helperBodies);
  const lines = toStatements(inlined);

  const ctx: ParseContext = {
    variables: { WEB_BASE_URL: baseURL },
    locatorVars: {},
  };
  const steps: Step[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    if (line.startsWith("const ")) {
      parseVariableAssignment(line, ctx);
      continue;
    }

    if (!line.startsWith("await ") && !line.startsWith("console.log(")) continue;

    if (
      line.includes("request.post(") ||
      line.includes("expect(res.ok())") ||
      line.includes("waitForResponse(") ||
      line.includes("checkValidity(")
    ) {
      continue;
    }

    const step = parseStep(line, ctx);
    if (step) {
      steps.push(step);
    } else {
      warnings.push(`Unsupported line: ${line}`);
    }
  }

  return { steps, warnings };
}

export async function readSpecsFromTestsDir(): Promise<ParsedSpec[]> {
  const testsRoot = await resolveTestsRoot();
  const files = await listSpecFiles(testsRoot);
  const parsed = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(file, "utf-8");
      const helperBodies = await buildHelperBodies(source, file);
      const baseURL = extractBaseUrl(source);
      const { steps, warnings } = parseSteps(source, helperBodies, baseURL);
      const name = extractTestName(source);
      const relativePath = join("tests", relative(testsRoot, file)).split("\\").join("/");
      const id = safeId(relativePath.replace(/^tests\//, "").replace(/\.spec\.(t|j)sx?$/, ""));

      return {
        id: id || safeId(name) || "imported-test",
        name,
        path: relativePath,
        baseURL,
        steps,
        warnings,
      } satisfies ParsedSpec;
    }),
  );

  return parsed.sort((a, b) => a.path.localeCompare(b.path));
}
