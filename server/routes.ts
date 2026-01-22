import type { Express } from "express";
import { createServer, type Server } from "http";
import { authenticateJWT, isAuthEnabled, generateToken } from "./auth";
import { storage } from "./storage";
import { emailService } from "./email";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  insertUserSchema, insertCategorySchema, insertItemSchema, insertMovementSchema
} from "@shared/schema";
import rateLimit from "express-rate-limit";

export async function registerRoutes(app: Express): Promise<Server> {
  // Rate limiters
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Muitas tentativas. Tente novamente mais tarde." },
  });

  // Lista de usuários online com última atividade
  app.get("/api/users/online", authenticateJWT, async (req, res) => {
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
  app.post("/api/heartbeat", authenticateJWT, async (req, res) => {
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

  const importLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Muitas importações. Tente novamente mais tarde." },
  });
  // Authentication 
  // Temporary storage for password reset codes (in production, use Redis or database)
  const resetCodes = new Map<string, { code: string; expires: number; userId: string; username: string; email: string }>();

  // Password recovery endpoint
  app.post("/api/password-recovery", async (req, res) => {
    try {
      const { usernameOrEmail } = req.body;

      if (!usernameOrEmail) {
        return res.status(400).json({ message: "Username ou email é obrigatório" });
      }

      // Find user by username or email (incluindo deletados para permitir reset de senha)
      const user = await storage.getUserByUsernameOrEmailIncludingDeleted(usernameOrEmail);

      if (!user) {
        // Don't reveal if user exists or not for security
        return res.status(200).json({
          message: "Se existir uma conta para este usuário/email, enviaremos instruções de recuperação."
        });
      }

      // Generate 6-digit reset code
      const resetCode = crypto.randomInt(100000, 999999).toString();
      const expires = Date.now() + 60 * 60 * 1000; // 60 minutes

      // Store reset code using the user ID as key to avoid username/email mismatch issues
      resetCodes.set(user.id.toString(), { code: resetCode, expires, userId: user.id.toString(), username: user.username, email: user.email });

      // Debug log
      console.log(`[password-recovery] Generated code ${resetCode} for user ${user.username} (ID: ${user.id})`);

      // Send email
      const emailSent = await emailService.sendPasswordResetEmail(user.email, resetCode, user.username);

      if (!emailSent) {
        console.error('[password-recovery] Failed to send email to:', user.email);
        return res.status(500).json({ message: "Erro interno. Tente novamente mais tarde." });
      }

      res.status(200).json({
        message: "Se existir uma conta para este usuário/email, enviaremos instruções de recuperação."
      });
    } catch (error) {
      console.error('[password-recovery] Error:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Password reset endpoint
  app.post("/api/password-reset", async (req, res) => {
    try {
      const { usernameOrEmail, code, newPassword } = req.body;

      console.log(`[password-reset] === RESET ATTEMPT START ===`);
      console.log(`[password-reset] Request body:`, { usernameOrEmail, code: code ? `${code.length} chars` : 'undefined', newPassword: newPassword ? 'provided' : 'undefined' });
      console.log(`[password-reset] All stored reset codes:`, Array.from(resetCodes.entries()));

      if (!usernameOrEmail || !code || !newPassword) {
        console.log(`[password-reset] Missing required fields`);
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }

      // Find the user by username or email (incluindo deletados para permitir reset de senha)
      const user = await storage.getUserByUsernameOrEmailIncludingDeleted(usernameOrEmail);

      if (!user) {
        console.log(`[password-reset] User not found: ${usernameOrEmail}`);
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }

      // Check if reset code exists and is valid using user ID
      const resetData = resetCodes.get(user.id.toString());
      console.log(`[password-reset] Attempting reset for user: ${usernameOrEmail} (ID: ${user.id})`);
      console.log(`[password-reset] Provided code: "${code}" (type: ${typeof code})`);
      console.log(`[password-reset] Stored data:`, resetData);
      console.log(`[password-reset] Current time: ${Date.now()}, Expires: ${resetData?.expires}`);

      if (!resetData) {
        console.log(`[password-reset] No reset data found for user ID: ${user.id}`);
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }

      if (resetData.code !== code) {
        console.log(`[password-reset] Code mismatch - stored: "${resetData.code}" (type: ${typeof resetData.code}), provided: "${code}" (type: ${typeof code})`);
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }

      if (Date.now() > resetData.expires) {
        console.log(`[password-reset] Code expired - current: ${Date.now()}, expires: ${resetData.expires}`);
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }

      console.log(`[password-reset] All validations passed, updating password`);

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await storage.updateUserPassword(resetData.userId, hashedPassword);

      // Se o usuário estava deletado (soft delete), reativá-lo ao resetar senha
      if (user.deletedAt) {
        await storage.reactivateUser(resetData.userId);
        console.log(`[password-reset] User reactivated after password reset: ${usernameOrEmail}`);
      }

      // Remove used reset code
      resetCodes.delete(user.id.toString());

      console.log(`[password-reset] Password reset successful for user: ${usernameOrEmail}`);
      res.status(200).json({ message: "Senha redefinida com sucesso" });
    } catch (error) {
      console.error('[password-reset] Error:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota de login
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
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

      if (isAuthEnabled()) {
        const token = generateToken({
          sub: user.id,
          username: user.username,
          role: user.role,
        });
        return res.json({ user: userWithoutPassword, token });
      }

      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", authenticateJWT, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/low-stock", authenticateJWT, async (req, res) => {
    try {
      const lowStockItems = await storage.getLowStockItems();
      res.json(lowStockItems);
    } catch (error) {
      console.error("Low stock items error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/recent-movements", authenticateJWT, async (req, res) => {
    try {
      const recentMovements = await storage.getMovements(undefined, 10);
      res.json(recentMovements);
    } catch (error) {
      console.error("Recent movements error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Categories routes
  app.get("/api/categories", authenticateJWT, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      // Debug: log how many categories and their names to diagnose discrepancies
      try {
        console.log("[GET /api/categories] count=", categories.length, "names=", categories.map(c => c.name));
      } catch { }
      res.json(categories);
    } catch (error) {
      console.error("Categories error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/categories/with-counts", authenticateJWT, async (req, res) => {
    try {
      const categoriesWithCounts = await storage.getCategoriesWithItemCount();
      res.json(categoriesWithCounts);
    } catch (error) {
      console.error("Categories with counts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/categories", authenticateJWT, async (req, res) => {
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

  app.put("/api/categories/:id", authenticateJWT, async (req, res) => {
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

  app.delete("/api/categories/:id", authenticateJWT, async (req, res) => {
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
  app.get("/api/items", authenticateJWT, async (req, res) => {
    try {
      const items = await storage.getAllItems();
      res.json(items);
    } catch (error) {
      console.error("Items error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/items/search", authenticateJWT, async (req, res) => {
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

  app.get("/api/items/by-code/:code", authenticateJWT, async (req, res) => {
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

  app.get("/api/items/:id", authenticateJWT, async (req, res) => {
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

  app.post("/api/items", authenticateJWT, async (req, res) => {
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

  app.put("/api/items/:id", authenticateJWT, async (req, res) => {
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

  app.delete("/api/items/:id", authenticateJWT, async (req, res) => {
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
  app.get("/api/movements", authenticateJWT, async (req, res) => {
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

  app.post("/api/movements", authenticateJWT, async (req, res) => {
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
  app.get("/api/users", authenticateJWT, async (req, res) => {
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

  // Rota pública para registro de novos usuários (não requer autenticação)
  app.post("/api/register", async (req, res) => {
    try {
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: validation.error.issues });
      }

      const user = await storage.createUser(validation.data);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({
        message: "Usuário cadastrado com sucesso",
        user: userWithoutPassword
      });
    } catch (error) {
      // Tratamento específico para violações de UNIQUE (Postgres code 23505)
      const anyErr = error as any;
      const code = anyErr?.code || anyErr?.originalError?.code;
      const detail: string = (anyErr?.detail || anyErr?.message || "").toString();
      const constraint: string = (anyErr?.constraint || "").toString();

      if (code === "23505" || /duplicate|unique constraint|violates unique/i.test(detail)) {
        // Tentar identificar qual campo violou
        const msg = detail.toLowerCase() + " " + constraint.toLowerCase();
        if (/matricula/.test(msg)) {
          return res.status(409).json({ message: "Matrícula já cadastrada" });
        }
        if (/username/.test(msg)) {
          return res.status(409).json({ message: "Usuário já existe" });
        }
        if (/email/.test(msg)) {
          return res.status(409).json({ message: "Email já cadastrado" });
        }
        return res.status(409).json({ message: "Registro duplicado" });
      }

      console.error("Register user error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para criação de usuários por admin (requer autenticação)
  app.post("/api/users", authenticateJWT, async (req, res) => {
    try {
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid user data", errors: validation.error.issues });
      }

      const user = await storage.createUser(validation.data);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      // Tratamento específico para violações de UNIQUE (Postgres code 23505)
      const anyErr = error as any;
      const code = anyErr?.code || anyErr?.originalError?.code;
      const detail: string = (anyErr?.detail || anyErr?.message || "").toString();
      const constraint: string = (anyErr?.constraint || "").toString();

      if (code === "23505" || /duplicate|unique constraint|violates unique/i.test(detail)) {
        // Tentar identificar qual campo violou
        const msg = detail.toLowerCase() + " " + constraint.toLowerCase();
        if (/matricula/.test(msg)) {
          return res.status(409).json({ message: "Matrícula já cadastrada" });
        }
        if (/username/.test(msg)) {
          return res.status(409).json({ message: "Usuário já existe" });
        }
        if (/email/.test(msg)) {
          return res.status(409).json({ message: "Email já cadastrado" });
        }
        return res.status(409).json({ message: "Registro duplicado" });
      }

      console.error("Create user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rota para usuário alterar sua própria senha
  app.put("/api/users/me/password", authenticateJWT, async (req, res) => {
    try {
      const user = (req as any).user as { sub: string } | undefined;
      if (!user?.sub) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres" });
      }

      // Buscar usuário e verificar senha atual
      const dbUser = await storage.getUser(user.sub);
      if (!dbUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, dbUser.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Senha atual incorreta" });
      }

      // Atualizar senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.sub, hashedPassword);

      res.status(200).json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para atualizar usuário
  app.put("/api/users/:id", authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const validation = insertUserSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid user data", errors: validation.error.issues });
      }

      // Se password está presente e vazio, remover do update
      const updateData = { ...validation.data };
      if (updateData.password === "" || updateData.password === null || updateData.password === undefined) {
        delete updateData.password;
      }

      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      const anyErr = error as any;
      const code = anyErr?.code || anyErr?.originalError?.code;
      const detail: string = (anyErr?.detail || anyErr?.message || "").toString();
      const constraint: string = (anyErr?.constraint || "").toString();

      if (code === "23505" || /duplicate|unique constraint|violates unique/i.test(detail)) {
        const msg = detail.toLowerCase() + " " + constraint.toLowerCase();
        if (/matricula/.test(msg)) {
          return res.status(409).json({ message: "Matrícula já cadastrada" });
        }
        if (/username/.test(msg)) {
          return res.status(409).json({ message: "Usuário já existe" });
        }
        if (/email/.test(msg)) {
          return res.status(409).json({ message: "Email já cadastrado" });
        }
        return res.status(409).json({ message: "Registro duplicado" });
      }

      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Rota para deletar usuário
  app.delete("/api/users/:id", authenticateJWT, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user as { sub: string; role: string } | undefined;

      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verificar se é admin
      if (currentUser.role !== "admin") {
        return res.status(403).json({ message: "Apenas administradores podem deletar usuários" });
      }

      // Não permitir que o admin delete a si mesmo
      if (currentUser.sub === id) {
        return res.status(400).json({ message: "Você não pode deletar sua própria conta" });
      }

      // Verificar se o usuário existe antes de tentar deletar
      const userToDelete = await storage.getUser(id);
      if (!userToDelete) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const result = await storage.deleteUser(id);
      if (!result.success) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Se foi soft delete (desativado), retornar mensagem informativa
      if (result.softDelete) {
        return res.status(200).json({
          message: "Usuário desativado com sucesso. Como ele possui movimentações registradas, o registro foi mantido no sistema para preservar o histórico.",
          softDelete: true
        });
      }

      // Se foi hard delete (deletado fisicamente)
      res.status(204).send();
    } catch (error: any) {
      console.error("Delete user error:", error);
      res.status(500).json({
        message: error?.message || "Erro interno do servidor",
        error: process.env.NODE_ENV === "development" ? String(error) : undefined
      });
    }
  });

  // CSV Export/Import routes
  app.get("/api/inventory/export", authenticateJWT, async (req, res) => {
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
        // schema não possui 'description'; exporta vazio para manter compatibilidade de colunas
        `""`,
        `"${item.category?.name || ''}"`,
        item.currentStock,
        item.minStock,
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

  app.post("/api/inventory/import", authenticateJWT, importLimiter, async (req, res) => {
    try {
      const { csvData, categoryId } = req.body;

      if (!csvData || !categoryId) {
        return res.status(400).json({ message: "Dados CSV e categoria são obrigatórios" });
      }

      // Robust CSV parsing (supports quoted commas and BOM)
      const data = csvData.replace(/^\uFEFF/, "");
      const rows: string[][] = [];
      let current: string[] = [];
      let field = "";
      let inQuotes = false;
      for (let idx = 0; idx < data.length; idx++) {
        const ch = data[idx];
        const next = data[idx + 1];
        if (ch === '"') {
          if (inQuotes && next === '"') { // escaped quote
            field += '"';
            idx++; // skip next
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          current.push(field.trim());
          field = "";
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
          if (field.length > 0 || current.length > 0) {
            current.push(field.trim());
            rows.push(current);
            current = [];
            field = "";
          }
          // handle CRLF by skipping the LF after CR
          if (ch === '\r' && next === '\n') idx++;
        } else {
          field += ch;
        }
      }
      if (field.length > 0 || current.length > 0) {
        current.push(field.trim());
        rows.push(current);
      }

      // Remove empty rows
      const filtered = rows.filter(r => r.some(c => c && c.trim().length > 0));
      if (filtered.length === 0) {
        return res.status(400).json({ message: "CSV vazio" });
      }

      const header = filtered[0].map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
      const body = filtered.slice(1);

      const results = { success: 0, errors: [] as string[] };

      // Detect format by headers
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
            // Export columns: [Código Interno, Nome, Descrição, Categoria, Estoque Atual, Estoque Mínimo, Localização, Status, Data Criação]
            // Map only the fields we need
            const map: Record<string, number> = {};
            header.forEach((h, idx) => { map[h] = idx; });
            name = cols[map['nome']];
            currentStockStr = cols[map['estoque atual']];
            minStockStr = cols[map['estoque mínimo']] ?? cols[map['estoque minimo']];
            location = cols[map['localização']] ?? cols[map['localizacao']] ?? '';
          } else if (isTemplateFormat) {
            // Template columns: [Nome, Descrição, Estoque Atual, Estoque Mínimo, Localização]
            name = cols[0];
            currentStockStr = cols[2];
            minStockStr = cols[3];
            location = cols[4] ?? '';
          } else {
            // Fallback: try by position like template
            name = cols[0];
            currentStockStr = cols[2] ?? cols[1] ?? '0';
            minStockStr = cols[3] ?? '0';
            location = cols[4] ?? '';
          }

          const currentStock = Number.parseInt((currentStockStr || '0').toString().replace(/\D/g, '')) || 0;
          const minStock = Number.parseInt((minStockStr || '0').toString().replace(/\D/g, '')) || 0;

          if (!name || name.trim().length === 0) {
            throw new Error("Nome do item não informado");
          }

          const itemData = {
            name: name.trim(),
            categoryId,
            currentStock,
            minStock,
            location: location?.trim() || '',
            status: 'disponivel' as const,
          };

          await storage.createItem(itemData);
          results.success++;
        } catch (error) {
          results.errors.push(`Linha ${i + 2}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
