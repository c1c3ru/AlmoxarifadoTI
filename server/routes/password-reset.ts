import { Router, type Request } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { passwordPolicy } from "@shared/password-policy";
import { storage } from "../storage";
import { emailService } from "../email";
import { logError } from "../logger";

// Recuperação de senha por link com token de uso único.
//
// - O token tem 256 bits aleatórios e só vai no link do e-mail; nunca aparece
//   em respostas da API. O banco guarda apenas o SHA-256 dele.
// - O token expira em RESET_TOKEN_TTL_MINUTES e é consumido atomicamente.
// - A resposta de /forgot-password é sempre a mesma (e leva um tempo mínimo),
//   para não revelar se um usuário/email existe.
// - Só contas ativas e não excluídas podem redefinir a senha.

const router = Router();

export const RESET_TOKEN_TTL_MINUTES = 30;
const RESEND_COOLDOWN_MS = 60 * 1000;
const FORGOT_MIN_RESPONSE_MS = 800;
const GENERIC_FORGOT_MESSAGE =
    "Se existir uma conta ativa para este usuário/email, enviaremos um link de redefinição.";
const INVALID_TOKEN_MESSAGE = "Link inválido ou expirado. Solicite um novo.";

// Por IP: limita varredura de usuários/emails.
const forgotPasswordIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Muitas solicitações. Tente novamente após 15 minutos." },
});

// Por identificador: impede inundar a caixa de alguém com e-mails,
// mesmo trocando de IP.
const forgotPasswordIdentifierLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const raw = typeof req.body?.usernameOrEmail === "string" ? req.body.usernameOrEmail : "";
        return `forgot:${raw.trim().toLowerCase()}`;
    },
    message: { message: "Muitas solicitações para esta conta. Tente novamente mais tarde." },
});

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Muitas tentativas. Tente novamente após 15 minutos." },
});

const forgotPasswordSchema = z.object({
    usernameOrEmail: z.string().trim().min(1, "Usuário ou email é obrigatório").max(254),
});

const resetPasswordSchema = z.object({
    // 32 bytes em base64url = 43 caracteres
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, INVALID_TOKEN_MESSAGE),
    newPassword: passwordPolicy
        // bcrypt ignora o que passa de 72 bytes
        .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "A senha é longa demais"),
});

export function hashResetToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

// Base do link enviado por e-mail. Nunca usa o Host da requisição em produção,
// para que um Host forjado não faça o e-mail apontar para outro domínio.
function resolveAppBaseUrl(req: Request): string | undefined {
    const configured = process.env.APP_URL?.trim();
    if (configured) return configured.replace(/\/+$/, "");

    const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, "")}`;

    if (process.env.NODE_ENV !== "production") {
        return `${req.protocol}://${req.get("host")}`;
    }
    return undefined;
}

async function waitUntilElapsed(startedAt: number, minMs: number) {
    const remaining = minMs - (Date.now() - startedAt);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

router.post(
    "/auth/forgot-password",
    forgotPasswordIpLimiter,
    forgotPasswordIdentifierLimiter,
    async (req, res) => {
        const startedAt = Date.now();
        const parsed = forgotPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Dados inválidos" });
        }

        try {
            const baseUrl = resolveAppBaseUrl(req);
            if (!baseUrl) {
                logError("[forgot-password] APP_URL não configurada; link de redefinição não pode ser gerado", undefined);
            } else {
                const matches = await storage.getActiveUsersByUsernameOrEmail(parsed.data.usernameOrEmail);
                if (matches.length === 0) {
                    console.warn("[forgot-password] Nenhuma conta ativa com esse usuário/e-mail; nada enviado");
                }
                for (const user of matches) {
                    const last = await storage.getLatestPasswordResetCreatedAt(user.id);
                    if (last && Date.now() - last.getTime() < RESEND_COOLDOWN_MS) {
                        console.warn(`[forgot-password] Pedido ignorado para user ID ${user.id}: aguarde ${RESEND_COOLDOWN_MS / 1000}s entre envios`);
                        continue;
                    }

                    const token = crypto.randomBytes(32).toString("base64url");
                    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
                    await storage.createPasswordReset(user.id, hashResetToken(token), expiresAt);

                    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
                    const sent = await emailService.sendPasswordResetEmail(user.email, resetUrl, user.name || user.username, RESET_TOKEN_TTL_MINUTES);
                    if (sent) {
                        console.log(`[forgot-password] Link de redefinição enviado para user ID ${user.id}`);
                    } else {
                        logError(`[forgot-password] Falha ao enviar o e-mail para user ID ${user.id}; veja o log [email] acima`, undefined);
                    }
                }
            }
        } catch (error) {
            // Não muda a resposta: um 500 só neste caminho revelaria que a conta existe.
            logError("[forgot-password] Error:", error);
        }

        await waitUntilElapsed(startedAt, FORGOT_MIN_RESPONSE_MS);
        return res.status(200).json({ message: GENERIC_FORGOT_MESSAGE });
    },
);

router.post("/auth/reset-password", resetPasswordLimiter, async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    try {
        const reset = await storage.consumePasswordReset(hashResetToken(parsed.data.token));
        if (!reset || reset.expiresAt.getTime() < Date.now()) {
            return res.status(400).json({ message: INVALID_TOKEN_MESSAGE });
        }

        const user = await storage.getUser(reset.userId);
        if (!user || !user.isActive || user.deletedAt) {
            return res.status(400).json({ message: INVALID_TOKEN_MESSAGE });
        }

        const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10);
        await storage.updateUserPassword(user.id, hashedPassword);
        await storage.deletePasswordResetsForUser(user.id);
        await emailService.sendPasswordChangedEmail(user.email, user.name || user.username);

        return res.status(200).json({ message: "Senha redefinida com sucesso. Faça login com a nova senha." });
    } catch (error) {
        logError("[reset-password] Error:", error);
        return res.status(500).json({ message: "Erro interno do servidor" });
    }
});

export default router;
