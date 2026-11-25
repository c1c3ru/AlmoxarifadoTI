import { afterEach, expect, it, vi } from "vitest";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { users } from "@shared/schema";

const originalFetch = neonConfig.fetchFunction;
afterEach(() => { neonConfig.fetchFunction = originalFetch; });

it("the installed Neon driver supports Drizzle's parameterized query API", async () => {
  const transport = vi.fn(async () => Response.json({
    fields: [{ name: "id", dataTypeID: 25 }], rows: [], rowCount: 0, command: "SELECT",
  }));
  neonConfig.fetchFunction = transport;
  const db = drizzle(neon("postgresql://synthetic:synthetic@127.0.0.1/sgat_ui_regression"));
  await expect(db.select({ id: users.id }).from(users).limit(1)).resolves.toEqual([]);
  expect(transport).toHaveBeenCalledTimes(1);
});
