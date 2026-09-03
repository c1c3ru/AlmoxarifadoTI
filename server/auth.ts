import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// 🔒 SECURITY: Validate JWT_SECRET whenever JWT auth is enabled, regardless
// of NODE_ENV — a default value committed to source control must never be
// usable to sign tokens in any reachable environment (staging/preview included).
const JWT_SECRET_RAW = process.env.JWT_SECRET || "change-me-in-prod";

// Opt-in: usado apenas para decidir quando o boot deve falhar por um
// JWT_SECRET fraco/ausente (ver guarda abaixo). Não confundir com
// isAuthEnabled() — essa aqui não define se a autenticação está ativa em
// tempo de execução, só quando a checagem estrita de segredo forte roda.
function isAuthEnabledFromEnv() {
  const enableJwtValue = process.env.ENABLE_JWT;
  return enableJwtValue === "true" || enableJwtValue === "1";
}

// Roda sempre em produção (independente de ENABLE_JWT, já que agora a
// autenticação é ligada por padrão — ver isAuthEnabled() abaixo) e também
// em qualquer ambiente onde ENABLE_JWT tenha sido ligado explicitamente
// (staging/preview). Fora disso (dev local sem ENABLE_JWT), não falha o
// boot — evita quebrar `npm run dev` para quem ainda não configurou um
// JWT_SECRET próprio.
if (process.env.NODE_ENV === "production" || isAuthEnabledFromEnv()) {
  if (!process.env.JWT_SECRET || JWT_SECRET_RAW === "change-me-in-prod") {
    console.error("❌ FATAL SECURITY ERROR: JWT_SECRET is not set or using the default value while ENABLE_JWT is on!");
    console.error("   Set a strong JWT_SECRET in your environment variables before deploying.");
    process.exit(1);
  }

  if (JWT_SECRET_RAW.length < 32) {
    console.error("❌ FATAL SECURITY ERROR: JWT_SECRET must be at least 32 characters long!");
    console.error("   Current length:", JWT_SECRET_RAW.length);
    process.exit(1);
  }
}

const JWT_SECRET: Secret = JWT_SECRET_RAW as Secret;

// 🔒 SECURITY: Autenticação é exigida por padrão. ENABLE_JWT só serve para
// desativá-la explicitamente (ex.: ambiente de teste local) — nunca para
// ativá-la. Antes, a ausência da variável desligava a autenticação inteira;
// agora a ausência mantém a autenticação ligada (opt-out, não opt-in).
export function isAuthEnabled() {
  const enableJwtValue = process.env.ENABLE_JWT;
  return enableJwtValue !== "false" && enableJwtValue !== "0";
}

export interface JwtPayload {
  sub: string; // user id
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function generateToken(payload: JwtPayload) {
  // 8h de expiração por padrão
  const expiresIn = process.env.JWT_EXPIRES_IN || "8h";
  const options: SignOptions = { expiresIn } as SignOptions;
  return jwt.sign(payload, JWT_SECRET, options);
}

// 🔒 SECURITY: Exige que o usuário autenticado tenha role "admin". Deve
// sempre rodar depois de authenticateJWT na cadeia de middlewares.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Apenas administradores podem realizar esta ação" });
  }
  return next();
}

export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  if (!isAuthEnabled()) return next();

  const authHeader = req.headers["authorization"] as string | undefined;
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    // Anexa info do usuário ao request
    req.user = decoded;
    // Atualiza presença (last_seen_at) para toda requisição autenticada
    try {
      await storage.updateUserLastSeen(decoded.sub);
    } catch { }
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
