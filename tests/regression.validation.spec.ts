import { test, expect, Page } from "@playwright/test";
import { login } from "./helpers/auth";
import { API_BASE_URL, WEB_BASE_URL } from "./constants";

test.beforeEach(async ({ request }) => {
  const res = await request.post(`${API_BASE_URL}/test/reset`);
  expect(res.ok()).toBeTruthy();
});

async function loginAndGoToCreateEvent(page: Page) {
  await login(page);

  // Verify dashboard loaded
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();
}

test("validation: title required @regression", async ({ page }) => {
  await loginAndGoToCreateEvent(page);

  await page.getByRole("button", { name: "Create Event" }).click();
  // deixa título vazio
  await page.getByLabel("Description").fill("Test");
  await page.getByRole("button", { name: "Save" }).click();
  // Expect toast for missing title (toast has role=alert)
  await expect(page.getByText("Title is required")).toBeVisible({
    timeout: 1000,
  });
});

test("validation: create event fields required @regression", async ({
  page,
}) => {
  await loginAndGoToCreateEvent(page);

  // both empty
  await page.getByRole("button", { name: "Create Event" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Title is required")).toBeVisible({
    timeout: 1000,
  });

  // title only
  await page.getByLabel("Title").fill("Evento teste");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Date is required")).toBeVisible({
    timeout: 1000,
  });
});

test("validation: login fields required @regression", async ({ page }) => {
  await page.goto(`${WEB_BASE_URL}/login`);

  // invalid credentials
  await page.getByLabel("Email").fill("invalid@email.com");
  await page.getByLabel("Password").fill("wrongpassword");
  await page.locator('button[type="submit"]').first().click();

  await expect(page.getByText("Invalid credentials")).toBeVisible({
    timeout: 1000,
  });
});

test("validation: invalid price @regression", async ({ page }) => {
  await loginAndGoToCreateEvent(page);

  await page.getByRole("button", { name: "Create Event" }).click();
  await page.getByLabel("Title").fill("Evento teste");
  await page.getByLabel("Description").fill("Test");
  await page.getByRole("button", { name: "Save" }).click();

  // Note: Front-end currently doesn't have price field
  // This test serves as a placeholder for future validation implementation
});

test("validation: date required @regression", async ({ page }) => {
  await loginAndGoToCreateEvent(page);

  await page.getByRole("button", { name: "Create Event" }).click();
  await page.getByLabel("Title").fill("Evento teste");
  await page.getByLabel("Description").fill("Test");
  await page.getByRole("button", { name: "Save" }).click();

  // Expect toast for missing date (toast has role=alert)
  await expect(page.getByText("Date is required")).toBeVisible({
    timeout: 1000,
  });
});
