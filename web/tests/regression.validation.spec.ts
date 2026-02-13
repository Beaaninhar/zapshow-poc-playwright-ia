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
  await page.locator('form[aria-label="create-event-form"] button[type="submit"]').click();
  // Expect toast for missing title (toast has role=alert)
  await expect(page.locator('div[role="alert"] >> text=Preencha o título')).toBeVisible({ timeout: 8000 });
});

test("validation: create event fields required @regression", async ({ page }) => {
  await loginAndGoToCreateEvent(page);

  // both empty
  await page.locator('form[aria-label="create-event-form"] button[type="submit"]').click();
  await expect(page.locator('div[role="alert"] >> text=Preencha título e descrição')).toBeVisible({ timeout: 8000 });

  // title only
  await page.getByLabel("Title").fill("Evento teste");
  await page.locator('form[aria-label="create-event-form"] button[type="submit"]').click();
  await expect(page.locator('div[role="alert"] >> text=Preencha a descrição')).toBeVisible({ timeout: 8000 });
});

test("validation: login fields required @regression", async ({ page }) => {
  await page.goto("http://localhost:5173/");

  // both empty
  await page.locator('button[type="submit"]').first().click();
  await expect(page.locator('[data-testid="toast-login-empty"]')).toBeVisible({ timeout: 8000 });

  // email only
  await page.getByLabel("Email").fill("qa@empresa.com");
  await page.locator('button[type="submit"]').first().click();
  await expect(page.locator('[data-testid="toast-login-password"]')).toBeVisible({ timeout: 8000 });

  // password only
  await page.getByLabel("Email").fill("");
  await page.locator('input[type="password"]').first().fill("123456");
  await page.locator('button[type="submit"]').first().click();
  await expect(page.locator('[data-testid="toast-login-email"]')).toBeVisible({ timeout: 8000 });
});

test("validation: invalid price @regression", async ({ page }) => {
  await loginAndGoToCreateEvent(page);

  await page.getByLabel("Title").fill("Evento teste");
  await page.getByLabel("Description").fill("Test");
  await page.getByRole("button", { name: "Create Event" }).click();

  // Note: Front-end currently doesn't have price field
  // This test serves as a placeholder for future validation implementation
});
