import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import {
  readRuntimeCollection,
  writeRuntimeCollection,
} from "../services/runtimeStore.service";
import { logger } from "../utils/logger";

const FILE = "automation-rules.json";
const DEFAULT_COMPANY_ID = "default";

type AutomationRule = {
  id: string;
  companyId: string;
  name: string;
  trigger: string;
  condition?: string;
  action: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
};

const getCompanyId = (req: AuthRequest): string =>
  String((req.user as any)?.companyId || DEFAULT_COMPANY_ID);

export const createAutomationRulesRoutes = (): Router => {
  const router = Router();

  // GET /api/automation-rules
  router.get("/", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const all = await readRuntimeCollection<AutomationRule>(FILE);
      const rules = all.filter((r) => r.companyId === companyId);
      res.json({ success: true, data: rules });
    } catch (error) {
      logger.error("Failed to list automation rules", error);
      res.status(500).json({ success: false, error: "Error al listar reglas de automatización", code: 500 });
    }
  });

  // POST /api/automation-rules
  router.post("/", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const { name, trigger, condition, action, active } = req.body;
      if (!name || !trigger || !action) {
        return res.status(400).json({ success: false, error: "name, trigger y action son requeridos", code: 400 });
      }
      const all = await readRuntimeCollection<AutomationRule>(FILE);
      const now = Date.now();
      const rule: AutomationRule = {
        id: `rule-${now}-${Math.random().toString(36).slice(2, 8)}`,
        companyId,
        name,
        trigger,
        condition,
        action,
        active: active !== false,
        createdAt: now,
        updatedAt: now,
      };
      all.push(rule);
      await writeRuntimeCollection(FILE, all);
      res.status(201).json({ success: true, data: rule });
    } catch (error) {
      logger.error("Failed to create automation rule", error);
      res.status(500).json({ success: false, error: "Error al crear regla de automatización", code: 500 });
    }
  });

  // PUT /api/automation-rules/:id
  router.put("/:id", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const all = await readRuntimeCollection<AutomationRule>(FILE);
      const idx = all.findIndex((r) => r.id === req.params.id && r.companyId === companyId);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: "Regla no encontrada", code: 404 });
      }
      const updated: AutomationRule = { ...all[idx], ...req.body, id: req.params.id, companyId, updatedAt: Date.now() };
      all[idx] = updated;
      await writeRuntimeCollection(FILE, all);
      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error("Failed to update automation rule", error);
      res.status(500).json({ success: false, error: "Error al actualizar regla de automatización", code: 500 });
    }
  });

  // DELETE /api/automation-rules/:id
  router.delete("/:id", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const all = await readRuntimeCollection<AutomationRule>(FILE);
      const next = all.filter((r) => !(r.id === req.params.id && r.companyId === companyId));
      if (next.length === all.length) {
        return res.status(404).json({ success: false, error: "Regla no encontrada", code: 404 });
      }
      await writeRuntimeCollection(FILE, next);
      res.json({ success: true, data: null });
    } catch (error) {
      logger.error("Failed to delete automation rule", error);
      res.status(500).json({ success: false, error: "Error al eliminar regla de automatización", code: 500 });
    }
  });

  // PATCH /api/automation-rules/:id/toggle
  router.patch("/:id/toggle", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const all = await readRuntimeCollection<AutomationRule>(FILE);
      const idx = all.findIndex((r) => r.id === req.params.id && r.companyId === companyId);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: "Regla no encontrada", code: 404 });
      }
      all[idx] = { ...all[idx], active: !all[idx].active, updatedAt: Date.now() };
      await writeRuntimeCollection(FILE, all);
      res.json({ success: true, data: all[idx] });
    } catch (error) {
      logger.error("Failed to toggle automation rule", error);
      res.status(500).json({ success: false, error: "Error al alternar regla de automatización", code: 500 });
    }
  });

  return router;
};
