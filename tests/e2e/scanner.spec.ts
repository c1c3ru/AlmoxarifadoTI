import { test, expect, item, openPage } from "./fixtures";

test("simulated camera decodes the existing ITEM payload and withdraws once", async ({ page, api }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(({ id, code }) => {
    class TestDetector {
      static async getSupportedFormats() { return ["qr_code"]; }
      async detect() {
        return [{ rawValue: `ITEM:${id}:${code}`, cornerPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }] }];
      }
    }
    Object.defineProperty(window, "BarcodeDetector", { value: TestDetector, configurable: true });
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 640, 480);
    const stream = canvas.captureStream(10);
    window.setInterval(() => ctx.fillRect(0, 0, 640, 480), 100);
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { value: async () => stream });
    Object.defineProperty(navigator.mediaDevices, "enumerateDevices", { value: async () => [{ kind: "videoinput", deviceId: "synthetic-camera", label: "Synthetic Camera" }] });
  }, { id: item.id, code: item.internalCode });
  await openPage(page, "/scanner");
  await page.getByTestId("button-activate-camera").click();
  const scannerFrame = page.locator(".qr-scanner-frame");
  const frameBounds = await scannerFrame.boundingBox();
  expect(frameBounds).not.toBeNull();
  expect(frameBounds!.height).toBeLessThan(390);
  expect(frameBounds!.width).toBeLessThanOrEqual(844);
  await expect(page.getByTestId("scanned-item-code")).toHaveText(item.internalCode);
  await page.getByTestId("input-withdrawal-quantity").fill("2");
  await page.getByTestId("input-withdrawal-destination").fill("Laboratório sintético");
  await page.getByTestId("button-confirm-withdrawal").click();
  await expect.poll(() => api.items[0].currentStock).toBe(8);
  expect(api.mutations.filter((m) => m.path === "/api/movements")).toHaveLength(1);
});
