import { Router } from "express";
import { storage } from "../storage";
import { authenticateJWT, isAuthEnabled, generateToken } from "../auth";
import { insertUserSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { emailService } from "../email";
import rateLimit from "express-rate-limit";

const router = Router();

// Limitadores de taxa
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Muitas tentativas de login. Tente novamente após 15 minutos." },
});

// Password recovery endpoint
router.post("/password-recovery", async (req, res) => {
    try {
        const { usernameOrEmail } = req.body;
        if (!usernameOrEmail) {
            return res.status(400).json({ message: "Username ou email é obrigatório" });
        }

        const user = await storage.getUserByUsernameOrEmailIncludingDeleted(usernameOrEmail);
        if (!user) {
            return res.status(200).json({
                message: "Se existir uma conta para este usuário/email, enviaremos instruções de recuperação."
            });
        }

        const resetCode = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await storage.createPasswordReset(user.id.toString(), resetCode, expiresAt);

        console.log(`[password-recovery] Generated code ${resetCode} for user ${user.username} (ID: ${user.id})`);

        await emailService.sendPasswordResetEmail(user.email, resetCode, user.username);

        res.status(200).json({
            message: "Se existir uma conta para este usuário/email, enviaremos instruções de recuperação."
        });
    } catch (error) {
        console.error('[password-recovery] Error:', error);
        res.status(500).json({ message: "Erro interno do servidor" });
    }
});

// Password reset endpoint
router.post("/password-reset", async (req, res) => {
    try {
        const { usernameOrEmail, code, newPassword } = req.body;

        if (!usernameOrEmail || !code || !newPassword) {
            return res.status(400).json({ message: "Todos os campos são obrigatórios" });
        }

        const user = await storage.getUserByUsernameOrEmailIncludingDeleted(usernameOrEmail);
        if (!user) {
            return res.status(400).json({ message: "Código inválido ou expirado" });
        }

        const resetData = await storage.getPasswordReset(user.id.toString());

        if (!resetData || resetData.code !== code || new Date() > resetData.expiresAt) {
            return res.status(400).json({ message: "Código inválido ou expirado" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await storage.updateUserPassword(user.id.toString(), hashedPassword);

        if (user.deletedAt) {
            await storage.reactivateUser(user.id.toString());
        }

        await storage.deletePasswordReset(user.id.toString());
        res.status(200).json({ message: "Senha redefinida com sucesso" });
    } catch (error) {
        console.error('[password-reset] Error:', error);
        res.status(500).json({ message: "Erro interno do servidor" });
    }
});

// Login
router.post("/auth/login", loginLimiter, async (req, res) => {
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

// Registro público
router.post("/register", async (req, res) => {
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
    } catch (error: any) {
        const code = error?.code || error?.originalError?.code;
        const detail = (error?.detail || error?.message || "").toString().toLowerCase();

        if (code === "23505" || /duplicate|unique constraint|violates unique/i.test(detail)) {
            if (/matricula/.test(detail)) return res.status(409).json({ message: "Matrícula já cadastrada" });
            if (/username/.test(detail)) return res.status(409).json({ message: "Usuário já existe" });
            if (/email/.test(detail)) return res.status(409).json({ message: "Email já cadastrado" });
            return res.status(409).json({ message: "Registro duplicado" });
        }

        console.error("Register user error:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
    }
});

// Alterar própria senha
router.put("/users/me/password", authenticateJWT, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user?.sub) return res.status(401).json({ message: "Unauthorized" });

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres" });
        }

        const dbUser = await storage.getUser(user.sub);
        if (!dbUser) return res.status(404).json({ message: "Usuário não encontrado" });

        const isValidPassword = await bcrypt.compare(currentPassword, dbUser.password);
        if (!isValidPassword) return res.status(401).json({ message: "Senha atual incorreta" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await storage.updateUserPassword(user.sub, hashedPassword);

        res.status(200).json({ message: "Senha alterada com sucesso" });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
    }
});

export default router;
