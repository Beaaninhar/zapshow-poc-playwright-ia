import { expect, Page } from "@playwright/test";
import { WEB_BASE_URL } from "../constants";

export async function login(page: Page) {
  await page.goto(`${WEB_BASE_URL}/login`);

  await expect(page.getByLabel(/email/i)).toBeVisible();
  await page.getByLabel(/email/i).fill("qa_ana@empresa.com");

  const password = page.getByLabel(/password/i);
  await expect(password).toBeVisible();
  await password.fill("123456");

  await page.getByRole("button", { name: "Login" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Events" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create Event" }),
  ).toBeVisible();
}
