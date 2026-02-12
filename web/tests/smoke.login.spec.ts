import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

const API_BASE = "http://127.0.0.1:3001";
test.beforeEach(async ({ request }) => {
  const res = await request.post(`${API_BASE}/test/reset`);
  expect(res.ok()).toBeTruthy();
});

test("login works @smoke", async ({ page }) => {
  await login(page);
});
