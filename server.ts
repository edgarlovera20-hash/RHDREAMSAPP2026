import express from "express";
import cors from "cors";
import type { ServeStaticOptions } from "serve-static";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { logger, logInfo, logFatal, logError } from "./server/utils/logger";
import { createGeminiRoutes } from "./server/routes/gemini.routes";
import { createGroqRoutes } from "./server/routes/groq.routes";
import { createOpenRouterRoutes } from "./server/routes/openrouter.routes";
import { createIntegrationRoutes } from "./server/routes/integrations.routes";
import { createAuthRoutes } from "./server/routes/auth.routes";
import { createWorkflowRoutes } from "./server/routes/workflows.routes";
import { createGoogleRoutes } from "./server/routes/google.routes";
import { createConversationRoutes } from "./server/routes/conversations.routes";
import { createInterviewRoutes } from "./server/routes/interviews.routes";
import { createAutomationRulesRoutes } from "./server/routes/automationRules.routes";
import { apiLimiter } from "./server/middleware/rateLimiter";
import { initializeGeminiService } from "./server/services/gemini.service";
import { initializeGroqService } from "./server/services/groq.service";
import { initializeOpenRouterService } from "./server/services/openrouter.service";
import { restoreSavedBaileysSessions } from "./server/services/baileys.service";

dotenv.config();

const normalizeHost = (host = "") => host.split(":")[0].toLowerCase();

const RH_ALLOWED_HOSTS = new Set(
  (process.env.RH_ALLOWED_HOSTS || "rh.heavenlydreams.com.mx")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
);

const ADMIN_APP_URL = process.env.ADMIN_APP_URL || "https://app.heavenlydreams.com.mx";
const MAIN_SITE_URL = process.env.MAIN_SITE_URL || "https://heavenlydreams.com.mx";

const isLocalOrPlatformHost = (host: string) =>
  host === "localhost" ||
  host === "127.0.0.1" ||
  host === "::1" ||
  host.endsWith(".onrender.com") ||
  host.endsWith(".pages.dev");

