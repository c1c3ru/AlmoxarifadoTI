import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Banco e e-mail substituídos por dublês em memória: estes testes cobrem as
// regras das rotas (resposta genérica, hash, expiração, uso único), não o SQL.
const db = vi.hoisted(() => ({
  users: [] as Array<{ id: string; username: string; name: string; email: string; isActive: boolean; deletedAt: Date | null; password: string }>,
  resets: [] as Array<{ userId: string; tokenHash: string; expiresAt: Date; createdAt: Date }>,
}));
const sentLinks = vi.hoisted(() => [] as string[]);

vi.mock("../storage", () => ({
  storage: {
    getActiveUsersByUsernameOrEmail: async (value: string) =>
      db.users.filter(
        (u) => (u.username === value || u.email.toLowerCase() === value.toLowerCase()) && u.isActive && !u.deletedAt,
      ),
    getLatestPasswordResetCreatedAt: async (userId: string) =>
      db.resets.filter((r) => r.userId === userId).at(-1)?.createdAt,
    createPasswordReset: async (userId: string, tokenHash: string, expiresAt: Date) => {
      db.resets = db.resets.filter((r) => r.userId !== userId);
      db.resets.push({ userId, tokenHash, expiresAt, createdAt: new Date() });
    },
    consumePasswordReset: async (tokenHash: string) => {
      const found = db.resets.find((r) => r.tokenHash === tokenHash);
      db.resets = db.resets.filter((r) => r.tokenHash !== tokenHash);
      return found && { userId: found.userId, expiresAt: found.expiresAt };
    },
    deletePasswordResetsForUser: async (userId: string) => {
      db.resets = db.resets.filter((r) => r.userId !== userId);
    },
    getUser: async (id: string) => db.users.find((u) => u.id === id),
    updateUserPassword: async (id: string, hash: string) => {
      const user = db.users.find((u) => u.id === id);
      if (user) user.password = hash;
    },
  },
}));

vi.mock("../email", () => ({
  emailService: {
    sendPasswordResetEmail: async (_email: string, url: string) => {
      sentLinks.push(url);
      return true;
    },
    sendPasswordChangedEmail: async () => true,
  },
}));

// Os limitadores de taxa guardam estado no módulo; cada teste importa uma
// instância nova das rotas para que um teste não esgote o limite do outro.
let server: Server | undefined;
let baseUrl: string;
let hashResetToken: (token: string) => string;

beforeEach(async () => {
  process.env.APP_URL = "https://app.example.com";
  vi.resetModules();
  const mod = await import("./password-reset");
  hashResetToken = mod.hashResetToken;
  const app = express();
  app.use(express.json());
  app.use("/api", mod.default);
  server = app.listen(0);
  await new Promise((resolve) => server!.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

afterEach(() => {
  server?.close();
});

beforeEach(() => {
  db.users = [
    { id: "u1", username: "joao", name: "João", email: "Joao@ifce.edu.br", isActive: true, deletedAt: null, password: "old" },
    { id: "u2", username: "removido", name: "Removido", email: "removido@ifce.edu.br", isActive: false, deletedAt: new Date(), password: "old" },
  ];
  db.resets = [];
  sentLinks.length = 0;
});

async function post(path: string, body: unknown) {
  const res = await fetch(baseUrl + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

const tokenFromLink = (link: string) => new URL(link).searchParams.get("token") ?? "";

describe("POST /api/auth/forgot-password", () => {
  it("responde igual para conta inexistente, excluída e ativa", async () => {
    const missing = await post("/auth/forgot-password", { usernameOrEmail: "ninguem" });
    const deleted = await post("/auth/forgot-password", { usernameOrEmail: "removido" });
    const active = await post("/auth/forgot-password", { usernameOrEmail: "JOAO@ifce.edu.br" });

    expect(missing.status).toBe(200);
    expect(deleted).toEqual(missing);
    expect(active).toEqual(missing);
    expect(sentLinks).toHaveLength(1);
  });

  it("guarda só o hash do token e nunca devolve o token na resposta", async () => {
    const res = await post("/auth/forgot-password", { usernameOrEmail: "joao" });
    const token = tokenFromLink(sentLinks[0]);

    expect(sentLinks[0].startsWith("https://app.example.com/reset-password?token=")).toBe(true);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(res.text).not.toContain(token);
    expect(db.resets).toHaveLength(1);
    expect(db.resets[0].tokenHash).toBe(hashResetToken(token));
    expect(db.resets[0].tokenHash).not.toBe(token);
  });

  it("não reenvia e-mail para a mesma conta dentro do intervalo mínimo", async () => {
    await post("/auth/forgot-password", { usernameOrEmail: "joao" });
    await post("/auth/forgot-password", { usernameOrEmail: "joao" });
    expect(sentLinks).toHaveLength(1);
  });
});

describe("POST /api/auth/reset-password", () => {
  async function issueToken() {
    await post("/auth/forgot-password", { usernameOrEmail: "joao" });
    return tokenFromLink(sentLinks[0]);
  }

  it("troca a senha com um token válido e não permite reutilizá-lo", async () => {
    const token = await issueToken();

    const first = await post("/auth/reset-password", { token, newPassword: "NovaSenha@2" });
    expect(first.status).toBe(200);
    expect(db.users[0].password).not.toBe("old");

    const again = await post("/auth/reset-password", { token, newPassword: "OutraSenha@3" });
    expect(again.status).toBe(400);
  });

  it("recusa token expirado", async () => {
    const token = await issueToken();
    db.resets[0].expiresAt = new Date(Date.now() - 1000);

    const res = await post("/auth/reset-password", { token, newPassword: "NovaSenha@2" });
    expect(res.status).toBe(400);
    expect(db.users[0].password).toBe("old");
  });

  it("recusa senha fraca sem consumir o token", async () => {
    const token = await issueToken();

    const res = await post("/auth/reset-password", { token, newPassword: "fraca" });
    expect(res.status).toBe(400);
    expect(db.resets).toHaveLength(1);
  });

  it("recusa token em formato inválido", async () => {
    const res = await post("/auth/reset-password", { token: "abc", newPassword: "NovaSenha@2" });
    expect(res.status).toBe(400);
  });
});
