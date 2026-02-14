import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { API_BASE_URL } from "./constants";

test.beforeEach(async ({ request }) => {
  const res = await request.post(`${API_BASE_URL}/test/reset`);
  expect(res.ok()).toBeTruthy();
});

test("login works @smoke", async ({ page }) => {
  await login(page);
});
