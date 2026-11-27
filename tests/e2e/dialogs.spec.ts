import { test, expect, item, openPage } from "./fixtures";

for (const [width, height] of [[320, 568], [844, 390]]) {
  test(`item dialogs fit ${width}x${height} and keep actions reachable`, async ({ page, api }) => {
    await page.setViewportSize({ width, height });
    await openPage(page, "/items");
    await page.getByTestId("button-add").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(15);
    expect(bounds!.y).toBeGreaterThanOrEqual(15);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width - 15);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height - 15);
    await page.getByTestId("button-save-item").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("button-save-item")).toBeInViewport();
    await page.getByTestId("button-save-item").click();
    await expect(dialog).toBeVisible();
    expect(api.mutations.filter((m) => m.path === "/api/items")).toHaveLength(0);
    await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId("button-add")).toBeFocused();
  });
}

test("QR dialog restores focus to its external trigger", async ({ page }) => {
  await openPage(page, "/items");
  const trigger = page.getByTestId(`button-qr-modal-${item.id}`);
  await trigger.click();
  await page.getByRole("dialog").getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(trigger).toBeFocused();
});

test.describe("public forms", () => {
  test.use({ signedIn: false });
  test("registration labels point to real form inputs", async ({ page }) => {
    await page.goto("/register");
    for (const label of [/Nome Completo/, /Email Institucional/, /Matrícula de Técnico/, /Senha de Acesso/, /Confirmar Senha/]) {
      await expect(page.getByLabel(label)).toHaveJSProperty("tagName", "INPUT");
    }
    await expect(page.getByLabel(/Nome Completo/)).toHaveAttribute("autocomplete", "name");
  });
});
