import { readFile } from "node:fs/promises";
import path from "node:path";
import express from "express";
import pg from "pg";
import bcrypt from "bcryptjs";
import { neonConfig } from "@neondatabase/serverless";

// Never load .env. Even inherited production configuration is rejected.
if (process.env.DATABASE_URL) throw new Error("Unset DATABASE_URL before running isolated integration tests");
const connectionString = process.env.E2E_DATABASE_URL;
if (!connectionString) throw new Error("E2E_DATABASE_URL is required (disposable local PostgreSQL)");
const url = new URL(connectionString);
if (!["postgres:", "postgresql:"].includes(url.protocol) || url.search || url.hash ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/sgat_ui_regression") {
  throw new Error("Only a loopback sgat_ui_regression database is allowed");
}
const database = new pg.Client({ connectionString });
await database.connect();
// The guarded database is disposable and reset on every invocation.
await database.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
await database.query(await readFile(new URL("./schema.sql", import.meta.url), "utf8"));
const password = await bcrypt.hash("Synthetic@123", 4);
for (const [id, role, matricula] of [
  ["22222222-2222-4222-8222-222222222222", "admin", "1234567"],
  ["55555555-5555-4555-8555-555555555555", "tech", "20261193010007"],
]) {
  await database.query("INSERT INTO users (id,username,password,name,email,matricula,role) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [id, `${role}-teste`, password, `Pessoa ${role} de Teste`, `${role}@example.invalid`, matricula, role]);
}
await database.query("INSERT INTO categories (id,name,description,icon) VALUES ($1,$2,$3,$4)",
  ["11111111-1111-4111-8111-111111111111", "Periféricos", "Fixture sintética", "fas fa-keyboard"]);
await database.query("INSERT INTO items (id,internal_code,name,category_id,current_stock,min_stock,unit,status,location) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
  ["33333333-3333-4333-8333-333333333333", "2026-0001", "Teclado de teste", "11111111-1111-4111-8111-111111111111", 10, 2, "un", "disponivel", "Sala de testes"]);

// Test-only transport adapter: real application SQL executes in real PostgreSQL.
// Raw strings + field OIDs preserve the Neon driver's own parsing behavior.
// This validates app/database integration, not Neon's cloud HTTP infrastructure.
const typeOids = await database.query<{ oid: number }>("SELECT oid FROM pg_type");
for (const { oid } of typeOids.rows) pg.types.setTypeParser(oid, (value) => value);
neonConfig.fetchFunction = async (_input: unknown, init: RequestInit) => {
  const request = JSON.parse(String(init.body)) as { query: string; params: unknown[] };
  if (!request.query || !Array.isArray(request.params)) throw new Error("Unexpected Neon query format");
  try {
    const result = await database.query({
      text: request.query, values: request.params, rowMode: "array",
      types: pg.types,
    });
    return Response.json({ rows: result.rows, fields: result.fields, rowCount: result.rowCount, command: result.command });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PostgreSQL test error";
    return Response.json({ message }, { status: 400 });
  }
};
process.env.DATABASE_URL = connectionString;
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "synthetic-local-regression-secret-never-for-production";
const { createApp } = await import("../../server/app");
const app = await createApp();
app.use("/api", (_req, res) => res.status(404).json({ message: "API route not found" }));
app.use(express.static(path.resolve("dist/public")));
app.get("*", (_req, res) => res.sendFile(path.resolve("dist/public/index.html")));
const server = app.listen(4174, "127.0.0.1");
const shutdown = () => server.close(() => { void database.end().then(() => process.exit(0)); });
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
