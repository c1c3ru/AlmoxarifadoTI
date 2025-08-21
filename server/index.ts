import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Helmet com CSP básica (ajustada)
const extraConnectSrc = (process.env.CSP_CONNECT_SRC || '').split(',').map(s => s.trim()).filter(Boolean);
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
        // Permite inline script temporariamente para compatibilidade com libs/componentes que injetam inline.
        // Em produção ideal: migrar para nonces/hashes e remover 'unsafe-inline'.
        "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'", "'unsafe-inline'", "https:"],
        // Permite conexões ao próprio host, WebSocket (dev) e domínios extras via env CSV (CSP_CONNECT_SRC)
        "connect-src": ["'self'", "ws:", ...extraConnectSrc],
      },
    },
    referrerPolicy: { policy: "no-referrer" },
    frameguard: { action: "sameorigin" },
  })
);

// Configurar CORS (endurecido por ambiente)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || (
  process.env.NODE_ENV === 'production'
    ? ''
    : 'http://localhost:3000,http://localhost:5173,http://localhost:4173,http://localhost:5000'
))
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    const isDev = app.get('env') === 'development';
    if (isDev) {
      // Em desenvolvimento, permite qualquer origem para facilitar Vite/HMR e mesma porta
      return callback(null, true);
    }
    // Produção: permite chamadas server-to-server ou mesma origem sem cabeçalho Origin
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin);
    return callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Limites explícitos de tamanho do corpo da requisição
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    // Log estruturado (sem lançar após responder)
    console.error("[error]", {
      status,
      message,
      stack: app.get("env") === "development" ? err?.stack : undefined,
    });
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
