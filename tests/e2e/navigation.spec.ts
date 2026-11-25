import { test, expect, openPage } from "./fixtures";

test("mobile drawer traps focus, survives keyboard resize and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPage(page, "/items");
  const toggle = page.getByTestId("button-toggle-sidebar");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("nav-search")).toHaveCount(0);
  await toggle.click();
  const drawer = page.getByRole("dialog", { name: "Menu principal" });
  await expect(drawer).toBeVisible();
  await page.setViewportSize({ width: 390, height: 390 });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Fechar menu" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByTestId("button-logout")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(drawer.getByRole("button", { name: "Fechar menu" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.getByTestId("nav-search").click();
  await expect(page).toHaveURL(/\/search$/);
  await expect(drawer).toHaveCount(0);
});

test("compact menu keeps password and logout reachable and preserves preference", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openPage(page, "/items");
  await expect(page.getByTestId("button-toggle-sidebar")).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("button-change-password")).toBeVisible();
  await expect(page.getByTestId("button-logout")).toBeVisible();
  await page.getByTestId("button-toggle-sidebar").click();
  await page.setViewportSize({ width: 1100, height: 768 });
  await expect(page.getByTestId("button-toggle-sidebar")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Itens", exact: true })).toHaveAttribute("aria-current", "page");
});
