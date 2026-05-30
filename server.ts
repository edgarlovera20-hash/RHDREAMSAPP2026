import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Server-side Gemini API client
  const apiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // API endpoint for AI responses with candidates
  app.post("/api/gemini/reply", async (req, res) => {
    try {
      const { candidate, agentPrompt, history, customUserPrompt } = req.body;

      if (!ai) {
        return res.json({
          reply: `[Simulación de Agente] Hola ${candidate?.name || "Candidato"}. Como la API Key de Gemini no está configurada, responderé en modo simulación para que el flujo de reclutamiento funcione sin interrupciones. Hemos registrado tu interés en el puesto de ${candidate?.role || "nuestra vacante"}. ¿Te gustaría agendar una entrevista?`,
          simulated: true
        });
      }

      // Structure prompt representing candidate information and history
      const systemInstruction = `
Eres un asistente de reclutamiento altamente calificado de Heavenly Dreams.
Tus reglas e instrucciones de comportamiento principales son:
${agentPrompt || "Hablar de forma muy profesional y empática."}

Información sobre el candidato a atender:
- Nombre: ${candidate?.name || "No especificado"}
- Puesto de interés: ${candidate?.role || "No especificado"}
- Ubicación: ${candidate?.location || "No especificado"}
- Experiencia: ${candidate?.experience || "No especificado"}
- Pretensión salarial: ${candidate?.salaryDemand || "No especificada"}
- Notas/Historial rápido: ${candidate?.notes || "Sin notas anteriores"}

Conversación previa:
${(history || []).map((h: any) => `${h.sender === "me" ? "Asistente" : "Candidato"}: ${h.body || h.text}`).join("\n")}
      `;

      const userMsg = customUserPrompt || "Saluda cordialmente al candidato para iniciar la conversación.";

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userMsg,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7
        }
      });

      const replyText = response.text || "Lo siento, no pude procesar la respuesta.";
      res.json({ reply: replyText, simulated: false });

    } catch (err: any) {
      console.error("Gemini API Error:", err);
      res.status(500).json({ error: err.message || "Error calling Gemini API" });
    }
  });

  // API endpoint for Agents page chat (interactive prompts)
  app.post("/api/gemini/agent/reply", async (req, res) => {
    try {
      const { agentName, systemPrompt, conversationHistory, userPrompt } = req.body;

      if (!ai) {
        // High quality fallback simulations if Gemini API Key is missing:
        let simulatedReply = "";
        
        if (agentName?.toLowerCase().includes("políticas") || agentName?.toLowerCase().includes("facebook")) {
          simulatedReply = `### 📋 REPORTE DE AUDITORÍA: ESPECIALISTA EN POLÍTICAS FACEBOOK ADS
**Estado:** ⚠️ DETALLES DE CORRECCIÓN (Simulado)

He analizado tu propuesta de copy publicitario: *"${userPrompt}"*.

#### 🔍 Puntos Críticos Encontrados:
1. **Posible discriminación indirecta o sesgo de edad:** Si limitas u orientas a audiencias muy específicas usando términos como "Buscamos jóvenes" o "Ideal para recién graduados", infringes la política de Meta para la **Categoría Especial de Empleo**.
2. **Atribución de características personales:** Evita formular preguntas que asuman características del usuario directas (ej. "¿Estás desempleado?").

#### 🛠️ Versión Corregida y Optimizada (100% Cumplimiento):
"¡Únete a nuestro gran equipo de Heavenly Dreams! 🌟 Buscamos talento con pasión y orientación al detalle en servicio al cliente. Ofrecemos prestaciones superiores de ley, capacitación pagada de primer nivel y un excelente ambiente dinámico. ¡Ingresa hoy mismo para iniciar tu postulación! Enlace directo en el perfil."

*(Esta es una respuesta simulada por falta de credenciales de Gemini; configura la clave en Settings para respuestas reales).*`;
        } else if (agentName?.toLowerCase().includes("empleo") || agentName?.toLowerCase().includes("vacantes")) {
          simulatedReply = `### 📢 BORRADOR DE VACANTE PROFESIONAL
Generado en base a tu prompt: **"${userPrompt}"**

---

#### 🌟 ¡Estamos Contratando! - Únete al Equipo de Heavenly Dreams

¿Quieres llevar tu carrera al siguiente nivel trabajando en una de las empresas de mayor crecimiento? Buscamos un profesional creativo y proactivo para ocupar la posición de la vacante solicitada.

#### 📝 Responsabilidades Principales:
- Desarrollar e implementar soluciones eficientes de acuerdo al rol técnico especificado.
- Colaborar estrechamente con equipos multidisciplinarios para alcanzar los objetivos estratégicos establecidos.
- Optimizar procesos existentes aplicando mejores prácticas de la industria.

#### 🔧 Requisitos del Perfil:
- Experiencia demostrada relevante al puesto (mínimo 1-2 años).
- Conocimientos prácticos y técnicos sólidos en la materia.
- Excelentes habilidades de resolución de problemas, comunicación asertiva y autogestión.

#### 🎁 Beneficios & Qué Ofrecemos:
- 💼 Contratación directa con prestaciones superiores de ley.
- 📈 Oportunidad real de crecimiento y plan de carrera personalizado.
- 🧘 Horarios equilibrados y un ambiente enfocado en el bienestar (Heavenly Culture).

#### ✉️ ¿Cómo Postularse?
Envía tu CV actualizado contestando a este mensaje o postula a través de nuestra plataforma de candidatos para agendar una entrevista express.

---
*(Esta es una respuesta simulada por falta de credenciales de Gemini; configura la clave en Settings para respuestas reales).*`;
        } else {
          simulatedReply = `### ⚡ MARCOS PERSUASIVOS DE VENTAS Y AD COPY
Generado en base a tu prompt: **"${userPrompt}"**

---

#### 🧠 Fórmula 1: AIDA (Atención, Interés, Deseo, Acción)
- **Atención (Hook):** ¡El trabajo de tus sueños está a un solo mensaje de distancia! 🚀
- **Interés:** En Heavenly Dreams abrimos vacantes que se ajustan a tu estilo de vida con grandes recompensas desde el primer día.
- **Deseo:** Olvídate del ambiente laboral tóxico. Disfruta un paquete de beneficios prémium, equipo de alto nivel y estabilidad garantizada.
- **Acción (CTA):** Deja un comentario o haz clic aquí abajo para que nuestro asistente AI te agende para hoy mismo. ¡Cupos limitados!

---

#### 🤝 Fórmula 2: PAS (Problema, Agitación, Solución)
- **Problema:** ¿Cansado de postularte a ofertas de trabajo fantasmas que nunca dan respuesta?
- **Agitación:** Horas actualizando tu currículum para que termines archivado en un software impersonal que no te valora.
- **Solución:** En Heavenly Dreams valoramos tu tiempo. Nuestro asistente virtual procesa tu solicitud en vivo y te contacta de inmediato para agendar entrevista real en 24 horas. ¡Postúlate ya!

---
*(Esta es una respuesta simulada por falta de credenciales de Gemini; configura la clave en Settings para respuestas reales).*`;
        }
        return res.json({ reply: simulatedReply, simulated: true });
      }

      // Structure systemInstruction according to gemini-api skill rules
      const finalPrompt = systemPrompt || "Eres un asistente virtual de Heavenly Dreams.";
      const historyFormatted = (conversationHistory || []).map((h: any) => `${h.role === "user" ? "Usuario" : "Agente"}: ${h.text || h.body}`).join("\n");

      const systemInstruction = `
${finalPrompt}

Utiliza la conversación previa si es relevante:
${historyFormatted}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt || "Por favor ayúdame con una idea.",
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8
        }
      });

      const replyText = response.text || "Lo siento, no pude procesar la respuesta.";
      res.json({ reply: replyText, simulated: false });

    } catch (err: any) {
      console.error("Gemini Agent API Error:", err);
      res.status(500).json({ error: err.message || "Error calling Gemini Agent API" });
    }
  });

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", port: PORT });
  });

  // Setup Vite middleware for development or Static server for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Fullstack Server] running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server Start Failed:", err);
});
