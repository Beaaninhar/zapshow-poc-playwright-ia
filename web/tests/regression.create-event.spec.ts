import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

const API_BASE = "http://127.0.0.1:3001";

test.beforeEach(async ({ request }) => {
  const res = await request.post(`${API_BASE}/test/reset`);
  expect(res.ok()).toBeTruthy();
});

test("create event and show in list @regression", async ({ page }) => {
  await login(page);

  // Verify we're on the dashboard
  await expect(
    page.getByRole("heading", { name: "Events" }),
  ).toBeVisible();

  const title = `Evento ${Date.now()}`;

  const wait = page.waitForResponse(
    (resp) =>
      resp.url().includes("/events") &&
      resp.request().method() === "POST" &&
      resp.status() === 201,
  );

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill("Test event description");
  await page.getByRole("button", { name: "Create Event" }).click();

  await wait;

  await expect(page.getByText(title)).toBeVisible();
});
