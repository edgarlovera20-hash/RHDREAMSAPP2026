import { Router } from "express";
import {
  analyzeFacebookAds,
  createCanvaCreative,
  getBaileys,
  getCatalog,
  logoutBaileys,
  receiveJobBoardWebhook,
  sendBaileys,
  startBaileys,
  testIntegration,
} from "../controllers/integrations.controller";
import { apiLimiter } from "../middleware/rateLimiter";

export const createIntegrationRoutes = (): Router => {
  const router = Router();

  router.get("/catalog", getCatalog);
  router.post("/test", apiLimiter, testIntegration);
  router.post("/facebook-ads/analyze", apiLimiter, analyzeFacebookAds);
  router.post("/canva/designs", apiLimiter, createCanvaCreative);
  router.post("/baileys/start", apiLimiter, startBaileys);
  router.get("/baileys/status", getBaileys);
  router.get("/baileys/status/:sessionId", getBaileys);
  router.post("/baileys/send", apiLimiter, sendBaileys);
  router.post("/baileys/logout", apiLimiter, logoutBaileys);
  router.post("/baileys/logout/:sessionId", apiLimiter, logoutBaileys);

  router.post("/webhooks/job-board/:provider", apiLimiter, receiveJobBoardWebhook);

  return router;
};
