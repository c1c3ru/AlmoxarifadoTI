import { Express } from "express";
import { createServer, Server } from "http";
import authRouter from "./auth";
import inventoryRouter from "./inventory";
import usersRouter from "./users";
import dashboardRouter from "./dashboard";
import activityRouter from "./activity";

export async function registerRoutes(app: Express): Promise<Server> {
    // Rotas de Autenticação e Perfil
    app.use("/api", authRouter);

    // Rotas de Atividade (Heartbeat, Online)
    app.use("/api", activityRouter);

    // Rotas de Inventário
    app.use("/api", inventoryRouter);

    // Rotas de Gestão de Usuários (Admin)
    app.use("/api/users", usersRouter);

    // Rotas de Dashboard
    app.use("/api/dashboard", dashboardRouter);

    const httpServer = createServer(app);
    return httpServer;
}
