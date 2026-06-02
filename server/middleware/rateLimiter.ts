import rateLimit, {
  ipKeyGenerator,
  RateLimitRequestHandler,
} from "express-rate-limit";
import { logger } from "../utils/logger";

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.API_RATE_LIMIT_MAX || 300), // Limit each IP to N requests per windowMs
  message: {
    success: false,
    error: "Demasiadas solicitudes. Intenta de nuevo más tarde.",
    code: 429,
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.userId || ipKeyGenerator(req.ip || "unknown");
  },
  handler: (req, res) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      userId: (req as any).user?.userId,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: "Demasiadas solicitudes. Intenta de nuevo más tarde.",
      code: 429,
    });
  },
  skip: (req) => {
    // Skip rate limiting for certain paths if needed
    return false;
  },
});

/**
 * Gemini API rate limiter
 * Stricter: 30 requests per 15 minutes
 * Prevents abuse of expensive AI calls
 */
export const geminiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.GEMINI_RATE_LIMIT_MAX || 75), // 200/hour needs at least 50 per 15 min plus margin
  message: {
    success: false,
    error: "Has alcanzado el límite de solicitudes de IA. Intenta de nuevo en 15 minutos.",
    code: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as any).user?.userId || ipKeyGenerator(req.ip || "unknown");
  },
  handler: (req, res) => {
    logger.warn("Gemini rate limit exceeded", {
      ip: req.ip,
      userId: (req as any).user?.userId,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: "Has alcanzado el límite de solicitudes de IA. Intenta de nuevo en 15 minutos.",
      code: 429,
    });
  },
});

/**
 * Auth endpoint rate limiter
 * Stricter: 5 attempts per 15 minutes
 * Prevents brute force attacks
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 attempts per windowMs
  message: {
    success: false,
    error: "Demasiados intentos de autenticación. Intenta de nuevo más tarde.",
    code: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown"),
  handler: (req, res) => {
    logger.warn("Auth rate limit exceeded", {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: "Demasiados intentos de autenticación. Intenta de nuevo más tarde.",
      code: 429,
    });
  },
});
