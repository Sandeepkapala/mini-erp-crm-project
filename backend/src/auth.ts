import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";

export type Role = "Admin" | "Sales" | "Warehouse" | "Accounts";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: Role;
    name: string;
    email: string;
  };
}

const secret = process.env.JWT_SECRET || "dev-secret";

// Generate JWT token
export function signToken(user: {
  id: number;
  role: Role;
  name: string;
  email: string;
}) {
  return jwt.sign(user, secret, {
    expiresIn: "8h",
  });
}

// Hash password
export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

// Compare password
export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// Check authentication
export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const token = authHeader.slice(7);

    req.user = jwt.verify(token, secret) as AuthRequest["user"];

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

// Check user role
export function allowRoles(...roles: Role[]) {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission for this action",
      });
    }

    next();
  };
}