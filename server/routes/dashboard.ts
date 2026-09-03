import { Router } from "express";
import { storage } from "../storage";
import { authenticateJWT } from "../auth";
import { logError } from "../logger";

const router = Router();

router.get("/stats", authenticateJWT, async (_req, res) => {
    try {
        const stats = await storage.getDashboardStats();
        res.json(stats);
    } catch (error) {
        logError("Dashboard stats error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/low-stock", authenticateJWT, async (_req, res) => {
    try {
        const lowStockItems = await storage.getLowStockItems();
        res.json(lowStockItems);
    } catch (error) {
        logError("Low stock items error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/recent-movements", authenticateJWT, async (_req, res) => {
    try {
        const recentMovements = await storage.getMovements(undefined, 10);
        res.json(recentMovements);
    } catch (error) {
        logError("Recent movements error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/consumption", authenticateJWT, async (_req, res) => {
    try {
        const consumption = await storage.getItemConsumption();
        res.json(consumption);
    } catch (error) {
        logError("Consumption dashboard error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
