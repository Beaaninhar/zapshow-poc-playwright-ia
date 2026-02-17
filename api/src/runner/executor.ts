import { chromium, expect } from "@playwright/test";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import type { Action } from "./compiler";
import type { RunRequest, StepResult } from "./types";

export type RunResult = {
  status: "passed" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: {
    stepsTotal: number;
    stepsCompleted: number;
  };
  stepResults?: StepResult[];
  failedStepIndex?: number;
  failedStep?: Action;
  artifacts?: {
    screenshotPaths?: string[];
    videoPath?: string;
    tracePath?: string;
  };
  logs?: string[];
  error?: { message: string };
};

type ArtifactOptions = RunRequest["artifacts"];

function safeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|\s]+/g, "-").toLowerCase();
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
    if (message) {
      try {
        return JSON.stringify(message);
      } catch {
        return String(message);
      }
    }
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export async function execute(
  actions: Action[],
  baseURL: string,
  artifacts?: ArtifactOptions,
): Promise<RunResult> {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const logs: string[] = [];
  const screenshotPaths: string[] = [];
  let tracePath: string | undefined;
  let videoPath: string | undefined;
  let stepsCompleted = 0;
  let failedStepIndex: number | undefined;
  let failedStep: Action | undefined;
  let status: "passed" | "failed" = "passed";
  let errorMessageValue: string | undefined;
  const stepResults: StepResult[] = [];

  const runId = `${Date.now()}`;
  const outputDir = join(process.cwd(), "tests", "test-results", "local-runs", runId);
  const screenshotDir = join(outputDir, "screenshots");
  const videoDir = join(outputDir, "video");
  const traceMode = artifacts?.trace ?? "off";
  const videoMode = artifacts?.video ?? "off";
  const screenshotMode = artifacts?.screenshot ?? "only-on-failure";

  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext(
    videoMode !== "off" ? { recordVideo: { dir: videoDir } } : undefined,
  );
  const page = await context.newPage();
  const pageVideo = page.video();

  if (traceMode !== "off") {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  }

  try {
    for (let i = 0; i < actions.length; i += 1) {
      const a = actions[i];
      const stepStarted = Date.now();
      try {
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
          case "expectVisible":
            await expect(page.locator(a.selector)).toBeVisible();
            break;
          case "waitForTimeout":
            await page.waitForTimeout(a.ms);
            break;
          case "waitForSelector":
            await page.waitForSelector(a.selector);
            break;
          case "hover":
            await page.hover(a.selector);
            break;
          case "print":
            logs.push(a.message);
            break;
          case "screenshot": {
            await mkdir(screenshotDir, { recursive: true });
            const name = safeFileName(a.name || `step-${stepsCompleted + 1}`);
            const path = join(screenshotDir, `${name}.png`);
            await page.screenshot({ path, fullPage: true });
            screenshotPaths.push(path);
            break;
          }
        }
        stepResults.push({
          index: i,
          step: a,
          status: "passed",
          durationMs: Date.now() - stepStarted,
        });
        stepsCompleted += 1;
      } catch (err: unknown) {
        status = "failed";
        errorMessageValue = errorMessage(err);
        failedStepIndex = i;
        failedStep = actions[i];
        stepResults.push({
          index: i,
          step: a,
          status: "failed",
          durationMs: Date.now() - stepStarted,
          errorMessage: errorMessageValue,
        });

        if (screenshotMode === "only-on-failure") {
          await mkdir(screenshotDir, { recursive: true });
          const path = join(screenshotDir, "failure.png");
          await page.screenshot({ path, fullPage: true }).catch(() => undefined);
          screenshotPaths.push(path);
        }
        break;
      }
    }
  } finally {
    if (traceMode !== "off") {
      const shouldKeepTrace =
        traceMode === "on" ||
        (traceMode === "retain-on-failure" && status === "failed") ||
        (traceMode === "on-first-retry" && status === "failed");
      if (shouldKeepTrace) {
        tracePath = join(outputDir, "trace.zip");
        await context.tracing.stop({ path: tracePath });
      } else {
        await context.tracing.stop();
      }
    }

    if (screenshotMode === "on") {
      await mkdir(screenshotDir, { recursive: true });
      const path = join(screenshotDir, "final.png");
      await page.screenshot({ path, fullPage: true }).catch(() => undefined);
      screenshotPaths.push(path);
    }

    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);

    if (pageVideo) {
      videoPath = await pageVideo.path().catch(() => undefined);
      const shouldKeepVideo =
        videoMode === "on" ||
        (videoMode === "retain-on-failure" && status === "failed") ||
        (videoMode === "on-first-retry" && status === "failed");
      if (!shouldKeepVideo && videoPath) {
        await rm(videoPath, { force: true });
        videoPath = undefined;
      }
    }
  }

  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - startedMs;

  return {
    status,
    startedAt,
    finishedAt,
    durationMs,
    summary: { stepsTotal: actions.length, stepsCompleted },
    stepResults: stepResults.length ? stepResults : undefined,
    failedStepIndex,
    failedStep,
    artifacts: {
      screenshotPaths: screenshotPaths.length ? screenshotPaths : undefined,
      tracePath,
      videoPath,
    },
    logs: logs.length ? logs : undefined,
    error: errorMessageValue ? { message: errorMessageValue } : undefined,
  };
}
