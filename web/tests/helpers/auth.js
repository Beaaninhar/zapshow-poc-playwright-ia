import { expect } from "@playwright/test";
export async function login(page) {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
    await page.getByLabel("Email").fill("qa@empresa.com");
    await page.locator('input[type="password"]').fill("123456");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}
