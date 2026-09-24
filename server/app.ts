// Carrega .env: gerenciado no entry point (index.ts)

import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
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
          // Font Awesome é servido pela própria origem (client/public/vendor/fontawesome);
          // fonts.gstatic.com é o único host externo de fontes (Google Fonts).
          "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
          "frame-ancestors": ["'self'"],
          "img-src": ["'self'", "data:", "https:"],
          "object-src": ["'none'"],
          // Sem scripts inline no app (SPA React, tudo em bundles com <script src>) —
          // 'unsafe-inline' não é necessário e o CDN do Font Awesome foi removido (self-hosted).
          "script-src": ["'self'"],
          "script-src-attr": ["'none'"],
          "style-src": ["'self'", "https://fonts.googleapis.com"],
          // Radix UI (dialog/select/tooltip) define `style` inline via JS para posicionamento
          // dinâmico (Floating UI) — CSP não tem nonce/hash para o atributo `style`, só para
          // <style> como elemento. Por isso o atributo continua liberado, mas style-src (o
          // elemento <style> e folhas externas) já não aceita mais 'unsafe-inline'.
          "style-src-attr": ["'unsafe-inline'"],
          // Permite conexões ao próprio host, WebSocket (dev) e domínios extras via env CSV (CSP_CONNECT_SRC)
          "connect-src": ["'self'", "ws:"].concat(extraConnectSrc as string[]),
        },
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
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
    let isSameOrigin: boolean;
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
    if (!isAllowed) {
      const err: Error & { status?: number } = new Error('Not allowed by CORS');
      err.status = 403;
      return callback(err);
    }
    // origin: true (não a string '*') faz o pacote `cors` refletir de volta
    // exatamente a origem validada da requisição — nunca o literal '*' — o
    // que é obrigatório ao combinar com credentials: true (navegadores
    // recusam a combinação 'Access-Control-Allow-Origin: *' + credenciais).
    return callback(null, { ...corsBaseOptions, origin: true });
  }));

  // Necessário para authenticateJWT ler o token do cookie httpOnly (req.cookies)
  app.use(cookieParser());

  // Body parsers
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  // Access log curto para /api em prod
  // Não captura o corpo da resposta: mesmo não contendo mais o token JWT
  // (agora só em cookie httpOnly, nunca no body), outras rotas podem
  // retornar dados sensíveis, e logar o JSON completo (mesmo truncado)
  // arrisca expor segredos.
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
