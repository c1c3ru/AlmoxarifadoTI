import { test, expect, item, openPage } from "./fixtures";

for (const [width, height] of [[320, 568], [390, 844], [844, 390], [768, 1024], [1024, 768], [1366, 768], [2560, 1440]]) {
  test(`inventory keeps essential fields and local scrolling at ${width}`, async ({ page, api }) => {
    api.items[0].name = "Teclado de teste com uma descrição operacional longa " + "X".repeat(90);
    api.items[0].location = "Localização sintética " + "L".repeat(90);
    await page.setViewportSize({ width, height });
    await openPage(page, "/items");
    const row = page.getByTestId(`item-row-${item.id}`);
    for (const field of [`item-code-${item.id}`, `item-category-${item.id}`, `item-stock-${item.id}`, `item-status-${item.id}`]) {
      await expect(page.getByTestId(field)).toBeVisible();
    }
    await expect(row.getByTitle("Editar unidade", { exact: true })).toBeVisible();
    await row.getByRole("checkbox").check();
    await expect(page.getByTestId("button-thermal-print")).toContainText("1");
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
    expect(api.mutations.filter((m) => m.path === "/api/movements")).toHaveLength(0);
  });
}

test("CSV dialog and values survive crossing the presentation breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, "/items");
  await expect(page.getByTestId("button-import-csv")).toHaveCount(1);
  await page.getByTestId("button-import-csv").click();
  await page.getByTestId("textarea-csv-data").fill("nome,quantidade\nMouse teste,3");
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("textarea-csv-data")).toHaveValue("nome,quantidade\nMouse teste,3");
});
