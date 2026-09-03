// Carrega .env: gerenciado no entry point (index.ts)

import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { logError } from "./logger";
// Avoid importing Vite in serverless runtime. Provide a minimal logger here.
function log(message: string) {
  try {
    const ts = new Date().toISOString();
    console.log(`${ts} [api] ${message}`);
  } catch { }
}

export async function createApp() {
  const app = express();

  // Confiar no proxy da Vercel/edge para que req.ip e X-Forwarded-For funcionem corretamente
  // Necessário para express-rate-limit evitar validação ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
  app.set("trust proxy", 1);

  // Helmet com CSP básica (ajustada)
  const extraConnectSrc = (process.env.CSP_CONNECT_SRC || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "base-uri": ["'self'"],
          "block-all-mixed-content": [],
          "font-src": ["'self'", "https:", "data:"],
          "frame-ancestors": ["'self'"],
          "img-src": ["'self'", "data:", "https:"],
          "object-src": ["'none'"],
          // Em produção ideal: migrar para nonces/hashes e remover 'unsafe-inline'.
          "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
          "script-src-attr": ["'none'"],
          "style-src": ["'self'", "'unsafe-inline'", "https:"],
          // Permite conexões ao próprio host, WebSocket (dev) e domínios extras via env CSV (CSP_CONNECT_SRC)
          "connect-src": ["'self'", "ws:"].concat(extraConnectSrc as string[]),
        },
      },
      referrerPolicy: { policy: "no-referrer" },
      frameguard: { action: "sameorigin" },
    })
  );

  // CORS
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  const corsBaseOptions = {
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
  app.use(cors((req, callback) => {
    const origin = req.headers.origin;
    if (!origin) return callback(null, { ...corsBaseOptions, origin: true });

    // O próprio front-end da aplicação (mesmo host da API — caso de todo
    // deploy na Vercel: produção e cada preview, cada um com domínio
    // próprio) nunca deve ser bloqueado por CORS: não é uma origem
    // "externa", e exigir ALLOWED_ORIGINS pra cada domínio de preview não
    // é viável. Comparar contra o Host da própria requisição cobre isso
    // sem depender de configuração alguma.
    let isSameOrigin = false;
    try {
      isSameOrigin = new URL(origin).host === req.headers.host;
    } catch {
      isSameOrigin = false;
    }

    // 🔒 SECURITY: sem ALLOWED_ORIGINS configurado, nega por padrão em
    // produção (só libera geral em desenvolvimento, por conveniência).
    const isAllowed = isSameOrigin || (allowedOrigins.length === 0
      ? process.env.NODE_ENV !== 'production'
      : allowedOrigins.includes(origin));
    if (!isAllowed) return callback(new Error('Not allowed by CORS'));
    return callback(null, { ...corsBaseOptions, origin: true });
  }));

  // Body parsers
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  // Access log curto para /api em prod
  // Não captura o corpo da resposta: respostas de auth podem conter o token
  // JWT, e logar o JSON completo (mesmo truncado) arrisca expor segredos.
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      }
    });

    next();
  });

  // Registra rotas API e retorna httpServer (descartado em serverless)
  await registerRoutes(app);

  // Middleware de erro central: precisa vir por último. Cobre qualquer erro
  // não tratado por um try/catch de rota (ex.: JSON malformado no body, um
  // throw síncrono em middleware) — tanto em dev quanto no runtime serverless
  // da Vercel (api/index.ts usa só createApp(), nunca server/index.ts).
  // Nunca repassa err.message/err.stack ao cliente.
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logError("[error]", err);
    if (res.headersSent) return;
    const status = typeof err?.status === "number"
      ? err.status
      : typeof err?.statusCode === "number"
        ? err.statusCode
        : 500;
    res.status(status).json({ message: "Internal server error" });
  });

  // Em dev local com Vite, o caller decide se chama setupVite/serveStatic
  return app;
}

// Helper para ambiente de desenvolvimento local
export async function createDevServer() {
  const app = await createApp();
  const server = (await import("http")).createServer(app);
  return { app, server } as const;
}
