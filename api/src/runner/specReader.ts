import { readFile, readdir, stat } from "fs/promises";
import { join, relative } from "path";
import type { Step } from "./types";

export type ParsedSpec = {
  id: string;
  name: string;
  path: string;
  baseURL: string;
  steps: Step[];
  warnings: string[];
};

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
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
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
  const baseUrlMatch = source.match(/const\s+baseURL\s*=\s*(["'`])([\s\S]*?)\1\s*;/);
  if (baseUrlMatch?.[2]) return baseUrlMatch[2];

  const gotoMatch = source.match(/await\s+page\.goto\(([^\n;]+)\);/);
  if (gotoMatch?.[1]) {
    const literalMatch = gotoMatch[1].match(/(["'`])([^"'`]+)\1/);
    if (literalMatch?.[2]?.startsWith("http")) {
      try {
        return new URL(literalMatch[2]).origin;
      } catch {
        return "http://localhost:4173";
      }
    }
  }

  return "http://localhost:4173";
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

function parseStep(line: string): Step | null {
  const goto = line.match(/await\s+page\.goto\((.*)\);/);
  if (goto) {
    const newUrl = goto[1].match(/new\s+URL\(([^,]+),\s*baseURL\)/);
    if (newUrl) {
      return { type: "goto", url: stripQuotes(newUrl[1]) };
    }
    return { type: "goto", url: stripQuotes(goto[1]) };
  }

  const fill = line.match(/await\s+page\.fill\(([^,]+),\s*(.+)\);/);
  if (fill) {
    return { type: "fill", selector: stripQuotes(fill[1]), value: stripQuotes(fill[2]) };
  }

  const click = line.match(/await\s+page\.click\((.+)\);/);
  if (click) {
    return { type: "click", selector: stripQuotes(click[1]) };
  }

  const expectText = line.match(/await\s+expect\(page\.locator\(([^)]+)\)\)\.toHaveText\((.+)\);/);
  if (expectText) {
    return { type: "expectText", selector: stripQuotes(expectText[1]), text: stripQuotes(expectText[2]) };
  }

  const expectVisible = line.match(/await\s+expect\(page\.locator\(([^)]+)\)\)\.toBeVisible\(\);/);
  if (expectVisible) {
    return { type: "expectVisible", selector: stripQuotes(expectVisible[1]) };
  }

  const waitTimeout = line.match(/await\s+page\.waitForTimeout\((\d+)\);/);
  if (waitTimeout) {
    return { type: "waitForTimeout", ms: Number(waitTimeout[1]) };
  }

  const waitSelector = line.match(/await\s+page\.waitForSelector\((.+)\);/);
  if (waitSelector) {
    return { type: "waitForSelector", selector: stripQuotes(waitSelector[1]) };
  }

  const hover = line.match(/await\s+page\.hover\((.+)\);/);
  if (hover) {
    return { type: "hover", selector: stripQuotes(hover[1]) };
  }

  const print = line.match(/console\.log\((.+)\);/);
  if (print) {
    return { type: "print", message: stripQuotes(print[1]) };
  }

  const screenshot = line.match(/await\s+page\.screenshot\(\{[^}]*path:\s*([^,}]+)[^}]*\}\);/);
  if (screenshot) {
    const pathArg = screenshot[1];
    const filename = stripQuotes(pathArg).split(/[\\/]/).pop()?.replace(/\.png$/, "");
    return { type: "screenshot", name: filename || undefined };
  }

  return null;
}

function parseSteps(source: string): { steps: Step[]; warnings: string[] } {
  const lines = source.split(/\r?\n/);
  const steps: Step[] = [];
  const warnings: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("await ") && !trimmed.startsWith("console.log(")) continue;

    if (trimmed.includes("request.post(") || trimmed.includes("expect(res.ok())")) continue;

    const step = parseStep(trimmed);
    if (step) {
      steps.push(step);
    } else {
      warnings.push(`Unsupported line: ${trimmed}`);
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
      const { steps, warnings } = parseSteps(source);
      const name = extractTestName(source);
      const relativeInsideTests = relative(testsRoot, file).split("\\").join("/");
      const relativePath = `tests/${relativeInsideTests}`;
      const id = safeId(relativeInsideTests.replace(/\.spec\.(t|j)sx?$/, ""));

      return {
        id: id || safeId(name) || "imported-test",
        name,
        path: relativePath,
        baseURL: extractBaseUrl(source),
        steps,
        warnings,
      } satisfies ParsedSpec;
    }),
  );

  return parsed.sort((a, b) => a.path.localeCompare(b.path));
}

async function resolveTestsRoot(): Promise<string> {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "tests"),
    join(cwd, "..", "tests"),
  ];

  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isDirectory()) {
        return candidate;
      }
    } catch {
      // try next candidate
    }
  }

  return candidates[0];
}