async function startServer() {
  try {
    const app = express();
    const PORT = parseInt(process.env.PORT || "3000", 10);
    const NODE_ENV = process.env.NODE_ENV || "development";
    app.set("trust proxy", 1);

    // CORS
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
      : [];
    app.use(
      cors({
        origin: (origin, callback) => {
          // Allow same-origin (no origin header) or explicitly listed origins
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error("Not allowed by CORS"));
          }
        },
        credentials: true,
      })
    );

    // Middleware
    app.use(express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    }));
    app.use(express.urlencoded({ limit: "10mb", extended: true }));
    app.disable("x-powered-by");
    app.use((req, res, next) => {
      const host = normalizeHost(req.headers.host);
      const shouldEnforceRhHost = NODE_ENV === "production" && !isLocalOrPlatformHost(host);

      if (!shouldEnforceRhHost || RH_ALLOWED_HOSTS.has(host)) {
        next();
        return;
      }

      if (host === "app.heavenlydreams.com.mx") {
        res.status(421).json({
          success: false,
          error: "Este dominio esta reservado para la app administrativa.",
          expectedDomain: ADMIN_APP_URL,
          rhDomain: "https://rh.heavenlydreams.com.mx",
        });
        return;
      }

      if (host === "heavenlydreams.com.mx" || host === "www.heavenlydreams.com.mx") {
        res.status(421).json({
          success: false,
          error: "Este dominio esta reservado para la pagina principal de Heavenly Dreams.",
          expectedDomain: MAIN_SITE_URL,
          rhDomain: "https://rh.heavenlydreams.com.mx",
        });
        return;
      }

      res.status(421).json({
        success: false,
        error: "Dominio no autorizado para la app de reclutamiento.",
        rhDomain: "https://rh.heavenlydreams.com.mx",
      });
    });
    app.use((_req, res, next) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
      res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
      if (NODE_ENV === "production") {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      }
      next();
    });

    // Request logging middleware
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        const level =
          res.statusCode >= 500
            ? "error"
            : res.statusCode >= 400
              ? "warn"
              : "info";
        logInfo(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`, {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration,
          ip: req.ip,
        });
      });
      next();
    });

    // Initialize Gemini Service
    initializeGeminiService({
      freeApiKey: process.env.GEMINI_FREE_API_KEY,
      paidApiKey: process.env.GEMINI_PAID_API_KEY,
      legacyApiKey: process.env.GEMINI_API_KEY,
      defaultTier: process.env.GEMINI_DEFAULT_TIER,
      textModel: process.env.GEMINI_TEXT_MODEL,
      audioModel: process.env.GEMINI_AUDIO_MODEL,
    });
    logInfo("Services initialized", {
      hasGeminiFreeKey: !!process.env.GEMINI_FREE_API_KEY,
      hasGeminiPaidKey: !!process.env.GEMINI_PAID_API_KEY,
      hasGeminiLegacyKey: !!process.env.GEMINI_API_KEY,
      geminiDefaultTier: process.env.GEMINI_DEFAULT_TIER || "free",
    });
    initializeGroqService(process.env.GROQ_API_KEY, process.env.GROQ_MODEL);
    logInfo("Groq initialized", {
      hasGroqKey: !!process.env.GROQ_API_KEY,
      groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    });
    initializeOpenRouterService(
      process.env.OPENROUTER_API_KEY,
      process.env.OPENROUTER_MODEL
    );
    logInfo("OpenRouter initialized", {
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      openRouterModel: process.env.OPENROUTER_MODEL || "openrouter/auto",
    });

    // Apply global rate limiter
    app.use("/api/", apiLimiter);

    // Mount API routes
    app.use("/api/auth", createAuthRoutes());
    const geminiRoutes = createGeminiRoutes();
    app.use("/api/gemini", geminiRoutes);
    app.use("/api/groq", createGroqRoutes());
    app.use("/api/openrouter", createOpenRouterRoutes());
    app.use("/api/integrations", createIntegrationRoutes());
    app.use("/api/conversations", createConversationRoutes());
    app.use("/api/workflows", createWorkflowRoutes());
    app.use("/api/google", createGoogleRoutes());
    app.use("/api/interviews", createInterviewRoutes());
    app.use("/api/automation-rules", createAutomationRulesRoutes());
    app.use("/api", (_req, res) => {
      res.status(404).json({
        success: false,
        error: "API endpoint no encontrado",
        code: 404,
      });
    });

    // Health check endpoint (outside rate limiter for monitoring)
    app.get("/health", (req, res) => {
      res.json({
        success: true,
        data: {
          status: "ok",
          environment: NODE_ENV,
          timestamp: new Date().toISOString(),
        },
      });
    });

    // Setup Vite middleware for development or Static server for production
    if (NODE_ENV !== "production") {
      logInfo("Starting in development mode with Vite middleware");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      logInfo("Starting in production mode with static serving");
      const distPath = path.join(process.cwd(), "dist");
      const staticOptions: ServeStaticOptions = {
        immutable: true,
        maxAge: "1y",
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      };

      app.use("/rh", express.static(distPath, staticOptions));
      app.use(express.static(distPath, staticOptions));

      app.get(["/rh", "/rh/*"], (_req, res) => {
        res.setHeader("Cache-Control", "no-cache");
        res.sendFile(path.join(distPath, "index.html"));
      });

      app.get("*", (req, res) => {
        res.setHeader("Cache-Control", "no-cache");
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    // Error handling middleware
    app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        logError("Unhandled error", err);
        res.status(500).json({
          success: false,
          error: "Error interno del servidor",
          code: 500,
        });
      }
    );

    // Start server
    app.listen(PORT, "0.0.0.0", () => {
      logInfo(`🚀 Server running on http://localhost:${PORT}`, {
        port: PORT,
        environment: NODE_ENV,
      });
      restoreSavedBaileysSessions().catch((error) => {
        logError("Baileys saved sessions restore failed", error);
      });
    });
  } catch (err) {
    logFatal("Server failed to start", err);
  }
}

startServer();
