import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import { getRecentEvents } from "../events/emitter";

const router = Router();
router.get("/", authMiddleware, (_req, res) => res.json(getRecentEvents()));
export default router;
