/**
 * Meta Webhook Router
 * Mount at: /api/meta  (or /api/integrations/meta for backwards compat)
 *
 * GET  /webhook  → webhook challenge verification
 * POST /webhook  → incoming events (Messenger, Instagram, WhatsApp, Leads)
 * GET  /status   → check configuration status
 */

import { Router, Request, Response } from "express";
import { verifyChallenge, verifySignature, PAGE_ACCESS_TOKEN, WA_ACCESS_TOKEN, META_VERIFY_TOKEN, META_APP_SECRET } from "./config";
import { processWebhook } from "./webhook";
import { logger } from "../../utils/logger";

export const metaRouter = Router();

// ─── GET /webhook — challenge verification ───────────────────────────────────
metaRouter.get("/webhook", (req: Request, res: Response) => {
  const query = req.query as Record<string, string>;
  if (verifyChallenge(query)) {
    logger.info("[Meta] webhook challenge verified");
    return res.send(query["hub.challenge"]);
  }
  logger.warn("[Meta] webhook challenge failed", { query });
  return res.status(403).json({ error: "verification_failed" });
});

// ─── POST /webhook — receive events ─────────────────────────────────────────
metaRouter.post("/webhook", async (req: Request, res: Response) => {
  // Always ACK immediately so Meta doesn't retry
  res.sendStatus(200);

  // Signature check
  const rawBody = (req as any).rawBody as Buffer | undefined;
  const sig     = req.headers["x-hub-signature-256"] as string | undefined;

  if (META_APP_SECRET() && !verifySignature(rawBody || Buffer.from(JSON.stringify(req.body)), sig)) {
    logger.warn("[Meta] invalid webhook signature — event dropped");
    return;
  }

  try {
    const events = await processWebhook(req.body);
    logger.info("[Meta] processed webhook", { eventCount: events.length, types: events.map((e) => e.type) });
  } catch (err) {
    logger.error("[Meta] webhook processing error", { err });
  }
});

// ─── GET /status — configuration health check ────────────────────────────────
metaRouter.get("/status", (_req: Request, res: Response) => {
  const status = {
    pageToken:    Boolean(PAGE_ACCESS_TOKEN()),
    waToken:      Boolean(WA_ACCESS_TOKEN()),
    appSecret:    Boolean(META_APP_SECRET()),
    verifyToken:  Boolean(META_VERIFY_TOKEN()),
    webhookUrl:   `${process.env.APP_URL || "https://rh.heavenlydreams.com.mx"}/api/meta/webhook`,
    verifyTokenValue: META_VERIFY_TOKEN(), // safe to expose — it's not secret
  };
  res.json(status);
});
