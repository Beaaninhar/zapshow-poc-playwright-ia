import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type { RunRequest, Step } from "./types";

function safeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stepToCode(step: Step): string[] {
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
        `await page.screenshot({ path: ${JSON.stringify(join("tests", "artifacts", name))}, fullPage: true });`,
      ];
    }
  }
}

export async function writeGeneratedSpec(
  testId: string,
  req: RunRequest,
): Promise<{ path: string }> {
  const fileBase = safeName(testId || req.test.name || "generated-test") || "generated-test";
  const relativeDir = join("tests", "generated");
  const relativePath = join(relativeDir, `${fileBase}.generated.spec.ts`);
  const absolutePath = join(process.cwd(), relativePath);

  const bodyLines = req.test.steps.flatMap((step) => stepToCode(step).map((line) => `  ${line}`));
  const source = [
    'import { test, expect } from "@playwright/test";',
    'import { API_BASE_URL } from "../constants";',
    "",
    "test.beforeEach(async ({ request }) => {",
    "  const res = await request.post(`${API_BASE_URL}/test/reset`);",
    "  expect(res.ok()).toBeTruthy();",
    "});",
    "",
    `test(${JSON.stringify(`${req.test.name} @generated`)}, async ({ page }) => {`,
    `  const baseURL = ${JSON.stringify(req.baseURL)};`,
    ...bodyLines,
    "});",
    "",
  ].join("\n");

  await mkdir(join(process.cwd(), relativeDir), { recursive: true });
  await writeFile(absolutePath, source, "utf-8");

  return { path: relativePath.split("\\").join("/") };
}
