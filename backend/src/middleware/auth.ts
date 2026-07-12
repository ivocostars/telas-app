import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtPayload {
  id: number;
  email: string;
  rol: "admin" | "scanner";
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-change-me";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token requerido" });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.rol !== "admin") {
    res.status(403).json({ error: "Se requiere rol de administrador" });
    return;
  }
  next();
}

export function requireScanner(req: Request, res: Response, next: NextFunction) {
  if (!req.user || (req.user.rol !== "admin" && req.user.rol !== "scanner")) {
    res.status(403).json({ error: "Se requiere rol de scanner o admin" });
    return;
  }
  next();
}

export { JWT_SECRET };
