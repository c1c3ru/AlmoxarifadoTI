import AxeBuilder from "@axe-core/playwright";
import { expect, item, openPage, test } from "./fixtures";

test("single QR dialog stays readable on mobile and is isolated for printing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openPage(page, "/items");
  await page.getByTestId(`button-qr-modal-${item.id}`).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img", { name: "Código QR do item" })).toBeVisible();
  await expect(dialog.getByTestId("qr-item-code")).toHaveText(item.internalCode);
  const qrAudit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(qrAudit.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || ""))).toEqual([]);
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);

  await page.emulateMedia({ media: "print" });
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId("button-print-qr")).toBeHidden();
  await expect(page.locator("#root")).toBeHidden();
});

test("print media hides application navigation even outside QR dialog", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openPage(page, "/items");
  await expect(page.locator("#app-sidebar")).toBeVisible();
  await expect(page.locator("header")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#app-sidebar")).toBeHidden();
  await expect(page.locator("header")).toBeHidden();
});

test("thermal QR preview dialog fits a short mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openPage(page, "/items");
  await page.getByTestId(`item-row-${item.id}`).getByRole("checkbox").check();
  await page.getByTestId("button-thermal-print").click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Preview da Impressão/)).toBeVisible();
  const thermalAudit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(thermalAudit.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || ""))).toEqual([]);
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(321);
  await expect(dialog.getByRole("button", { name: /Imprimir 1 QR Code/ })).toBeVisible();
});
