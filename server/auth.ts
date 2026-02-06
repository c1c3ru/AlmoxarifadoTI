import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// 🔒 SECURITY: Validate JWT_SECRET in production
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

export function isAuthEnabled() {
  const enableJwtValue = process.env.ENABLE_JWT;
  return enableJwtValue === "true" || enableJwtValue === "1";
}

export interface JwtPayload {
  sub: string; // user id
  username: string;
  role: string;
}

export function generateToken(payload: JwtPayload) {
  // 8h de expiração por padrão
  const expiresIn = process.env.JWT_EXPIRES_IN || "8h";
  const options: SignOptions = { expiresIn } as SignOptions;
  return jwt.sign(payload, JWT_SECRET, options);
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
    (req as any).user = decoded;
    // Atualiza presença (last_seen_at) para toda requisição autenticada
    try {
      await storage.updateUserLastSeen(decoded.sub);
    } catch { }
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
