import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { API_BASE_URL } from "./constants";

test.beforeEach(async ({ request }) => {
  const res = await request.post(`${API_BASE_URL}/test/reset`);
  expect(res.ok()).toBeTruthy();
});

test("create event and show in list @regression", async ({ page }) => {
  await login(page);

  // Verify we're on the dashboard
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();

  const title = `Evento ${Date.now()}`;

  const dateISO = new Date().toISOString().split("T")[0];

  const wait = page.waitForResponse(
    (resp) =>
      resp.url().includes("/events") &&
      resp.request().method() === "POST" &&
      resp.status() === 201,
  );

  await page.getByRole("button", { name: "Create Event" }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByRole("textbox", { name: "Date" }).fill(dateISO);
  await page
    .getByRole("textbox", { name: "Description" })
    .fill("Test event description");
  await page.getByRole("button", { name: "Save" }).click();

  await wait;

  await expect(page.getByText(title)).toBeVisible();
});
