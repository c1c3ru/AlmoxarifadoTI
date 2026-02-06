import { Router } from "express";
import { storage } from "../storage";
import { authenticateJWT } from "../auth";

const router = Router();

// Lista de usuários online com última atividade
router.get("/users/online", authenticateJWT, async (req, res) => {
    try {
        const windowMinutes = Number(req.query.windowMinutes || 10);
        const online = await storage.getOnlineUsers(windowMinutes);
        res.json(online);
    } catch (error) {
        console.error("Get online users error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Heartbeat para presença online
router.post("/heartbeat", authenticateJWT, async (req, res) => {
    try {
        const user = (req as any).user as { sub: string } | undefined;
        if (!user?.sub) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        await storage.updateUserLastSeen(user.sub);
        return res.status(204).send();
    } catch (error) {
        console.error("Heartbeat error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
