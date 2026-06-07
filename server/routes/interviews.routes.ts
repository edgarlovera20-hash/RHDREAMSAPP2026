import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import {
  readRuntimeCollection,
  writeRuntimeCollection,
} from "../services/runtimeStore.service";
import { logger } from "../utils/logger";

const FILE = "interview-slots.json";
const DEFAULT_COMPANY_ID = "default";

export type InterviewSlot = {
  id: string;
  companyId: string;
  candidateId?: string;
  candidateName?: string;
  vacante?: string;
  canal?: string;
  phone?: string;
  date: string;
  time: string;
  location: string;
  agentId?: string;
  notes?: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show" | "rescheduled";
  reminderSent?: boolean;
  confirmationSent?: boolean;
  calendarEventId?: string;
  meetingLink?: string;
  score?: number;           // humanization/fit score 0-10
  restricciones?: string[]; // flags detected during conversation
  createdAt: number;
  updatedAt: number;
};

const HORARIOS_DISPONIBLES = [
  "08:00","09:00","10:00","11:00","12:00","13:00",
  "14:00","15:00","16:00","17:00",
];

const getCompanyId = (req: AuthRequest): string =>
  String((req.user as any)?.companyId || DEFAULT_COMPANY_ID);

export const createInterviewRoutes = (): Router => {
  const router = Router();

  // GET /api/interviews — lista todos los slots de la empresa
  router.get("/", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const { status, date, from, to } = req.query as Record<string, string>;
      let all = await readRuntimeCollection<InterviewSlot>(FILE);
      let slots = all.filter((s) => s.companyId === companyId);

      if (status) slots = slots.filter(s => s.status === status);
      if (date)   slots = slots.filter(s => s.date === date);
      if (from)   slots = slots.filter(s => s.date >= from);
      if (to)     slots = slots.filter(s => s.date <= to);

      slots.sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : a.time.localeCompare(b.time);
      });

      res.json({ success: true, data: slots });
    } catch (error) {
      logger.error("Failed to list interview slots", error);
      res.status(500).json({ success: false, error: "Error al listar slots de entrevista", code: 500 });
    }
  });

  // GET /api/interviews/stats — métricas de agenda
  router.get("/stats", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const all = await readRuntimeCollection<InterviewSlot>(FILE);
      const slots = all.filter(s => s.companyId === companyId);

      const today = new Date().toISOString().slice(0, 10);
      const next7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

      const stats = {
        total: slots.length,
        scheduled: slots.filter(s => s.status === "scheduled").length,
        confirmed: slots.filter(s => s.status === "confirmed").length,
        completed: slots.filter(s => s.status === "completed").length,
        cancelled: slots.filter(s => s.status === "cancelled").length,
        no_show:   slots.filter(s => s.status === "no_show").length,
        hoy:       slots.filter(s => s.date === today).length,
        proximos7: slots.filter(s => s.date >= today && s.date <= next7).length,
        tasaAsistencia: (() => {
          const terminadas = slots.filter(s => ["completed","no_show"].includes(s.status));
          if (!terminadas.length) return 0;
          return Math.round(slots.filter(s => s.status === "completed").length / terminadas.length * 100);
        })(),
        porVacante: slots.reduce((acc: Record<string, number>, s) => {
          const v = s.vacante || "Sin especificar";
          acc[v] = (acc[v] || 0) + 1;
          return acc;
        }, {}),
        porCanal: slots.reduce((acc: Record<string, number>, s) => {
          const c = s.canal || "manual";
          acc[c] = (acc[c] || 0) + 1;
          return acc;
        }, {}),
        scorePromedio: (() => {
          const con = slots.filter(s => s.score != null);
          if (!con.length) return null;
          return parseFloat((con.reduce((s, slot) => s + (slot.score || 0), 0) / con.length).toFixed(2));
        })(),
      };

      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error("Failed to compute interview stats", error);
      res.status(500).json({ success: false, error: "Error al calcular estadísticas", code: 500 });
    }
  });

  // GET /api/interviews/disponibilidad — horarios libres para un día dado
  router.get("/disponibilidad", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const { date } = req.query as Record<string, string>;
      if (!date) return res.status(400).json({ success: false, error: "Se requiere date (YYYY-MM-DD)" });

      const all = await readRuntimeCollection<InterviewSlot>(FILE);
      const ocupados = all
        .filter(s => s.companyId === companyId && s.date === date && !["cancelled","no_show"].includes(s.status))
        .map(s => s.time);

      const libres = HORARIOS_DISPONIBLES.filter(h => !ocupados.includes(h));
      res.json({ success: true, data: { date, ocupados, libres } });
    } catch (error) {
      logger.error("Failed to check availability", error);
      res.status(500).json({ success: false, error: "Error al verificar disponibilidad", code: 500 });
    }
  });

  // POST /api/interviews — crear cita (el agente la llama automáticamente)
  router.post("/", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const {
        candidateId, candidateName, vacante, canal, phone,
        date, time, location, agentId, notes, score, restricciones,
      } = req.body;

      if (!date || !time || !location) {
        return res.status(400).json({ success: false, error: "date, time y location son requeridos", code: 400 });
      }

      // Validar que el horario esté libre
      const all = await readRuntimeCollection<InterviewSlot>(FILE);
      const conflicto = all.find(s =>
        s.companyId === companyId &&
        s.date === date &&
        s.time === time &&
        !["cancelled","no_show"].includes(s.status)
      );
      if (conflicto) {
        return res.status(409).json({
          success: false,
          error: `Horario ${time} del ${date} ya está ocupado por ${conflicto.candidateName || "otro candidato"}`,
          code: 409,
          conflicto,
        });
      }

      const now = Date.now();
      const slot: InterviewSlot = {
        id: `slot-${now}-${Math.random().toString(36).slice(2, 8)}`,
        companyId, candidateId, candidateName, vacante, canal, phone,
        date, time, location, agentId, notes,
        score: score ?? null,
        restricciones: restricciones ?? [],
        status: "scheduled",
        reminderSent: false,
        confirmationSent: false,
        createdAt: now,
        updatedAt: now,
      };
      all.push(slot);
      await writeRuntimeCollection(FILE, all);
      logger.info(`Interview scheduled: ${candidateName} → ${date} ${time} (${vacante})`);
      res.status(201).json({ success: true, data: slot });
    } catch (error) {
      logger.error("Failed to create interview slot", error);
      res.status(500).json({ success: false, error: "Error al crear slot de entrevista", code: 500 });
    }
  });

  // POST /api/interviews/bulk — crea múltiples citas de una vez (usado por simulación)
  router.post("/bulk", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const { slots: incoming } = req.body as { slots: Partial<InterviewSlot>[] };
      if (!Array.isArray(incoming) || incoming.length === 0) {
        return res.status(400).json({ success: false, error: "slots[] requerido", code: 400 });
      }

      const all = await readRuntimeCollection<InterviewSlot>(FILE);
      const created: InterviewSlot[] = [];
      const conflictos: any[] = [];

      for (const item of incoming) {
        if (!item.date || !item.time) { conflictos.push({ item, reason: "Faltan date/time" }); continue; }

        const conflicto = all.find(s =>
          s.companyId === companyId &&
          s.date === item.date &&
          s.time === item.time &&
          !["cancelled","no_show"].includes(s.status)
        );
        if (conflicto) { conflictos.push({ item, reason: "Horario ocupado" }); continue; }

        const now = Date.now();
        const slot: InterviewSlot = {
          id: `slot-${now}-${Math.random().toString(36).slice(2, 8)}`,
          companyId,
          candidateId: item.candidateId,
          candidateName: item.candidateName,
          vacante: item.vacante,
          canal: item.canal,
          phone: item.phone,
          date: item.date!,
          time: item.time!,
          location: item.location || "Oficinas Iztapalapa, CDMX",
          agentId: item.agentId,
          notes: item.notes,
          score: item.score ?? null,
          restricciones: item.restricciones ?? [],
          status: "scheduled",
          reminderSent: false,
          confirmationSent: false,
          createdAt: now,
          updatedAt: now,
        };
        all.push(slot);
        created.push(slot);
      }

      if (created.length > 0) await writeRuntimeCollection(FILE, all);
      logger.info(`Bulk interview creation: ${created.length} OK, ${conflictos.length} conflictos`);
      res.status(207).json({ success: true, data: { created, conflictos } });
    } catch (error) {
      logger.error("Failed to bulk create interview slots", error);
      res.status(500).json({ success: false, error: "Error en creación masiva", code: 500 });
    }
  });

  // PUT /api/interviews/:id — actualizar slot
  router.put("/:id", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const all = await readRuntimeCollection<InterviewSlot>(FILE);
      const idx = all.findIndex((s) => s.id === req.params.id && s.companyId === companyId);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: "Slot no encontrado", code: 404 });
      }
      const updated: InterviewSlot = {
        ...all[idx],
        ...req.body,
        id: req.params.id,
        companyId,
        updatedAt: Date.now(),
      };
      all[idx] = updated;
      await writeRuntimeCollection(FILE, all);
      logger.info(`Interview updated: ${req.params.id} → status=${updated.status}`);
      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error("Failed to update interview slot", error);
      res.status(500).json({ success: false, error: "Error al actualizar slot de entrevista", code: 500 });
    }
  });

  // PUT /api/interviews/:id/confirm — confirmar cita vía agente/candidato
  router.put("/:id/confirm", authMiddleware, async (req, res) => {
    try {
      const companyId = getCompanyId(req as AuthRequest);
      const all = await readRuntimeCollection<InterviewSlot>(FILE);
      const idx = all.findIndex(s => s.id === req.params.id && s.companyId === companyId);
      if (idx === -1) return res.status(404).json({ success: false, error: "Slot no encontrado" });

      all[idx] = { ...all[idx], status: "confirmed", confirmationSent: true, updatedAt: Date.now() };
      await writeRuntimeCollection(FILE, all);
      res.json({ success: true, data: all[idx] });
    } catch (error) {
      logger.error("Failed to confirm interview slot", error);
      res.status(500).json({ success: false, error: "Error al confirmar cita", code: 500 });
    }
  });

  // DELETE /api/interviews/:id — cancelar slot
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
