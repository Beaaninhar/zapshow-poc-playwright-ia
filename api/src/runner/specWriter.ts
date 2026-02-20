import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type { RunRequest, Step } from "./types";


function resolveSpecsRoot(): string {
  return join(process.cwd(), ".tmp", "no-code-tests", "specs");
}

function safeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stepToCode(step: Step, index: number): string[] {
  switch (step.type) {
    case "goto":
      return [`await page.goto(new URL(${JSON.stringify(step.url)}, baseURL).toString());`];
    case "fill":
      return [`await page.fill(${JSON.stringify(step.selector)}, ${JSON.stringify(step.value)});`];
    case "click":
      return [`await page.click(${JSON.stringify(step.selector)});`];
    case "expectText":
      return [
        `await expect(page.locator(${JSON.stringify(step.selector)})).toHaveText(${JSON.stringify(step.text)});`,
      ];
    case "expectVisible":
      return [`await expect(page.locator(${JSON.stringify(step.selector)})).toBeVisible();`];
    case "waitForTimeout":
      return [`await page.waitForTimeout(${step.ms});`];
    case "waitForSelector":
      return [`await page.waitForSelector(${JSON.stringify(step.selector)});`];
    case "hover":
      return [`await page.hover(${JSON.stringify(step.selector)});`];
    case "print":
      return [`console.log(${JSON.stringify(step.message)});`];
    case "screenshot": {
      const name = step.name?.trim() ? `${safeName(step.name)}.png` : "step.png";
      return [
        `await page.screenshot({ path: ${JSON.stringify(join(".tmp", "no-code-tests", "artifacts", name))}, fullPage: true });`,
      ];
    }
    case "apiRequest": {
      const responseVar = `apiResponse${index + 1}`;
      const textVar = `apiResponseText${index + 1}`;
      const lines = [
        `const ${responseVar} = await fetch((/^https?:\\/\\//i.test(${JSON.stringify(step.url)}) ? ${JSON.stringify(step.url)} : new URL(${JSON.stringify(step.url)}, baseURL).toString()), ${JSON.stringify({
          method: step.method,
          headers: step.headers,
          body: step.body,
        })});`,
      ];

      if (typeof step.expectedStatus === "number") {
        lines.push(
          `if (${responseVar}.status !== ${step.expectedStatus}) throw new Error(\`Expected status ${step.expectedStatus}, received \${${responseVar}.status}\`);`,
        );
      }

      if (step.expectedBodyContains) {
        lines.push(`const ${textVar} = await ${responseVar}.text();`);
        lines.push(
          `if (!${textVar}.includes(${JSON.stringify(step.expectedBodyContains)})) throw new Error("Expected response body content not found");`,
        );
      }

      return lines;
    }
  }
}

export async function writeGeneratedSpec(
  testId: string,
  req: RunRequest,
): Promise<{ path: string }> {
  const fileBase = safeName(testId || req.test.name || "generated-test") || "generated-test";
  const specsRoot = resolveSpecsRoot();
  const relativeDir = "generated";
  const relativePath = join(".tmp", "no-code-tests", "specs", relativeDir, `${fileBase}.generated.spec.ts`);
  const absolutePath = join(specsRoot, relativeDir, `${fileBase}.generated.spec.ts`);

  const bodyLines = req.test.steps.flatMap((step, index) =>
    stepToCode(step, index).map((line) => `  ${line}`),
  );
  const source = [
    'import { test, expect } from "@playwright/test";',
    "",
    `test(${JSON.stringify(`${req.test.name} @generated`)}, async ({ page }) => {`,
    `  const baseURL = ${JSON.stringify(req.baseURL)};`,
    ...bodyLines,
    "});",
    "",
  ].join("\n");

  await mkdir(join(specsRoot, relativeDir), { recursive: true });
  await writeFile(absolutePath, source, "utf-8");

  return { path: relativePath.split("\\").join("/") };
}
