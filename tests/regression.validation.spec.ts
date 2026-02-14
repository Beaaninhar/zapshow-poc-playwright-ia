import { test, expect, Page } from "@playwright/test";
import { login } from "./helpers/auth";
import { API_BASE_URL, WEB_BASE_URL } from "./constants";

test.beforeEach(async ({ request }) => {
  const res = await request.post(`${API_BASE_URL}/test/reset`);
  expect(res.ok()).toBeTruthy();
});

async function loginAndGoToCreateEvent(page: Page) {
  await login(page);
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();
  await page.getByRole("button", { name: "Create Event" }).click();
  await expect(page.getByRole("heading", { name: "Create Event" })).toBeVisible();
}

test("validation: title required @regression", async ({ page }) => {
  await loginAndGoToCreateEvent(page);

  await page.getByLabel("Description").fill("Test");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Title is required")).toBeVisible();
});

test("validation: create event fields required @regression", async ({
  page,
}) => {
  await loginAndGoToCreateEvent(page);

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Title is required")).toBeVisible();

  await page.getByLabel("Title").fill("Evento teste");
  await page.getByLabel("Date").fill("");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Date is required")).toBeVisible();
});

test("validation: login fields required @regression", async ({ page }) => {
  await page.goto(`${WEB_BASE_URL}/login`);

  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText("Invalid email")).toBeVisible();
  await expect(
    page.getByText("Password must have at least 6 characters"),
  ).toBeVisible();
});

test("validation: invalid price @regression", async ({ page }) => {
  await loginAndGoToCreateEvent(page);

  await page.getByLabel("Title").fill("Evento teste");
  await page.getByLabel("Description").fill("Test");
  await page.getByLabel("Price").fill("0");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Price must be greater than 0")).toBeVisible();
});

test("validation: date required @regression", async ({ page }) => {
  await loginAndGoToCreateEvent(page);

  await page.getByLabel("Title").fill("Evento teste");
  await page.getByLabel("Description").fill("Test");
  await page.getByLabel("Date").fill("");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Date is required")).toBeVisible();
});
