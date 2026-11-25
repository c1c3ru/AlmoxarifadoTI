import { test, expect, item, user, openPage } from "./fixtures";

for (const [route, endpoint] of [
  ["/", "/api/dashboard/stats"], ["/history", "/api/movements"],
  ["/movements", "/api/movements"], ["/consumption", "/api/dashboard/consumption"],
  ["/users", "/api/users"], ["/categories", "/api/categories"],
]) {
  test(`${route} exposes network failure and retries the same query`, async ({ page, api }) => {
    api.failedPaths.add(endpoint);
    await openPage(page, route);
    await expect(page.getByRole("alert")).toBeVisible();
    const previous = api.requests.filter((r) => r.path === endpoint).length;
    api.failedPaths.delete(endpoint);
    await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(api.requests.filter((r) => r.path === endpoint).length).toBe(previous + 1);
  });
}

test("history keeps entry, exit, quantities and net balance calculations", async ({ page }) => {
  await page.route("**/api/movements?**", async (route) => route.fulfill({ json: [
    { id: "m1", item, user, type: "entrada", quantity: 4, previousStock: 10, newStock: 14, createdAt: "2026-11-25T12:00:00Z" },
    { id: "m2", item, user, type: "saida", quantity: 2, previousStock: 14, newStock: 12, createdAt: "2026-11-25T13:00:00Z" },
  ] }));
  await openPage(page, "/history");
  await expect(page.getByTestId("stat-total-movements")).toHaveText("2");
  await expect(page.getByTestId("stat-entries")).toHaveText("1");
  await expect(page.getByTestId("stat-exits")).toHaveText("1");
  await expect(page.getByTestId("stat-net-balance")).toHaveText("+2");
  await page.getByTestId("select-type-filter").click();
  await page.getByRole("option", { name: /Saída/ }).click();
  await expect(page.getByTestId("stat-total-movements")).toHaveText("1");
  await expect(page.getByTestId("stat-net-balance")).toHaveText("-2");
});
