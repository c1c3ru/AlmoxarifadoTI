import { Router } from "express";
import { storage } from "../storage";
import { authenticateJWT, generateToken, setAuthCookie, clearAuthCookie } from "../auth";
import { insertUserSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { logError } from "../logger";

const router = Router();

// Limitadores de taxa
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Muitas tentativas de login. Tente novamente após 15 minutos." },
});

// Limitador para o registro público
const sensitiveActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Muitas solicitações. Tente novamente após 15 minutos." },
});

// Login
router.post("/auth/login", loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        // Aceita usuário, e-mail ou matrícula: muita gente digita o nome, a
        // matrícula ou o e-mail com maiúsculas em vez do username exato.
        const identifier = String(username).trim();
        const candidates = await storage.getUsersForLogin(identifier);
        // Username exato primeiro; depois contas ativas antes das pendentes.
        candidates.sort((a, b) =>
            Number(b.username === identifier) - Number(a.username === identifier) ||
            Number(b.isActive) - Number(a.isActive)
        );

        let user: (typeof candidates)[number] | undefined;
        for (const candidate of candidates) {
            if (await bcrypt.compare(String(password), candidate.password)) {
                user = candidate;
                break;
            }
        }
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Só depois de a senha conferir: avisa que a conta existe mas ainda não
        // foi liberada (ex.: servidor recém-cadastrado aguardando um admin).
        // Antes da senha a resposta segue genérica, sem revelar contas.
        if (!user.isActive) {
            return res.status(403).json({
                code: "ACCOUNT_PENDING_APPROVAL",
                message: "Sua conta ainda não foi liberada. Aguarde um administrador ativá-la para entrar.",
            });
        }

        const { password: _, ...userWithoutPassword } = user;

        const token = generateToken({
            sub: user.id,
            username: user.username,
            role: user.role,
        });
        // 🔒 SECURITY: o JWT nunca vai no corpo da resposta — só em cookie
        // httpOnly, inacessível a JavaScript no cliente (mitiga roubo via XSS).
        setAuthCookie(res, token);
        res.json({ user: userWithoutPassword });
    } catch (error) {
        logError("Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Logout: limpa o cookie httpOnly no servidor (o cliente não tem como
// apagar um cookie httpOnly diretamente via JavaScript).
router.post("/auth/logout", (_req, res) => {
    clearAuthCookie(res);
    res.status(200).json({ message: "Logout realizado com sucesso" });
});

// Registro público
router.post("/register", sensitiveActionLimiter, async (req, res) => {
    try {
        // 🔒 SECURITY: o cliente só escolhe entre aluno ("tech") e servidor ("admin").
        // Conta de servidor nasce inativa: só entra no sistema depois que um
        // administrador a ativa em Usuários. Essa aprovação é a barreira; saber a
        // matrícula SIAPE de alguém não basta para virar admin.
        const role = req.body?.role === "admin" ? "admin" : "tech";
        const validation = insertUserSchema.safeParse({
            ...req.body,
            role,
            isActive: role === "admin" ? false : true,
        });
        if (!validation.success) {
            return res.status(400).json({ message: "Dados inválidos", errors: validation.error.issues });
        }


        const user = await storage.createUser(validation.data);
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({
            message: role === "admin"
                ? "Cadastro enviado. Um administrador precisa ativar sua conta."
                : "Usuário cadastrado com sucesso",
            pendingApproval: role === "admin",
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

        logError("Register user error:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
    }
});

// Alterar própria senha
router.put("/users/me/password", authenticateJWT, async (req, res) => {
    try {
        const user = req.user;
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
        logError("Change password error:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
    }
});

export default router;
