/**
 * Procesador de medios para el agente reclutador.
 * Maneja: imágenes (CV foto), documentos PDF, audios (transcripción).
 */
import { getGeminiService } from "./gemini.service";
import { logger } from "../utils/logger";

export type MediaType = "image" | "audio" | "document" | "video" | "sticker" | "unknown";

export type ProcessedMedia = {
  type: MediaType;
  transcription?: string;   // para audio
  extractedText?: string;   // para imagen/pdf con texto
  description?: string;     // descripción general del contenido
  isCv?: boolean;           // si parece un CV
  agentResponse: string;    // respuesta que el agente enviará al candidato
};

// ─── Analizar imagen con Gemini Vision ───────────────────────────────────────
export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  candidateName?: string,
): Promise<ProcessedMedia> {
  try {
    const gemini = getGeminiService();

    // Usar generateContent directamente con imagen
    const prompt = `Eres un reclutador de RH revisando una imagen enviada por un candidato por WhatsApp.

Analiza la imagen y determina:
1. ¿Es un CV/currículum? Si sí, extrae: nombre, experiencia, estudios, habilidades principales.
2. ¿Es una identificación (INE/credencial)? Si sí, indica que la recibiste.
3. ¿Es un comprobante (estudios, domicilio)? Indica qué tipo.
4. ¿Es otra cosa? Descríbela brevemente.

Responde en formato JSON:
{
  "tipo": "cv" | "identificacion" | "comprobante" | "otro",
  "isCv": true/false,
  "extractedText": "datos relevantes si aplica",
  "descripcion": "descripción breve"
}`;

    // Llamar a Gemini con imagen inline
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_FREE_API_KEY || process.env.GEMINI_PAID_API_KEY || "";
    const client = new GoogleGenAI({ apiKey });

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { data: imageBase64, mimeType } },
        ],
      }],
    });

    const raw = response.text || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const nombre = candidateName || "candidato";
    let agentResponse = "";

    if (parsed.tipo === "cv" || parsed.isCv) {
      agentResponse = `¡Gracias ${nombre}! Recibí tu CV correctamente. 📄\n\nLo revisaré con el equipo de RH y con gusto te comento si tu perfil aplica para alguna de nuestras vacantes.\n\n¿Tienes alguna vacante en especial que te interese?`;
    } else if (parsed.tipo === "identificacion") {
      agentResponse = `Perfecto ${nombre}, recibí tu identificación. ✅\n\nLa guardaré para tu expediente. ¿Tienes algún otro documento que quieras enviar?`;
    } else if (parsed.tipo === "comprobante") {
      agentResponse = `Recibido ${nombre}, gracias por el comprobante. ✅\n\nLo agregaré a tu expediente. ¿Hay algo más en lo que te pueda ayudar?`;
    } else {
      agentResponse = `Recibí tu imagen, gracias ${nombre}. 📸\n\n¿Me puedes indicar qué es lo que me enviaste para ayudarte mejor?`;
    }

    return {
      type: "image",
      extractedText: parsed.extractedText || "",
      description: parsed.descripcion || "",
      isCv: parsed.isCv || parsed.tipo === "cv",
      agentResponse,
    };
  } catch (err) {
    logger.warn("Image analysis failed", { error: String(err) });
    const nombre = candidateName || "candidato";
    return {
      type: "image",
      agentResponse: `Recibí tu imagen, gracias ${nombre}. 📸 ¿Me puedes decir qué es lo que me enviaste?`,
    };
  }
}

