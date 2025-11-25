// Carrega .env apenas em desenvolvimento, não em produção (Vercel)
if (process.env.NODE_ENV !== "production") {
  require("dotenv/config");
}

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
// Avoid importing Vite in serverless runtime. Provide a minimal logger here.
function log(message: string) {
  try {
    const ts = new Date().toISOString();
    console.log(`${ts} [api] ${message}`);
  } catch {}
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
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin);
      return callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  // Body parsers
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  // Access log curto para /api em prod
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json.bind(res);
    (res as any).json = function (bodyJson: any) {
      capturedJsonResponse = bodyJson;
      return originalResJson(bodyJson);
    } as any;

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          try { logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`; } catch {}
        }
        if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
        log(logLine);
      }
    });

    next();
  });

  // Registra rotas API e retorna httpServer (descartado em serverless)
  await registerRoutes(app);

  // Em dev local com Vite, o caller decide se chama setupVite/serveStatic
  return app;
}

// Helper para ambiente de desenvolvimento local
export async function createDevServer() {
  const app = await createApp();
  const server = (await import("http")).createServer(app);
  return { app, server } as const;
}
