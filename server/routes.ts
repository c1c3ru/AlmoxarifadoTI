import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { 
  insertUserSchema, insertCategorySchema, insertItemSchema, insertMovementSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Don't send password in response
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/low-stock", async (req, res) => {
    try {
      const lowStockItems = await storage.getLowStockItems();
      res.json(lowStockItems);
    } catch (error) {
      console.error("Low stock items error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/recent-movements", async (req, res) => {
    try {
      const recentMovements = await storage.getMovements(undefined, 10);
      res.json(recentMovements);
    } catch (error) {
      console.error("Recent movements error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Categories error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/categories", async (req, res) => {
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

  app.put("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validation = insertCategorySchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid category data", errors: validation.error.issues });
      }

      const category = await storage.updateCategory(id, validation.data);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json(category);
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCategory(id);
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Items routes
  app.get("/api/items", async (req, res) => {
    try {
      const items = await storage.getAllItems();
      res.json(items);
    } catch (error) {
      console.error("Items error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/items/search", async (req, res) => {
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

  app.get("/api/items/by-code/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const item = await storage.getItemByCode(code);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Get item by code error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getItem(id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Get item error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/items", async (req, res) => {
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

  app.put("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validation = insertItemSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid item data", errors: validation.error.issues });
      }

      const item = await storage.updateItem(id, validation.data);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Update item error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteItem(id);
      if (!success) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Delete item error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Movements routes
  app.get("/api/movements", async (req, res) => {
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

  app.post("/api/movements", async (req, res) => {
    try {
      const validation = insertMovementSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid movement data", errors: validation.error.issues });
      }

      // Validate stock for withdrawal
      if (validation.data.type === "saida") {
        const item = await storage.getItem(validation.data.itemId);
        if (!item) {
          return res.status(404).json({ message: "Item not found" });
        }
        
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

  // Users routes (admin only in real implementation)
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid user data", errors: validation.error.issues });
      }

      const user = await storage.createUser(validation.data);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // CSV Export/Import routes
  app.get("/api/inventory/export", async (req, res) => {
    try {
      const items = await storage.getAllItems();
      
      // Convert items to CSV format
      const csvHeaders = [
        'Código Interno',
        'Nome',
        'Descrição', 
        'Categoria',
        'Estoque Atual',
        'Estoque Mínimo',
        'Localização',
        'Status',
        'Data Criação'
      ];
      
      const csvData = items.map(item => [
        item.internalCode,
        `"${item.name}"`,
        `"${item.description || ''}"`,
        `"${item.category?.name || ''}"`,
        item.currentStock,
        item.minimumStock,
        `"${item.location || ''}"`,
        item.status,
        new Date(item.createdAt).toLocaleDateString('pt-BR')
      ].join(','));
      
      const csv = [csvHeaders.join(','), ...csvData].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=inventario-${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\ufeff' + csv); // BOM for Excel compatibility
    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({ message: "Erro ao exportar inventário" });
    }
  });

  app.post("/api/inventory/import", async (req, res) => {
    try {
      const { csvData, categoryId } = req.body;
      
      if (!csvData || !categoryId) {
        return res.status(400).json({ message: "Dados CSV e categoria são obrigatórios" });
      }

      const lines = csvData.split('\n').filter((line: string) => line.trim());
      const results = {
        success: 0,
        errors: [] as string[]
      };

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const columns = line.split(',').map((col: string) => col.replace(/^"(.*)"$/, '$1').trim());
          
          if (columns.length < 4) {
            results.errors.push(`Linha ${i + 1}: Formato inválido - necessário pelo menos 4 colunas`);
            continue;
          }

          const [name, description, currentStock, minimumStock, location] = columns;
          
          const itemData = {
            name: name || `Item ${i}`,
            description: description || '',
            categoryId,
            currentStock: parseInt(currentStock) || 0,
            minimumStock: parseInt(minimumStock) || 1,
            location: location || '',
            status: 'ativo' as const
          };

          await storage.createItem(itemData);
          results.success++;
        } catch (error) {
          results.errors.push(`Linha ${i + 1}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ message: "Erro ao importar inventário" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
