import { readRuntimeCollection, writeRuntimeCollection } from "./runtimeStore.service";
import { sendBaileysMessage } from "./baileys.service";
import { logger } from "../utils/logger";
import type { InterviewSlot } from "../routes/interviews.routes";

const FILE = "interview-slots.json";
const DEFAULT_SESSION = process.env.BAILEYS_DEFAULT_SESSION || "whatsapp-rh-1";

// Mensajes de recordatorio
const buildReminderMsg = (slot: InterviewSlot): string => {
  const nombre = slot.candidateName || "candidato";
  return `Hola ${nombre} 👋

Te recordamos que tienes una entrevista programada:

📅 Fecha: ${slot.date}
🕐 Hora: ${slot.time}
📍 Lugar: ${slot.location || "Av. Tláhuac 3632 A301, Col. Culhuacan, Iztapalapa, CDMX"}

🚇 Referencia: Metro Culhuacán dirección Mixcoac, junto a Farmacias Similares, arriba de la escuela de belleza.

📋 Recuerda traer:
• INE, CURP y RFC
• Comprobante de domicilio
• Comprobante de estudios

Por favor confirma tu asistencia respondiendo SÍ o NO.

¡Te esperamos! 😊`;
};

const buildConfirmationRequestMsg = (slot: InterviewSlot): string => {
  const nombre = slot.candidateName || "candidato";
  return `Hola ${nombre}, ¿confirmas tu asistencia a la entrevista de mañana a las ${slot.time}? Responde SÍ o NO para avisar al equipo. ¡Gracias! 🙏`;
};

const buildSameDayMsg = (slot: InterviewSlot): string => {
  const nombre = slot.candidateName || "candidato";
  return `¡Buenos días ${nombre}! 🌟 Hoy es tu entrevista a las ${slot.time} en ${slot.location || "nuestras oficinas"}. ¡Te esperamos! Cualquier imprevisto avísanos aquí mismo.`;
};

// Determina si un slot necesita recordatorio
function needsReminder(slot: InterviewSlot): { type: "24h" | "sameday" | null } {
  if (!slot.phone) return { type: null };
  if (!["scheduled", "confirmed"].includes(slot.status)) return { type: null };

  const now = new Date();
  const interviewDate = new Date(`${slot.date}T${slot.time}:00`);
  const diffMs = interviewDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // Recordatorio del mismo día (entre 1 y 4 horas antes)
  if (diffHours > 0 && diffHours <= 4 && !slot.reminderSent) {
    return { type: "sameday" };
  }

  // Recordatorio 24 horas antes (entre 20 y 26 horas)
  if (diffHours > 20 && diffHours <= 26 && !slot.reminderSent) {
    return { type: "24h" };
  }

  return { type: null };
}

// Procesa recordatorios pendientes
export async function processInterviewReminders(): Promise<void> {
  try {
    const all = await readRuntimeCollection<InterviewSlot>(FILE);
    const pending = all.filter((s) => needsReminder(s).type !== null);

    if (pending.length === 0) return;

    logger.info(`Interview reminders: ${pending.length} pendientes`);

    let updated = false;
    for (const slot of pending) {
      const { type } = needsReminder(slot);
      if (!type || !slot.phone) continue;

      const phone = slot.phone.replace(/\D/g, ""); // solo dígitos
      const sessionId = (slot as any).sessionId || DEFAULT_SESSION;

      try {
        const msg = type === "sameday"
          ? buildSameDayMsg(slot)
          : buildReminderMsg(slot);

        await sendBaileysMessage({ sessionId, to: phone, body: msg });

        // Marcar como enviado
        const idx = all.findIndex((s) => s.id === slot.id);
        if (idx !== -1) {
          all[idx] = { ...all[idx], reminderSent: true, updatedAt: Date.now() };
          updated = true;
        }

        logger.info(`Reminder sent: ${slot.candidateName} → ${phone} (${type})`);
      } catch (err) {
        logger.warn(`Failed to send reminder to ${phone}`, { error: String(err), slotId: slot.id });
      }
    }

    if (updated) await writeRuntimeCollection(FILE, all);
  } catch (err) {
    logger.error("processInterviewReminders failed", err);
  }
}

// Procesa solicitudes de confirmación (48h antes)
export async function processConfirmationRequests(): Promise<void> {
  try {
    const all = await readRuntimeCollection<InterviewSlot>(FILE);

    const now = new Date();
    const pending = all.filter((slot) => {
      if (!slot.phone) return false;
      if (slot.status !== "scheduled") return false;
      if (slot.confirmationSent) return false;

      const interviewDate = new Date(`${slot.date}T${slot.time}:00`);
      const diffHours = (interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours > 44 && diffHours <= 50; // ~48h antes
    });

    if (pending.length === 0) return;

    let updated = false;
    for (const slot of pending) {
      const phone = slot.phone!.replace(/\D/g, "");
      const sessionId = (slot as any).sessionId || DEFAULT_SESSION;

      try {
        await sendBaileysMessage({
          sessionId,
          to: phone,
          body: buildConfirmationRequestMsg(slot),
        });

        const idx = all.findIndex((s) => s.id === slot.id);
        if (idx !== -1) {
          all[idx] = { ...all[idx], confirmationSent: true, updatedAt: Date.now() };
          updated = true;
        }

        logger.info(`Confirmation request sent: ${slot.candidateName} → ${phone}`);
      } catch (err) {
        logger.warn(`Failed to send confirmation to ${phone}`, { error: String(err) });
      }
    }

    if (updated) await writeRuntimeCollection(FILE, all);
  } catch (err) {
    logger.error("processConfirmationRequests failed", err);
  }
}

// Scheduler principal — llama cada 15 minutos
let reminderTimer: ReturnType<typeof setInterval> | null = null;

export function startInterviewReminderScheduler(): void {
  if (reminderTimer) return; // ya iniciado

  const INTERVAL_MS = 15 * 60 * 1000; // 15 minutos

  // Primera ejecución al arrancar (con delay de 30s para que WhatsApp conecte)
  setTimeout(() => {
    void processInterviewReminders();
    void processConfirmationRequests();
  }, 30_000);

  reminderTimer = setInterval(() => {
    void processInterviewReminders();
    void processConfirmationRequests();
  }, INTERVAL_MS);

  logger.info("Interview reminder scheduler started (every 15 min)");
}

export function stopInterviewReminderScheduler(): void {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
    logger.info("Interview reminder scheduler stopped");
  }
}
