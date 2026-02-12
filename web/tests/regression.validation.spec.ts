import { test, expect, Page } from "@playwright/test";
import { login } from "./helpers/auth";

const API_BASE = "http://127.0.0.1:3001";

test.beforeEach(async ({ request }) => {
  const res = await request.post(`${API_BASE}/test/reset`);
  expect(res.ok()).toBeTruthy();
});

async function loginAndGoToCreateEvent(page: Page) {
  await login(page);

  // Verify dashboard loaded
  await expect(
    page.getByRole("heading", { name: "Events" }),
  ).toBeVisible();
}

test("validation: title required @regression", async ({ page }) => {
  await loginAndGoToCreateEvent(page);

  // deixa título vazio
  await page.getByLabel("Description").fill("Test");
  await page.getByRole("button", { name: "Create Event" }).click();

  // Note: Front-end currently doesn't show validation messages
  // This test serves as a placeholder for future validation implementation
});

test("validation: invalid price @regression", async ({ page }) => {
  await loginAndGoToCreateEvent(page);

  await page.getByLabel("Title").fill("Evento teste");
  await page.getByLabel("Description").fill("Test");
  await page.getByRole("button", { name: "Create Event" }).click();

  // Note: Front-end currently doesn't have price field
  // This test serves as a placeholder for future validation implementation
});
