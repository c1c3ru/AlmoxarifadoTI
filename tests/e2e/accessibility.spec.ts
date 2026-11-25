import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { test, expect, openPage } from "./fixtures";

for (const route of ["/", "/items", "/search", "/movements", "/history", "/consumption", "/users", "/categories", "/scanner"]) {
  test(`WCAG baseline ${route}`, async ({ page }) => {
    await openPage(page, route);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const auditPath = test.info().outputPath("axe-results.json");
    await writeFile(auditPath, JSON.stringify(result, null, 2));
    await test.info().attach("axe-results", { path: auditPath, contentType: "application/json" });
    expect(result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  });
}
