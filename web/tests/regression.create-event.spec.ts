import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.beforeEach(async () => {
  const apiBase = process.env.E2E_API_URL || "http://localhost:3001";
  await fetch(`${apiBase}/test/reset`, { method: "POST" });
});

test("create event and show in list @regression", async ({ page }) => {
  await login(page);

  // go to create event
  await page.getByRole("button", { name: "Criar evento" }).click();
  await expect(
    page.getByRole("heading", { name: "Criar evento" }),
  ).toBeVisible();

  const title = `Evento ${Date.now()}`;

  const wait = page.waitForResponse(
    (resp) =>
      resp.url().includes("/events") &&
      resp.request().method() === "POST" &&
      resp.status() === 201,
  );

  await page.getByLabel("Título do evento").fill(title);
  await page.getByLabel("Data").fill("2026-02-15");
  await page.getByLabel("Preço").fill("50");
  await page.getByRole("button", { name: "Salvar" }).click();

  await wait;

  await expect(page.getByText("Evento criado com sucesso")).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();
});
