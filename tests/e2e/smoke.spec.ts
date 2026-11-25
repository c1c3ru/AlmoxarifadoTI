import { test, expect, item, openPage } from "./fixtures";

test.describe("signed-out session", () => {
test.use({ signedIn: false });
test("login and logout preserve the auth request contract", async ({ page, api }) => {
  await page.goto("/login");
  await page.getByTestId("input-username").fill("admin-teste");
  await page.getByTestId("input-password").fill("Synthetic@123");
  await page.getByTestId("button-login").click();
  await expect(page.getByTestId("page-title")).toHaveText("Dashboard");
  expect(api.mutations.filter((m) => m.path === "/api/auth/login")).toEqual([
    { method: "POST", path: "/api/auth/login", body: { username: "admin-teste", password: "Synthetic@123" } },
  ]);
  await page.getByTestId("button-logout").click();
  await expect(page.getByTestId("button-login")).toBeVisible();
  await expect.poll(() => api.mutations.filter((m) => m.path === "/api/auth/logout").length).toBe(1);
});
});

test("inline stock creates one movement and unit creates one update", async ({ page, api }) => {
  await openPage(page, "/items");
  const row = page.getByTestId(`item-row-${item.id}`);
  const stock = row.getByTitle("Editar quantidade (Gera Movimentação)");
  await stock.fill("13");
  await stock.press("Tab");
  await expect.poll(() => api.items[0].currentStock).toBe(13);
  const movements = api.mutations.filter((m) => m.path === "/api/movements");
  expect(movements).toHaveLength(1);
  expect(movements[0].body).toMatchObject({ itemId: item.id, type: "entrada", quantity: 3, observation: "Ajuste de Balanço/Inventário" });
  await row.getByTitle("Editar unidade", { exact: true }).fill("cx");
  await row.getByTitle("Editar unidade", { exact: true }).press("Tab");
  await expect.poll(() => api.items[0].unit).toBe("cx");
  expect(api.mutations.filter((m) => m.method === "PUT")).toEqual([
    { method: "PUT", path: `/api/items/${item.id}`, body: { unit: "cx" } },
  ]);
});

test("selection survives viewport changes without stock mutations", async ({ page, api }) => {
  await openPage(page, "/items");
  const selected = page.getByTestId(`item-row-${item.id}`).getByRole("checkbox");
  await selected.check();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(selected).toBeChecked();
  await expect(page.getByTestId("button-thermal-print")).toContainText("1");
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(selected).toBeChecked();
  expect(api.mutations.filter((m) => ["/api/items", "/api/movements"].includes(m.path))).toEqual([]);
});

for (const type of ["entrada", "saida"] as const) {
  test(`${type} submits exactly one movement with the selected item`, async ({ page, api }) => {
    await openPage(page, "/items");
    await page.getByTestId(`button-${type}-${item.id}`).click();
    await page.getByTestId("input-movement-quantity").fill("2");
    if (type === "saida") await page.getByTestId("input-movement-destination").fill("Laboratório de teste");
    await page.getByTestId("button-confirm-movement").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect.poll(() => api.items[0].currentStock).toBe(type === "entrada" ? 12 : 8);
    const mutations = api.mutations.filter((m) => m.path === "/api/movements");
    expect(mutations).toHaveLength(1);
    expect(mutations[0].body).toMatchObject({ itemId: item.id, quantity: 2, type });
  });
}

test("edit, QR, delete and export retain their callbacks", async ({ page, api }) => {
  await openPage(page, "/items");
  await page.getByTestId(`button-edit-${item.id}`).click();
  await page.getByTestId("input-item-name").fill("Teclado revisado");
  await page.getByTestId("button-save-item").click();
  await expect(page.getByTestId(`item-name-${item.id}`)).toHaveText("Teclado revisado");
  await page.getByTestId(`button-qr-modal-${item.id}`).click();
  await expect(page.getByRole("dialog")).toContainText(item.internalCode);
  await page.getByRole("dialog").getByRole("button", { name: /Close|Fechar/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const format of ["csv", "xlsx"]) {
    const [downloaded] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId(`button-export-${format}`).filter({ visible: true }).click(),
    ]);
    expect(downloaded.suggestedFilename()).toMatch(new RegExp(`\\.${format}$`));
  }
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId(`button-delete-${item.id}`).click();
  await expect(page.getByTestId(`item-row-${item.id}`)).toHaveCount(0);
  expect(api.mutations.filter((m) => m.method === "DELETE")).toHaveLength(1);
});

test("search filters preserve the matching item and empty result", async ({ page }) => {
  await openPage(page, "/search");
  await page.getByTestId("input-search").fill("Teclado");
  await expect(page.getByTestId(`search-item-${item.id}`)).toBeVisible();
  await page.getByTestId("input-search").fill("não existe");
  await expect(page.getByTestId(`search-item-${item.id}`)).toHaveCount(0);
});

test("create form validates required data and submits once", async ({ page, api }) => {
  await openPage(page, "/items");
  await page.getByTestId("button-add").click();
  await page.getByTestId("button-save-item").click();
  expect(api.mutations.filter((m) => m.path === "/api/items")).toHaveLength(0);
  await page.getByTestId("input-item-name").fill("Mouse sintético");
  await page.getByTestId("select-category").click();
  await page.getByRole("option", { name: "Periféricos" }).click();
  await page.getByTestId("input-current-stock").fill("5");
  await page.getByTestId("input-min-stock").fill("1");
  await page.getByTestId("button-save-item").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(api.mutations.filter((m) => m.path === "/api/items")).toHaveLength(1);
  await expect(page.getByTestId("item-name-44444444-4444-4444-8444-444444444444")).toHaveText("Mouse sintético");
});

test("CSV import preserves category and data in one mutation", async ({ page, api }) => {
  await openPage(page, "/items");
  await page.getByTestId("button-import-csv").filter({ visible: true }).click();
  await page.getByTestId("select-import-category").click();
  await page.getByRole("option", { name: "Periféricos" }).click();
  const csvData = "nome,quantidade,estoque_minimo,localizacao\nMouse CSV,5,1,Sala de teste";
  await page.getByTestId("input-csv-file").setInputFiles({ name: "fixture.csv", mimeType: "text/csv", buffer: Buffer.from(csvData) });
  await expect(page.getByTestId("textarea-csv-data")).toHaveValue(csvData);
  await page.getByTestId("button-submit-import").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(api.mutations.filter((m) => m.path === "/api/inventory/import")).toEqual([
    { method: "POST", path: "/api/inventory/import", body: { categoryId: item.categoryId, csvData } },
  ]);
});

test.describe("technician UI", () => {
  test.use({ role: "tech" });
  test("hides admin navigation and destructive actions", async ({ page }) => {
    await openPage(page, "/items");
    await expect(page.getByTestId("nav-users")).toHaveCount(0);
    await expect(page.getByTestId("nav-categories")).toHaveCount(0);
    await expect(page.getByTestId(`button-delete-${item.id}`)).toHaveCount(0);
    await openPage(page, "/users");
    await expect(page).toHaveURL(/\/$/);
  });
});
