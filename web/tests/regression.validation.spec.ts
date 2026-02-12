import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

const API_BASE = "http://127.0.0.1:3001";

test.beforeEach(async ({ request }) => {
  const res = await request.post(`${API_BASE}/test/reset`);
  expect(res.ok()).toBeTruthy();
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
