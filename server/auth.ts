import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// 🔒 SECURITY: Validate JWT_SECRET in production. Autenticação em si é
// sempre obrigatória (não existe mais flag para desativá-la); esta checagem
// adicional garante que, em produção, o segredo usado para assinar/validar
// tokens nunca seja o valor padrão committado no repositório. Mantida
// restrita a NODE_ENV=production para não exigir configuração extra em
// ambientes de desenvolvimento local (veja README).
const JWT_SECRET_RAW = process.env.JWT_SECRET || "change-me-in-prod";

if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || JWT_SECRET_RAW === "change-me-in-prod") {
    console.error("❌ FATAL SECURITY ERROR: JWT_SECRET is not set or using default value in production!");
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

// 🔒 SECURITY: nome do cookie httpOnly que carrega o JWT. O token nunca mais
// trafega no corpo da resposta de login nem é lido/gravado pelo frontend —
// isso o torna inacessível a JavaScript (e, por consequência, a XSS).
export const AUTH_COOKIE_NAME = "sgat_token";

function authCookieOptions() {
  return {
    httpOnly: true,
    // Secure exige HTTPS; relaxado fora de produção para funcionar em
    // desenvolvimento local via http://localhost.
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };
}

export function setAuthCookie(res: Response, token: string) {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const maxAge = decoded?.exp
    ? Math.max(decoded.exp * 1000 - Date.now(), 0)
    : 8 * 60 * 60 * 1000;
  res.cookie(AUTH_COOKIE_NAME, token, { ...authCookieOptions(), maxAge });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions());
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
  // Fonte primária: cookie httpOnly (fluxo do frontend web). O header
  // Authorization: Bearer segue aceito como alternativa para clientes que
  // não são navegador (scripts, apps mobile, integrações server-to-server).
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
  const authHeader = req.headers["authorization"] as string | undefined;
  const headerToken = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : undefined;
  const token = cookieToken || headerToken;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
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
