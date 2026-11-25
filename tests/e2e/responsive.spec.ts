import { test, expect, openPage } from "./fixtures";

export const viewports = [
  [320, 568], [360, 800], [390, 844], [844, 390], [768, 1024],
  [1024, 768], [1366, 768], [1920, 1080], [2560, 1440],
];
export const routes = ["/", "/items", "/search", "/movements", "/history", "/consumption", "/users", "/categories", "/scanner"];

for (const [width, height] of viewports) {
  test(`global reflow ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      await openPage(page, route);
      const dimensions = await page.evaluate(() => ({ width: window.innerWidth, scroll: document.documentElement.scrollWidth }));
      expect.soft(dimensions.scroll, `${route}: document width`).toBeLessThanOrEqual(dimensions.width + 1);
      const title = await page.getByTestId("page-title").boundingBox();
      expect.soft(title && title.x >= 0 && title.x + title.width <= width + 1, `${route}: title visible`).toBe(true);
      const screenshotPath = test.info().outputPath(`${route.replaceAll("/", "_") || "dashboard"}-${width}x${height}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
      await test.info().attach(`${route.replaceAll("/", "_") || "dashboard"}-${width}x${height}`, {
        path: screenshotPath, contentType: "image/png",
      });
    }
  });
}

for (const width of [767, 768, 769, 1023, 1024, 1025, 1279, 1280, 1281]) {
  test(`sidebar has reachable navigation at breakpoint ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await openPage(page, "/items");
    await page.getByTestId("button-toggle-sidebar").click();
    await expect(page.getByTestId("nav-search")).toBeInViewport();
    await page.getByTestId("nav-search").click();
    await expect(page).toHaveURL(/\/search$/);
  });
}
