import { test as base, expect, type Page } from "@playwright/test";
import type { Category, ItemWithCategory, User } from "../../shared/schema";

const createdAt = new Date("2026-11-25T12:00:00Z");
export const category: Category = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Periféricos",
  description: "Categoria sintética de regressão",
  icon: "fas fa-keyboard",
  createdAt,
};
export const user: Omit<User, "password"> = {
  id: "22222222-2222-4222-8222-222222222222",
  username: "admin-teste",
  name: "Pessoa Administradora de Teste",
  email: "admin@example.invalid",
  matricula: "1234567",
  role: "admin",
  isActive: true,
  deletedAt: null,
  createdAt,
};
export const item: ItemWithCategory = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Teclado de teste",
  internalCode: "2026-0001",
  categoryId: category.id,
  serialNumber: "TEST-001",
  currentStock: 10,
  minStock: 2,
  unit: "un",
  status: "disponivel",
  location: "Sala de testes",
  createdAt,
  updatedAt: createdAt,
  category,
};

interface Mutation { method: string; path: string; body: Record<string, unknown> }
export interface MockApi {
  items: ItemWithCategory[];
  mutations: Mutation[];
  requests: Array<{ method: string; path: string }>;
  failedPaths: Set<string>;
  empty: boolean;
  role: "admin" | "tech";
  signedIn: boolean;
}

export const test = base.extend<{ api: MockApi; role: "admin" | "tech"; signedIn: boolean }>({
  role: ["admin", { option: true }],
  signedIn: [true, { option: true }],
  api: [async ({ page, baseURL, role, signedIn }, use) => {
    const api: MockApi = {
      items: [structuredClone(item)], mutations: [], requests: [], failedPaths: new Set(),
      empty: false, role, signedIn,
    };
    const unexpected: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.setFixedTime(createdAt);
    await page.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === baseURL && url.pathname.startsWith("/_vercel/speed-insights/")) {
        return route.fulfill({ status: 200, body: "", contentType: "application/javascript" });
      }
      if (url.origin !== baseURL) {
        // Fonts use a stable local fallback; no third-party analytics or network.
        if (["fonts.googleapis.com", "fonts.gstatic.com", "va.vercel-scripts.com", "vitals.vercel-insights.com"].includes(url.hostname)) {
          return route.fulfill({ status: 200, body: "", contentType: "text/css" });
        }
        unexpected.push(`${request.method()} ${url.origin}${url.pathname}`);
        return route.abort();
      }
      if (!url.pathname.startsWith("/api/")) return route.continue();
      const method = request.method();
      const pathname = url.pathname;
      api.requests.push({ method, path: pathname });
      const send = (data: unknown, status = 200) => route.fulfill({ status, json: data });
      if (api.failedPaths.has(pathname)) return send({ message: "Falha sintética" }, 500);
      const body = request.postData() ? request.postDataJSON() as Record<string, unknown> : {};
      if (method !== "GET") api.mutations.push({ method, path: pathname, body });
      if (method === "POST" && pathname === "/api/auth/login") return send({ user: { ...user, role: api.role } });
      if (method === "POST" && ["/api/heartbeat", "/api/auth/logout"].includes(pathname)) return send({ ok: true });
      if (method === "GET" && pathname === "/api/items") return send(api.empty ? [] : api.items);
      if (method === "GET" && pathname === "/api/items/search") {
        const q = (url.searchParams.get("q") || "").toLowerCase();
        return send(api.empty ? [] : api.items.filter((i) => !q || `${i.name} ${i.internalCode}`.toLowerCase().includes(q)));
      }
      if (method === "GET" && pathname.startsWith("/api/items/by-code/")) return send(api.items[0]);
      if (method === "GET" && ["/api/categories", "/api/categories/with-counts"].includes(pathname)) return send(api.empty ? [] : [{ ...category, itemCount: api.items.length }]);
      if (method === "GET" && pathname === "/api/users") return send([{ ...user, role: api.role }]);
      if (method === "GET" && pathname === "/api/users/online") return send([{ ...user, lastSeenAt: createdAt }]);
      if (method === "GET" && pathname === "/api/dashboard/stats") return send({ totalItems: api.items.length, lowStock: 0, todayMovements: 0, activeUsers: 1 });
      if (method === "GET" && ["/api/dashboard/low-stock", "/api/dashboard/recent-movements", "/api/movements", "/api/dashboard/consumption"].includes(pathname)) return send([]);
      if (method === "POST" && pathname === "/api/items") {
        const next = { ...item, ...body, id: "44444444-4444-4444-8444-444444444444", internalCode: "2026-0002" } as ItemWithCategory;
        api.items.push(next);
        return send(next, 201);
      }
      if (method === "PUT" && pathname.startsWith("/api/items/")) {
        const found = api.items.find((i) => pathname.endsWith(i.id));
        if (!found) return send({ message: "Not found" }, 404);
        Object.assign(found, body);
        return send(found);
      }
      if (method === "DELETE" && pathname.startsWith("/api/items/")) {
        api.items = api.items.filter((i) => !pathname.endsWith(i.id));
        return route.fulfill({ status: 204 });
      }
      if (method === "POST" && pathname === "/api/movements") {
        const found = api.items.find((i) => i.id === body.itemId);
        if (!found) return send({ message: "Not found" }, 404);
        found.currentStock += (body.type === "entrada" ? 1 : -1) * Number(body.quantity);
        return send({ id: "movement-1", ...body, newStock: found.currentStock }, 201);
      }
      if (method === "GET" && pathname === "/api/inventory/export") return route.fulfill({ contentType: "text/csv", body: "nome,estoque\nTeclado de teste,10\n" });
      if (method === "GET" && pathname === "/api/inventory/export-excel") return route.fulfill({ contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: Buffer.from("UI download fixture; real XLSX checked in integration") });
      if (method === "POST" && pathname === "/api/inventory/import") return send({ success: 1, errors: [] });
      unexpected.push(`${method} ${pathname}`);
      return send({ message: "Unexpected fixture request" }, 501);
    });
    await page.addInitScript(({ user, signedIn }) => {
      if (signedIn && !localStorage.getItem("sgat-user")) localStorage.setItem("sgat-user", JSON.stringify(user));
    }, { user: { ...user, role: api.role }, signedIn: api.signedIn });
    await use(api);
    expect(unexpected, "Every request must have an explicit fixture").toEqual([]);
    expect(errors, "Unhandled browser errors").toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function openPage(page: Page, pathname: string) {
  await page.goto(pathname);
  await expect(page.getByTestId("page-title")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
