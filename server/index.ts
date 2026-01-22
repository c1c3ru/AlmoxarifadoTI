// Carrega .env apenas em desenvolvimento, não em produção (Vercel)
import type { Request, Response, NextFunction } from "express";

(async () => {
  if (process.env.NODE_ENV !== "production") {
    // Dynamic import to avoid ESM top-level await/require issues and ensure env vars are loaded BEFORE app imports
    await import("dotenv/config");
  }

  // Import after env vars are loaded
  const { setupVite, serveStatic, log } = await import("./vite");
  const { createDevServer } = await import("./app");

  const { app, server } = await createDevServer();

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
