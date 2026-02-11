import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.beforeEach(async () => {
  const apiBase = process.env.E2E_API_URL || "http://localhost:3001";
  await fetch(`${apiBase}/test/reset`, { method: "POST" });
});

async function loginAndGoToCreateEvent(page: any) {
  await login(page);

  await page.getByRole("button", { name: "Criar evento" }).click();
  await expect(
    page.getByRole("heading", { name: "Criar evento" }),
  ).toBeVisible();
}

test("validation: title required @regression", async ({ page }) => {
  await loginAndGoToCreateEvent(page);

  // deixa título vazio
  await page.getByLabel("Preço").fill("50");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page.getByText("Título é obrigatório")).toBeVisible();
});

test("validation: invalid price @regression", async ({ page }) => {
  await loginAndGoToCreateEvent(page);

  await page.getByLabel("Título do evento").fill("Evento teste");
  await page.getByLabel("Preço").fill("-1");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page.getByText("Preço inválido")).toBeVisible();
});
