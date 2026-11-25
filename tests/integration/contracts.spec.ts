import { test, expect, type APIRequestContext } from "@playwright/test";
import * as XLSX from "xlsx";

const itemId = "33333333-3333-4333-8333-333333333333";
const categoryId = "11111111-1111-4111-8111-111111111111";
async function login(request: APIRequestContext, role: "admin" | "tech" = "admin") {
  const response = await request.post("/api/auth/login", { data: { username: `${role}-teste`, password: "Synthetic@123" } });
  expect(response.status()).toBe(200);
  return response;
}

test("anonymous clients cannot read inventory or create stock movements", async ({ request }) => {
  expect((await request.get("/api/items")).status()).toBe(401);
  expect((await request.post("/api/movements", { data: { itemId, type: "entrada", quantity: 1 } })).status()).toBe(401);
});

test("login uses httpOnly cookies and logout clears them", async ({ request }) => {
  const response = await login(request);
  const data = await response.json();
  expect(data).not.toHaveProperty("token");
  expect(data.user).not.toHaveProperty("password");
  expect(response.headers()["set-cookie"]).toMatch(/HttpOnly/i);
  expect((await request.get("/api/items")).status()).toBe(200);
  expect((await request.post("/api/auth/logout")).ok()).toBe(true);
  expect((await request.get("/api/items")).status()).toBe(401);
  expect((await request.storageState()).cookies.filter((c) => c.name === "sgat_token")).toHaveLength(0);
});

test("tech cannot delete inventory, create categories or list users", async ({ request }) => {
  await login(request, "tech");
  expect((await request.delete(`/api/items/${itemId}`)).status()).toBe(403);
  expect((await request.post("/api/categories", { data: { name: "Proibida" } })).status()).toBe(403);
  expect((await request.get("/api/users")).status()).toBe(403);
  expect((await request.get(`/api/items/${itemId}`)).status()).toBe(200);
});

test("real entry/exit changes stock once and rejects insufficient stock", async ({ request }) => {
  await login(request, "tech");
  const original = await (await request.get(`/api/items/${itemId}`)).json();
  const entry = await request.post("/api/movements", { data: { itemId, type: "entrada", quantity: 3, userId: "22222222-2222-4222-8222-222222222222" } });
  expect(entry.status()).toBe(201);
  expect(await entry.json()).toMatchObject({ previousStock: original.currentStock, newStock: original.currentStock + 3, userId: "55555555-5555-4555-8555-555555555555" });
  expect(await (await request.get(`/api/items/${itemId}`)).json()).toMatchObject({ currentStock: original.currentStock + 3 });
  const exit = await request.post("/api/movements", { data: { itemId, type: "saida", quantity: 3 } });
  expect(exit.status()).toBe(201);
  expect(await (await request.get(`/api/items/${itemId}`)).json()).toMatchObject({ currentStock: original.currentStock });
  expect((await request.post("/api/movements", { data: { itemId, type: "saida", quantity: original.currentStock + 1 } })).status()).toBe(400);
  expect(await (await request.get(`/api/items/${itemId}`)).json()).toMatchObject({ currentStock: original.currentStock });
  const movements = await (await request.get(`/api/movements?itemId=${itemId}`)).json();
  expect(movements).toHaveLength(2);
});

test("unit is returned after persisting an inline unit update", async ({ request }) => {
  await login(request);
  const updated = await request.put(`/api/items/${itemId}`, { data: { unit: "cx" } });
  expect(updated.status()).toBe(200);
  expect.soft(await updated.json()).toMatchObject({ unit: "cx" });
  const items = await (await request.get("/api/items")).json();
  expect(items.find((item: { id: string }) => item.id === itemId)).toHaveProperty("unit", "cx");
});

test("scanner lookup resolves the code using the frontend endpoint", async ({ request }) => {
  await login(request);
  const response = await request.get("/api/items/by-code/2026-0001");
  expect(response.status(), "Endpoint used by scanner.tsx must exist").toBe(200);
  expect(await response.json()).toMatchObject({ id: itemId, internalCode: "2026-0001" });
});

test("admin creates, edits, finds and deletes an item", async ({ request }) => {
  await login(request);
  const response = await request.post("/api/items", { data: { name: "Mouse sintético", categoryId, currentStock: 2, minStock: 1, unit: "un", status: "disponivel" } });
  expect(response.status()).toBe(201);
  const created = await response.json();
  expect((await request.put(`/api/items/${created.id}`, { data: { name: "Mouse revisado" } })).status()).toBe(200);
  const found = await (await request.get("/api/items/search?q=Mouse%20revisado")).json();
  expect(found).toHaveLength(1);
  expect(found[0].id).toBe(created.id);
  expect((await request.delete(`/api/items/${created.id}`)).ok()).toBe(true);
  expect((await request.get(`/api/items/${created.id}`)).status()).toBe(404);
});

test("CSV and XLSX exports return actual inventory content", async ({ request }) => {
  await login(request);
  const csv = await request.get("/api/inventory/export");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("Teclado de teste");
  const excel = await request.get("/api/inventory/export-excel");
  expect(excel.status()).toBe(200);
  const workbook = XLSX.read(await excel.body(), { type: "buffer" });
  expect(XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]])).toContain("Teclado de teste");
});

test("browser authenticates through the real API and shows persisted stock", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("input-username").fill("tech-teste");
  await page.getByTestId("input-password").fill("Synthetic@123");
  await page.getByTestId("button-login").click();
  await expect(page.getByTestId("page-title")).toHaveText("Dashboard");
  await page.getByTestId("nav-items").click();
  await expect(page.getByTestId(`item-name-${itemId}`)).toHaveText("Teclado de teste");
  await expect(page.getByTitle("Editar quantidade (Gera Movimentação)")).toHaveValue("10");
});
