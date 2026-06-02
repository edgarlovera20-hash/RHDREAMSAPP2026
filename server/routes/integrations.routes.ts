import { Router } from "express";
import {
  analyzeFacebookAds,
  canvaCallback,
  connectCanva,
  createCanvaCreative,
  createRecruitmentImage,
  getBaileys,
  getCatalog,
  getIntegrationInbox,
  logoutBaileys,
  receiveGenericWebhook,
  receiveJobBoardWebhook,
  receiveMetaWebhook,
  sendBaileys,
  startBaileys,
  testIntegration,
  verifyMetaWebhook,
} from "../controllers/integrations.controller";
import { apiLimiter } from "../middleware/rateLimiter";
import { authMiddleware } from "../middleware/auth";

export const createIntegrationRoutes = (): Router => {
  const router = Router();

  router.get("/catalog", authMiddleware, getCatalog);
  router.get("/inbox", authMiddleware, getIntegrationInbox);
  router.post("/test", authMiddleware, apiLimiter, testIntegration);
  router.post("/facebook-ads/analyze", authMiddleware, apiLimiter, analyzeFacebookAds);
  router.get("/canva/connect", authMiddleware, connectCanva);
  router.get("/canva/callback", canvaCallback);
  router.post("/canva/designs", authMiddleware, apiLimiter, createCanvaCreative);
  router.post("/images/recruitment", authMiddleware, apiLimiter, createRecruitmentImage);
  router.post("/baileys/start", authMiddleware, apiLimiter, startBaileys);
  router.get("/baileys/status", authMiddleware, getBaileys);
  router.get("/baileys/status/:sessionId", authMiddleware, getBaileys);
  router.post("/baileys/send", authMiddleware, apiLimiter, sendBaileys);
  router.post("/baileys/logout", authMiddleware, apiLimiter, logoutBaileys);
  router.post("/baileys/logout/:sessionId", authMiddleware, apiLimiter, logoutBaileys);

  router.get("/meta/webhook", verifyMetaWebhook);
  router.post("/meta/webhook", receiveMetaWebhook);

  router.post("/webhooks/job-board/:provider", apiLimiter, receiveJobBoardWebhook);
  router.post("/webhooks/:source", apiLimiter, receiveGenericWebhook);

  return router;
};
