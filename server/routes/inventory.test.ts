import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const lookup = vi.hoisted(() => vi.fn());
vi.mock("../storage", () => ({ storage: { getItemByCode: lookup, updateUserLastSeen: vi.fn() } }));

let server: Server;
let baseURL: string;
let token: string;
beforeAll(async () => {
  const { default: router } = await import("./inventory");
  const { generateToken } = await import("../auth");
  token = generateToken({ sub: "tech-id", username: "test", role: "tech" });
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("GET /api/items/by-code/:code", () => {
  it("requires authentication before accessing storage", async () => {
    lookup.mockClear();
    const res = await fetch(`${baseURL}/api/items/by-code/2026-0001`);
    expect(res.status).toBe(401);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("returns the item for an authenticated technician", async () => {
    lookup.mockResolvedValue({ id: "item-id", internalCode: "2026-0001", unit: "cx" });
    const res = await fetch(`${baseURL}/api/items/by-code/2026-0001`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    expect(lookup).toHaveBeenLastCalledWith("2026-0001");
    expect(await res.json()).toMatchObject({ id: "item-id", internalCode: "2026-0001", unit: "cx" });
  });

  it("returns 404 for a missing code", async () => {
    lookup.mockResolvedValue(undefined);
    const res = await fetch(`${baseURL}/api/items/by-code/missing`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ message: "Item not found" });
  });
});
