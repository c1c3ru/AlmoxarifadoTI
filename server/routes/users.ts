import { Router } from "express";
import { storage } from "../storage";
import { authenticateJWT } from "../auth";
import { insertUserSchema } from "@shared/schema";

const router = Router();

// Admin: Listar usuários
router.get("/", authenticateJWT, async (_req, res) => {
    try {
        const users = await storage.getAllUsers();
        const usersWithoutPasswords = users.map(({ password, ...user }) => user);
        res.json(usersWithoutPasswords);
    } catch (error) {
        console.error("Users error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Admin: Criar usuário
router.post("/", authenticateJWT, async (req, res) => {
    try {
        const validation = insertUserSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ message: "Invalid user data", errors: validation.error.issues });
        }

        const user = await storage.createUser(validation.data);
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    } catch (error: any) {
        const code = error?.code || error?.originalError?.code;
        const detail = (error?.detail || error?.message || "").toString().toLowerCase();

        if (code === "23505" || /duplicate|unique constraint|violates unique/i.test(detail)) {
            if (/matricula/.test(detail)) return res.status(409).json({ message: "Matrícula já cadastrada" });
            if (/username/.test(detail)) return res.status(409).json({ message: "Usuário já existe" });
            if (/email/.test(detail)) return res.status(409).json({ message: "Email já cadastrado" });
            return res.status(409).json({ message: "Registro duplicado" });
        }

        console.error("Create user error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Admin: Atualizar usuário
router.put("/:id", authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const validation = insertUserSchema.partial().safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({ message: "Invalid user data", errors: validation.error.issues });
        }

        const updateData = { ...validation.data };
        if (!updateData.password) delete updateData.password;

        const user = await storage.updateUser(id, updateData);
        if (!user) return res.status(404).json({ message: "User not found" });

        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error: any) {
        const code = error?.code || error?.originalError?.code;
        const detail = (error?.detail || error?.message || "").toString().toLowerCase();

        if (code === "23505" || /duplicate|unique constraint|violates unique/i.test(detail)) {
            if (/matricula/.test(detail)) return res.status(409).json({ message: "Matrícula já cadastrada" });
            if (/username/.test(detail)) return res.status(409).json({ message: "Usuário já existe" });
            if (/email/.test(detail)) return res.status(409).json({ message: "Email já cadastrado" });
            return res.status(409).json({ message: "Registro duplicado" });
        }

        console.error("Update user error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Admin: Deletar usuário
router.delete("/:id", authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = (req as any).user;
        if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

        if (currentUser.role !== "admin") {
            return res.status(403).json({ message: "Apenas administradores podem deletar usuários" });
        }

        if (currentUser.sub === id) {
            return res.status(400).json({ message: "Você não pode deletar sua própria conta" });
        }

        const userToDelete = await storage.getUser(id);
        if (!userToDelete) return res.status(404).json({ message: "Usuário não encontrado" });

        const result = await storage.deleteUser(id);
        if (!result.success) return res.status(404).json({ message: "Usuário não encontrado" });

        if (result.softDelete) {
            return res.status(200).json({
                message: "Usuário desativado com sucesso. Como ele possui movimentações registradas, o registro foi mantido no sistema para preservar o histórico.",
                softDelete: true
            });
        }

        res.status(204).send();
    } catch (error: any) {
        console.error("Delete user error:", error);
        res.status(500).json({ message: error?.message || "Erro interno do servidor" });
    }
});

export default router;
