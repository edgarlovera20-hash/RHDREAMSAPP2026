import rateLimit, {
  ipKeyGenerator,
  RateLimitRequestHandler,
  Store,
} from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import IORedis from "ioredis";
import { logger } from "../utils/logger";

let redisClient: IORedis | null = null;

function getRedisStore(prefix: string): Store | undefined {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return undefined;

  try {
    if (!redisClient) {
      redisClient = new IORedis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
      });
      redisClient.on("error", (err) => {
        logger.warn("Rate-limit Redis error (falling back to memory)", { message: err.message });
      });
    }
    return new RedisStore({
      sendCommand: (...args: string[]) => (redisClient as any).call(...args),
      prefix,
    });
  } catch {
    return undefined;
  }
}

/**
 * General API rate limiter — 300 req / 15 min per user/IP.
 * Uses Redis when REDIS_URL is set (required for PM2 cluster mode).
 */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  store: getRedisStore("rhdreams:rl:api"),
  keyGenerator: (req) => req.user?.userId || ipKeyGenerator(req.ip || "unknown"),
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
});

/**
 * Gemini/AI rate limiter — 75 req / 15 min.
 */
export const geminiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.GEMINI_RATE_LIMIT_MAX || 75),
  standardHeaders: true,
  legacyHeaders: false,
  store: getRedisStore("rhdreams:rl:gemini"),
  keyGenerator: (req) => (req as any).user?.userId || ipKeyGenerator(req.ip || "unknown"),
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
 * Auth brute-force limiter — 5 attempts / 15 min per IP.
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: getRedisStore("rhdreams:rl:auth"),
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown"),
  handler: (req, res) => {
    logger.warn("Auth rate limit exceeded", { ip: req.ip, path: req.path });
    res.status(429).json({
      success: false,
      error: "Demasiados intentos de autenticación. Intenta de nuevo más tarde.",
      code: 429,
    });
  },
});
