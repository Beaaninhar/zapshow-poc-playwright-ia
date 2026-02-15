import { chromium, expect } from "@playwright/test";
import type { Action } from "./compiler";

export type RunResult = {
  status: "passed" | "failed";
  startedAt: string;
  finishedAt: string;
  error?: { message: string };
};

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export async function execute(actions: Action[], baseURL: string): Promise<RunResult> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    for (const a of actions) {
      switch (a.type) {
        case "goto":
          await page.goto(new URL(a.url, baseURL).toString());
          break;
        case "fill":
          await page.fill(a.selector, a.value);
          break;
        case "click":
          await page.click(a.selector);
          break;
        case "expectText":
          await expect(page.locator(a.selector)).toHaveText(a.text);
          break;
      }
    }

    await browser.close();
    return { status: "passed", startedAt, finishedAt: new Date().toISOString() };
  } catch (err: unknown) {
    await browser.close();
    return {
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: { message: errorMessage(err) },
    };
  }
}
