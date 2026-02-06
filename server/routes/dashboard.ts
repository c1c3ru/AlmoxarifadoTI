import { Router } from "express";
import { storage } from "../storage";
import { authenticateJWT } from "../auth";

const router = Router();

router.get("/stats", authenticateJWT, async (_req, res) => {
    try {
        const stats = await storage.getDashboardStats();
        res.json(stats);
    } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/low-stock", authenticateJWT, async (_req, res) => {
    try {
        const lowStockItems = await storage.getLowStockItems();
        res.json(lowStockItems);
    } catch (error) {
        console.error("Low stock items error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/recent-movements", authenticateJWT, async (_req, res) => {
    try {
        const recentMovements = await storage.getMovements(undefined, 10);
        res.json(recentMovements);
    } catch (error) {
        console.error("Recent movements error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
