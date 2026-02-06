import { Router } from "express";
import { storage } from "../storage";
import { authenticateJWT } from "../auth";
import { insertCategorySchema, insertItemSchema, insertMovementSchema } from "@shared/schema";
import rateLimit from "express-rate-limit";

const router = Router();

const importLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: { message: "Muitas solicitações de importação. Tente novamente em 5 minutos." },
});

// Categories
router.get("/categories", authenticateJWT, async (_req, res) => {
    try {
        const categories = await storage.getAllCategories();
        res.json(categories);
    } catch (error) {
        console.error("Categories error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/categories/with-counts", authenticateJWT, async (_req, res) => {
    try {
        const categoriesWithCounts = await storage.getCategoriesWithItemCount();
        res.json(categoriesWithCounts);
    } catch (error) {
        console.error("Categories with counts error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/categories", authenticateJWT, async (req, res) => {
    try {
        const validation = insertCategorySchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ message: "Invalid category data", errors: validation.error.issues });
        }
        const category = await storage.createCategory(validation.data);
        res.status(201).json(category);
    } catch (error) {
        console.error("Create category error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.put("/categories/:id", authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const validation = insertCategorySchema.partial().safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ message: "Invalid category data", errors: validation.error.issues });
        }
        const category = await storage.updateCategory(id, validation.data);
        if (!category) return res.status(404).json({ message: "Category not found" });
        res.json(category);
    } catch (error) {
        console.error("Update category error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.delete("/categories/:id", authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const success = await storage.deleteCategory(id);
        if (!success) return res.status(404).json({ message: "Category not found" });
        res.status(204).send();
    } catch (error) {
        console.error("Delete category error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Items
router.get("/items", authenticateJWT, async (_req, res) => {
    try {
        const items = await storage.getAllItems();
        res.json(items);
    } catch (error) {
        console.error("Items error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/items/search", authenticateJWT, async (req, res) => {
    try {
        const { q = "", category = "", status = "" } = req.query;
        const items = await storage.searchItems(
            q as string,
            category as string || undefined,
            status as string || undefined
        );
        res.json(items);
    } catch (error) {
        console.error("Search items error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/items/:id", authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const item = await storage.getItem(id);
        if (!item) return res.status(404).json({ message: "Item not found" });
        res.json(item);
    } catch (error) {
        console.error("Get item error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/items", authenticateJWT, async (req, res) => {
    try {
        const validation = insertItemSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ message: "Invalid item data", errors: validation.error.issues });
        }
        const item = await storage.createItem(validation.data);
        res.status(201).json(item);
    } catch (error) {
        console.error("Create item error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.put("/items/:id", authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const validation = insertItemSchema.partial().safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ message: "Invalid item data", errors: validation.error.issues });
        }
        const item = await storage.updateItem(id, validation.data);
        if (!item) return res.status(404).json({ message: "Item not found" });
        res.json(item);
    } catch (error) {
        console.error("Update item error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.delete("/items/:id", authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const success = await storage.deleteItem(id);
        if (!success) return res.status(404).json({ message: "Item not found" });
        res.status(204).send();
    } catch (error) {
        console.error("Delete item error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Movements
router.get("/movements", authenticateJWT, async (req, res) => {
    try {
        const { itemId, limit } = req.query;
        const movements = await storage.getMovements(
            itemId as string || undefined,
            limit ? parseInt(limit as string) : undefined
        );
        res.json(movements);
    } catch (error) {
        console.error("Movements error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/movements", authenticateJWT, async (req, res) => {
    try {
        const validation = insertMovementSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ message: "Invalid movement data", errors: validation.error.issues });
        }

        if (validation.data.type === "saida") {
            const item = await storage.getItem(validation.data.itemId);
            if (!item) return res.status(404).json({ message: "Item not found" });
            if (item.currentStock < validation.data.quantity) {
                return res.status(400).json({
                    message: "Insufficient stock",
                    available: item.currentStock,
                    requested: validation.data.quantity
                });
            }
        }

        const movement = await storage.createMovement(validation.data);
        res.status(201).json(movement);
    } catch (error) {
        console.error("Create movement error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// CSV Export/Import
router.get("/inventory/export", authenticateJWT, async (_req, res) => {
    try {
        const items = await storage.getAllItems();
        const headers = ['Código Interno', 'Nome', 'Descrição', 'Categoria', 'Estoque Atual', 'Estoque Mínimo', 'Localização', 'Status', 'Data Criação'];
        const csvData = items.map(item => [
            item.internalCode,
            `"${item.name}"`,
            `""`,
            `"${item.category?.name || ''}"`,
            item.currentStock,
            item.minStock,
            `"${item.location || ''}"`,
            item.status,
            new Date(item.createdAt).toLocaleDateString('pt-BR')
        ].join(','));
        const csv = [headers.join(','), ...csvData].join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=inventario-${new Date().toISOString().split('T')[0]}.csv`);
        res.send('\ufeff' + csv);
    } catch (error) {
        console.error("CSV export error:", error);
        res.status(500).json({ message: "Erro ao exportar inventário" });
    }
});

router.post("/inventory/import", authenticateJWT, importLimiter, async (req, res) => {
    try {
        const { csvData, categoryId } = req.body;
        if (!csvData || !categoryId) return res.status(400).json({ message: "Dados CSV e categoria são obrigatórios" });

        // Robust CSV parsing logic (same as before)
        const data = csvData.replace(/^\uFEFF/, "");
        const rows: string[][] = [];
        let current: string[] = [];
        let field = "";
        let inQuotes = false;
        for (let idx = 0; idx < data.length; idx++) {
            const ch = data[idx];
            const next = data[idx + 1];
            if (ch === '"') {
                if (inQuotes && next === '"') { field += '"'; idx++; } else { inQuotes = !inQuotes; }
            } else if (ch === ',' && !inQuotes) {
                current.push(field.trim()); field = "";
            } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
                if (field.length > 0 || current.length > 0) {
                    current.push(field.trim()); rows.push(current);
                    current = []; field = "";
                }
                if (ch === '\r' && next === '\n') idx++;
            } else { field += ch; }
        }
        if (field.length > 0 || current.length > 0) { current.push(field.trim()); rows.push(current); }

        const filtered = rows.filter(r => r.some(c => c && c.trim().length > 0));
        if (filtered.length === 0) return res.status(400).json({ message: "CSV vazio" });

        const header = filtered[0].map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
        const body = filtered.slice(1);
        const results = { success: 0, errors: [] as string[] };
        const isExportFormat = header.includes('código interno') || header.includes('codigo interno');
        const isTemplateFormat = header[0] === 'nome' && header.includes('estoque atual');

        for (let i = 0; i < body.length; i++) {
            try {
                const cols = body[i].map(c => c.replace(/^"|"$/g, ''));
                let name = "";
                let currentStockStr = "";
                let minStockStr = "";
                let location = "";

                if (isExportFormat) {
                    const map: Record<string, number> = {};
                    header.forEach((h, idx) => { map[h] = idx; });
                    name = cols[map['nome']];
                    currentStockStr = cols[map['estoque atual']];
                    minStockStr = cols[map['estoque mínimo']] ?? cols[map['estoque minimo']];
                    location = cols[map['localização']] ?? cols[map['localizacao']] ?? '';
                } else if (isTemplateFormat) {
                    name = cols[0]; currentStockStr = cols[2]; minStockStr = cols[3]; location = cols[4] ?? '';
                } else {
                    name = cols[0]; currentStockStr = cols[2] ?? cols[1] ?? '0'; minStockStr = cols[3] ?? '0'; location = cols[4] ?? '';
                }

                const currentStock = parseInt((currentStockStr || '0').replace(/\D/g, '')) || 0;
                const minStock = parseInt((minStockStr || '0').replace(/\D/g, '')) || 0;

                if (!name?.trim()) throw new Error("Nome do item não informado");

                await storage.createItem({
                    name: name.trim(),
                    categoryId,
                    currentStock,
                    minStock,
                    location: location?.trim() || '',
                    status: 'disponivel',
                });
                results.success++;
            } catch (err: any) {
                results.errors.push(`Linha ${i + 2}: ${err.message}`);
            }
        }
        res.json(results);
    } catch (error) {
        console.error("CSV import error:", error);
        res.status(500).json({ message: "Erro ao importar inventário" });
    }
});

export default router;
