import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";
import { JWTPayload } from "../types";

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

const requireJwtSecret = () => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET no esta configurado.");
  }

  return JWT_SECRET;
};

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

/**
 * Middleware to verify JWT token
 */
export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    // Extract token from Bearer header or fall back to httpOnly cookie
    let token: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      // Parse cookie manually (no cookie-parser dependency)
      const cookieHeader = req.headers.cookie || "";
      const cookieMatch = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("rhdreams_token="));
      if (cookieMatch) {
        token = decodeURIComponent(cookieMatch.substring("rhdreams_token=".length));
      }
    }

    if (!token) {
      logger.warn("Unauthorized attempt - missing or invalid token", {
        ip: req.ip,
        path: req.path,
      });
      return res.status(401).json({
        success: false,
        error: "Token no proporcionado o formato inválido",
        code: 401,
      });
    }

    try {
      const decoded = jwt.verify(token, requireJwtSecret()) as JWTPayload;
      req.user = decoded;
      logger.debug("Token verified successfully", { userId: decoded.userId });
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn("Token expired", { path: req.path });
        return res.status(401).json({
          success: false,
          error: "Token expirado",
          code: 401,
        });
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn("Invalid token", { error: error.message });
        return res.status(401).json({
          success: false,
          error: "Token inválido",
          code: 401,
        });
      }

      throw error;
    }
  } catch (error) {
    logger.error("Auth middleware error", error);
    res.status(500).json({
      success: false,
      error: "Error en la autenticación",
      code: 500,
    });
  }
};

/**
 * Middleware to check user role
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado",
        code: 401,
      });
    }

    if (!allowedRoles.includes(req.user.role || "")) {
      logger.warn("Unauthorized role access attempt", {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: "No tienes permiso para acceder a este recurso",
        code: 403,
      });
    }

    next();
  };
};

/**
 * Generate JWT token
 */
export const generateToken = (
  userId: string,
  role: string,
  expiresIn: string = "24h"
): string => {
  return jwt.sign({ userId, role }, requireJwtSecret(), { expiresIn });
};

/**
 * Optional auth middleware - allows requests without token but attaches user if provided
 */
export const optionalAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, requireJwtSecret()) as JWTPayload;
        req.user = decoded;
        logger.debug("Optional token verified", { userId: decoded.userId });
      } catch (error) {
        logger.debug("Optional auth token verification failed", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // Continue without user - it's optional
      }
    }

    next();
  } catch (error) {
    logger.error("Optional auth middleware error", error);
    next();
  }
};
