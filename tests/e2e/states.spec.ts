import { test, expect, item, openPage } from "./fixtures";

test("empty inventory has an actionable empty state", async ({ page, api }) => {
  api.empty = true;
  await openPage(page, "/items");
  await expect(page.getByText("Nenhum item cadastrado")).toBeVisible();
  await expect(page.getByRole("button", { name: /Adicionar Primeiro Item/ })).toBeVisible();
});

test("inventory failure is distinguished from an empty inventory", async ({ page, api }) => {
  api.failedPaths.add("/api/items");
  await openPage(page, "/items");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: /Tentar novamente/i })).toBeVisible();
  await expect(page.getByText("Nenhum item cadastrado")).toHaveCount(0);
  api.failedPaths.delete("/api/items");
  await page.getByRole("button", { name: /Tentar novamente/i }).click();
  await expect(page.getByTestId(`item-row-${item.id}`)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("mobile inventory exposes code, category and unit", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openPage(page, "/items");
  const row = page.getByTestId(`item-row-${item.id}`);
  await expect(row.getByText(item.internalCode, { exact: true })).toBeVisible();
  await expect(row.getByText(item.category.name, { exact: true })).toBeVisible();
  await expect(row.getByTitle("Editar unidade", { exact: true })).toBeVisible();
});

test("add item dialog keyboard cancellation does not mutate stock", async ({ page, api }) => {
  await openPage(page, "/items");
  await page.getByTestId("button-add").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByTestId("input-item-name").fill("Não salvar");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(api.mutations.filter((m) => m.path === "/api/items")).toHaveLength(0);
});
