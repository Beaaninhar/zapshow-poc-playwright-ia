import { expect, Page } from "@playwright/test";
import { WEB_BASE_URL } from "../constants";

export async function login(page: Page) {
  await page.goto(`${WEB_BASE_URL}/login`);

  // Login form
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await page.getByLabel(/email/i).fill("qa@empresa.com");

  const password = page.locator('input[type="password"]').first();
  await expect(password).toBeVisible();
  await password.fill("123456");

  // Clica no submit sem depender do texto do botão (MUI-friendly)
  const submit = page.locator('button[type="submit"]').first();
  await expect(submit).toBeVisible();
  await submit.click();

  // Pós-login: h1 = "Events" e aparece botão "Create Event"
  await expect(
    page.getByRole("heading", { level: 1, name: "Events" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create Event" }),
  ).toBeVisible();
}
