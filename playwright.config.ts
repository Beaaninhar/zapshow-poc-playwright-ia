/// <reference types="node" />
import { defineConfig, type TraceMode, type ScreenshotMode, type VideoMode } from "@playwright/test";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const parseTrace = (v?: string): TraceMode => {
  switch ((v ?? "").toLowerCase()) {
    case "on":
    case "off":
    case "retain-on-failure":
    case "on-first-retry":
      return v as TraceMode;
    default:
      return FAST ? "off" : "on-first-retry";
  }
};

const parseScreenshot = (v?: string): ScreenshotMode => {
  switch ((v ?? "").toLowerCase()) {
    case "on":
    case "off":
    case "only-on-failure":
      return v as ScreenshotMode;
    default:
      return FAST ? "off" : "only-on-failure";
  }
};

const parseVideo = (v?: string): VideoMode => {
  switch ((v ?? "").toLowerCase()) {
    case "on":
    case "off":
    case "retain-on-failure":
    case "on-first-retry":
      return v as VideoMode;
    default:
      return "on";
  }
};

const envNum = (k: string, d?: number) => {
  const v = process.env[k];
  if (!v) return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const envBool = (k: string, d = false) => {
  const v = process.env[k];
  if (v == null) return d;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
};

const FAST = envBool("E2E_FAST", false);

export default defineConfig({
  testDir: join(__dirname, "tests"),
  outputDir: join(__dirname, "tests", "test-results"),

  fullyParallel: true,
  workers: envNum("E2E_WORKERS", process.env.CI ? 2 : undefined),
  retries: envNum("E2E_RETRIES", process.env.CI ? 2 : 0),

  timeout: envNum("E2E_TIMEOUT_MS", 30_000),
  expect: { timeout: envNum("E2E_EXPECT_TIMEOUT_MS", 5_000) },

  reporter: envBool("E2E_HTML_REPORT", !FAST)
    ? [["html", { outputFolder: join(__dirname, "tests", "playwright-report"), open: "never" }], ["list"]]
    : [["list"]],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",

    // Debug/artifacts controlados por env (bom pra worker)
    trace: parseTrace(process.env.E2E_TRACE),
    screenshot: parseScreenshot(process.env.E2E_SCREENSHOT),
    video: parseVideo(process.env.E2E_VIDEO),

    actionTimeout: envNum("E2E_ACTION_TIMEOUT_MS", 10_000),
    navigationTimeout: envNum("E2E_NAV_TIMEOUT_MS", 20_000),
  },

  // Em plataforma, normalmente o runner NÃO sobe server.
  // Quem orquestra (ou docker-compose) é que garante a URL.
  webServer: undefined,
});
