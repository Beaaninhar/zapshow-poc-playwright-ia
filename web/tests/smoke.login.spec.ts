import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.beforeEach(async () => {
  const apiBase = process.env.E2E_API_URL || "http://localhost:3001";
  await fetch(`${apiBase}/test/reset`, { method: "POST" });
});

test("login works @smoke", async ({ page }) => {
  await login(page);
});
