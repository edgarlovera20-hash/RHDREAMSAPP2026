import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { logger, logInfo, logFatal, logError } from "./server/utils/logger";
import { createGeminiRoutes } from "./server/routes/gemini.routes";
import { createGroqRoutes } from "./server/routes/groq.routes";
import { createOpenRouterRoutes } from "./server/routes/openrouter.routes";
import { createIntegrationRoutes } from "./server/routes/integrations.routes";
import { apiLimiter } from "./server/middleware/rateLimiter";
import { initializeGeminiService } from "./server/services/gemini.service";
import { initializeGroqService } from "./server/services/groq.service";
import { initializeOpenRouterService } from "./server/services/openrouter.service";

dotenv.config();

async function startServer() {
  try {
    const app = express();
    const PORT = parseInt(process.env.PORT || "3000", 10);
    const NODE_ENV = process.env.NODE_ENV || "development";

    // Middleware
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ limit: "10mb", extended: true }));

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
    const geminiRoutes = createGeminiRoutes();
    app.use("/api/gemini", geminiRoutes);
    app.use("/api/groq", createGroqRoutes());
    app.use("/api/openrouter", createOpenRouterRoutes());
    app.use("/api/integrations", createIntegrationRoutes());
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
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
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
    });
  } catch (err) {
    logFatal("Server failed to start", err);
  }
}

startServer();
