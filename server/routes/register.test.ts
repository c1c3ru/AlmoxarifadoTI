import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Banco substituído por um dublê em memória: estes testes cobrem as regras do
// cadastro público (perfil, tamanho de matrícula, aprovação de servidor).
const created = vi.hoisted(() => [] as Array<Record<string, unknown>>);

vi.mock("../storage", () => ({
  storage: {
    createUser: async (data: Record<string, unknown>) => {
      const user = { id: `u${created.length + 1}`, ...data };
      created.push(user);
      return user;
    },
    getUserByUsername: async (username: string) => created.find((u) => u.username === username),
    getUsersForLogin: async (identifier: string) =>
      created.filter(
        (u) =>
          String(u.username).toLowerCase() === identifier.toLowerCase() ||
          String(u.email ?? "").toLowerCase() === identifier.toLowerCase() ||
          u.matricula === identifier
      ),
  },
}));

let server: Server | undefined;
let baseUrl: string;

beforeEach(async () => {
  created.length = 0;
  vi.resetModules();
  const mod = await import("./auth");
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

const base = {
  username: "fulano@ifce.edu.br",
  email: "fulano@ifce.edu.br",
  name: "Fulano de Tal",
  password: "Senha@Forte1",
  isActive: true,
};

function register(body: Record<string, unknown>) {
  return fetch(`${baseUrl}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/register", () => {
  it("cadastra aluno/técnico com matrícula de 14 dígitos já ativo", async () => {
    const res = await register({ ...base, role: "tech", matricula: "20261193010007" });
    expect(res.status).toBe(201);
    expect(created[0]).toMatchObject({ role: "tech", isActive: true });
  });

  it("recusa aluno/técnico com matrícula de 7 dígitos", async () => {
    const res = await register({ ...base, role: "tech", matricula: "1678389" });
    expect(res.status).toBe(400);
    expect(created).toHaveLength(0);
  });

  it("cadastra servidor com 7 dígitos, mas inativo até aprovação", async () => {
    const res = await register({ ...base, role: "admin", matricula: "1678389", isActive: true });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.pendingApproval).toBe(true);
    expect(created[0]).toMatchObject({ role: "admin", isActive: false });
  });

  it("nunca cria servidor ativo, mesmo que o cliente peça", async () => {
    const res = await register({ ...base, role: "admin", matricula: "2231232", isActive: true });
    expect(res.status).toBe(201);
    expect(created[0]).toMatchObject({ role: "admin", isActive: false });
  });

  it("recusa servidor com matrícula de 14 dígitos", async () => {
    const res = await register({ ...base, role: "admin", matricula: "20261193010007" });
    expect(res.status).toBe(400);
    expect(created).toHaveLength(0);
  });

  it("trata qualquer perfil desconhecido como aluno/técnico", async () => {
    const res = await register({ ...base, role: "superuser", matricula: "20261193010007" });
    expect(res.status).toBe(201);
    expect(created[0]).toMatchObject({ role: "tech" });
  });
});

describe("POST /api/auth/login com conta aguardando liberação", () => {
  beforeEach(async () => {
    created.push({
      id: "p1",
      username: "servidor@ifce.edu.br",
      password: await bcrypt.hash("Senha@Forte1", 4),
      role: "admin",
      isActive: false,
    });
  });

  function login(password: string) {
    return fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "servidor@ifce.edu.br", password }),
    });
  }

  it("com a senha certa, avisa que a conta aguarda liberação", async () => {
    const res = await login("Senha@Forte1");
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.code).toBe("ACCOUNT_PENDING_APPROVAL");
  });

  it("com a senha errada, não revela que a conta existe", async () => {
    const res = await login("errada");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/login por usuário, e-mail ou matrícula", () => {
  beforeEach(async () => {
    created.push({
      id: "a1",
      username: "daniel.regis@ifce.edu.br",
      email: "Daniel.Regis@ifce.edu.br",
      matricula: "1234567",
      password: await bcrypt.hash("Senha@Forte1", 4),
      role: "admin",
      isActive: true,
    });
  });

  function login(username: string, password = "Senha@Forte1") {
    return fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  }

  it.each([
    ["username exato", "daniel.regis@ifce.edu.br"],
    ["e-mail com maiúsculas e espaços", "  DANIEL.REGIS@IFCE.EDU.BR "],
    ["matrícula", "1234567"],
  ])("entra com %s", async (_label, identifier) => {
    const res = await login(identifier);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.user.id).toBe("a1");
    expect(body.user.password).toBeUndefined();
  });

  it("recusa senha errada mesmo com matrícula válida", async () => {
    const res = await login("1234567", "errada");
    expect(res.status).toBe(401);
  });
});
