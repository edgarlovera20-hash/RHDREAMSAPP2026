import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import {
  readRuntimeCollection,
  writeRuntimeCollection,
} from "../services/runtimeStore.service";
import { logger } from "../utils/logger";

const FILE = "interview-slots.json";
const DEFAULT_COMPANY_ID = "default";

type InterviewSlot = {
  id: string;
  companyId: string;
  candidateId?: string;
  candidateName?: string;
  date: string;
  time: string;
  location: string;
  agentId?: string;
  notes?: string;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: number;
  updatedAt: number;
};

const getCompanyId = (req: AuthRequest): string =>
  String((req.user as any)?.companyId || DEFAULT_COMPANY_ID);

export const createInterviewRoutes = (): Router => {
  const router = Router();

  // GET /api/interviews
  router.get("/", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const all = await readRuntimeCollection<InterviewSlot>(FILE);
      const slots = all.filter((s) => s.companyId === companyId);
      res.json({ success: true, data: slots });
    } catch (error) {
      logger.error("Failed to list interview slots", error);
      res.status(500).json({ success: false, error: "Error al listar slots de entrevista", code: 500 });
    }
  });

  // POST /api/interviews
  router.post("/", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const { candidateId, candidateName, date, time, location, agentId, notes } = req.body;
      if (!date || !time || !location) {
        return res.status(400).json({ success: false, error: "date, time y location son requeridos", code: 400 });
      }
      const all = await readRuntimeCollection<InterviewSlot>(FILE);
      const now = Date.now();
      const slot: InterviewSlot = {
        id: `slot-${now}-${Math.random().toString(36).slice(2, 8)}`,
        companyId,
        candidateId,
        candidateName,
        date,
        time,
        location,
        agentId,
        notes,
        status: "scheduled",
        createdAt: now,
        updatedAt: now,
      };
      all.push(slot);
      await writeRuntimeCollection(FILE, all);
      res.status(201).json({ success: true, data: slot });
    } catch (error) {
      logger.error("Failed to create interview slot", error);
      res.status(500).json({ success: false, error: "Error al crear slot de entrevista", code: 500 });
    }
  });

  // PUT /api/interviews/:id
  router.put("/:id", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const all = await readRuntimeCollection<InterviewSlot>(FILE);
      const idx = all.findIndex((s) => s.id === req.params.id && s.companyId === companyId);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: "Slot no encontrado", code: 404 });
      }
      const updated: InterviewSlot = { ...all[idx], ...req.body, id: req.params.id, companyId, updatedAt: Date.now() };
      all[idx] = updated;
      await writeRuntimeCollection(FILE, all);
      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error("Failed to update interview slot", error);
      res.status(500).json({ success: false, error: "Error al actualizar slot de entrevista", code: 500 });
    }
  });

  // DELETE /api/interviews/:id
  router.delete("/:id", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const all = await readRuntimeCollection<InterviewSlot>(FILE);
      const next = all.filter((s) => !(s.id === req.params.id && s.companyId === companyId));
      if (next.length === all.length) {
        return res.status(404).json({ success: false, error: "Slot no encontrado", code: 404 });
      }
      await writeRuntimeCollection(FILE, next);
      res.json({ success: true, data: null });
    } catch (error) {
      logger.error("Failed to delete interview slot", error);
      res.status(500).json({ success: false, error: "Error al eliminar slot de entrevista", code: 500 });
    }
  });

  return router;
};
