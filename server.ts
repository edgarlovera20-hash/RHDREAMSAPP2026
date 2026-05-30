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
