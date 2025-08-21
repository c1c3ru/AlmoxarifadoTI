import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-prod";

export function isAuthEnabled() {
  return process.env.ENABLE_JWT === "true";
}

export interface JwtPayload {
  sub: string; // user id
  username: string;
  role: string;
}

export function generateToken(payload: JwtPayload) {
  // 8h de expiração por padrão
  const expiresIn = process.env.JWT_EXPIRES_IN || "8h";
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
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
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