// ─── Transcribir audio con Gemini ────────────────────────────────────────────
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
  candidateName?: string,
): Promise<ProcessedMedia> {
  try {
    const gemini = getGeminiService();
    const result = await gemini.transcribeAudio(audioBase64, mimeType, "es", "Conversación de reclutamiento laboral");
    const transcription = result.transcription?.trim() || "";

    const nombre = candidateName || "candidato";
    let agentResponse = "";

    if (transcription) {
      agentResponse = `🎙️ Escuché tu mensaje:\n\n"${transcription}"\n\n`;
      // El agente responde al contenido del audio
      agentResponse += await buildResponseToTranscription(transcription, nombre);
    } else {
      agentResponse = `Recibí tu mensaje de voz ${nombre}, pero tuve dificultades para escucharlo. ¿Puedes escribirme tu consulta? 😊`;
    }

    return {
      type: "audio",
      transcription,
      agentResponse,
    };
  } catch (err) {
    logger.warn("Audio transcription failed", { error: String(err) });
    const nombre = candidateName || "candidato";
    return {
      type: "audio",
      agentResponse: `Recibí tu mensaje de voz ${nombre}. ¿Me puedes escribir tu consulta para atenderte mejor? 😊`,
    };
  }
}

// Genera respuesta contextual al contenido transcrito del audio
async function buildResponseToTranscription(transcription: string, nombre: string): Promise<string> {
  try {
    const gemini = getGeminiService();
    const result = await gemini.generateAgentResponse(
      "Karla",
      `Eres Karla, reclutadora de Heavenly Dreams. El candidato ${nombre} te envió un mensaje de voz que fue transcrito.
Responde de forma natural, breve (2-3 líneas máximo) y guía hacia el proceso de reclutamiento.
Empresa: Heavenly Dreams. Vacantes: Ayudante General ($2,000/sem), Asesor Comercial ($2,300/sem), Supervisor ($2,600/sem).
Ubicación: Iztapalapa, CDMX. Metro Culhuacán.`,
      [],
      transcription,
    );
    return result.reply?.trim() || "¿En qué te puedo ayudar?";
  } catch {
    return "¿En qué te puedo ayudar hoy?";
  }
}

// ─── Analizar documento/PDF ───────────────────────────────────────────────────
export async function analyzeDocument(
  docBase64: string,
  mimeType: string,
  candidateName?: string,
): Promise<ProcessedMedia> {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_FREE_API_KEY || "";
    const client = new GoogleGenAI({ apiKey });

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: [{
        role: "user",
        parts: [
          { text: "¿Qué tipo de documento es este? Si es un CV extrae los datos principales (nombre, experiencia, estudios). Responde muy brevemente." },
          { inlineData: { data: docBase64, mimeType } },
        ],
      }],
    });

    const description = response.text?.trim() || "";
    const nombre = candidateName || "candidato";
    const isCv = /curriculum|cv|experiencia|habilidades/i.test(description);

    return {
      type: "document",
      extractedText: description,
      isCv,
      agentResponse: isCv
        ? `¡Gracias ${nombre}! Recibí tu CV en PDF. 📄 Lo revisaré y te aviso si tu perfil aplica para nuestras vacantes. ¿Tienes alguna en especial que te interese?`
        : `Recibí tu documento ${nombre}. ✅ Lo guardaré para tu expediente. ¿Necesitas algo más?`,
    };
  } catch (err) {
    logger.warn("Document analysis failed", { error: String(err) });
    const nombre = candidateName || "candidato";
    return {
      type: "document",
      agentResponse: `Recibí tu documento ${nombre}. 📎 Lo revisaré con el equipo. ¿Tienes alguna duda sobre nuestras vacantes?`,
    };
  }
}

// ─── Router principal de medios ───────────────────────────────────────────────
export async function processIncomingMedia(options: {
  messageType: string;
  mediaBase64: string;
  mimeType: string;
  caption?: string;
  candidateName?: string;
}): Promise<ProcessedMedia> {
  const { messageType, mediaBase64, mimeType, candidateName } = options;

  if (messageType === "audioMessage" || messageType === "pttMessage") {
    return transcribeAudio(mediaBase64, mimeType || "audio/ogg; codecs=opus", candidateName);
  }

  if (messageType === "imageMessage") {
    return analyzeImage(mediaBase64, mimeType || "image/jpeg", candidateName);
  }

  if (messageType === "documentMessage") {
    return analyzeDocument(mediaBase64, mimeType || "application/pdf", candidateName);
  }

  return {
    type: "unknown",
    agentResponse: `Recibí tu archivo ${candidateName || ""}. ¿Me puedes decir qué es para ayudarte mejor? 😊`,
  };
}
