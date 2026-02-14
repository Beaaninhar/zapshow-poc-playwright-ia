/// <reference types="node" />

import { defineConfig } from "@playwright/test";

import { fileURLToPath } from "url";
import * as path from "path";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export default defineConfig({
  testDir: path.join(__dirname, "tests"),

  outputDir: path.join(__dirname, "tests", "test-results"),

  reporter: [
    [
      "html",
      {
        outputFolder: path.join(__dirname, "tests", "playwright-report"),
        open: "never",
      },
    ],
    ["list"],
  ],

  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "npm run dev:api",
          url: "http://127.0.0.1:3001/health",
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: "npm run dev:web",
          url: "http://127.0.0.1:5173",
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ],
});
