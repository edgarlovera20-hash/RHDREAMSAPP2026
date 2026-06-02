# Arquitectura productiva RHDreams

Fecha: 2026-06-02

## Decisión

La arquitectura oficial para producción es:

- Frontend React/Vite servido como sitio estático.
- Backend Node/Express persistente para IA, Baileys, Meta, colas, auditoría y webhooks.
- Firestore como base operacional y espejo de UI en tiempo real.
- `.sessions/runtime` como almacenamiento local transitorio del backend actual para conversaciones, mensajes y auditoría hasta migrar a Firebase Admin.

## Flujo de chat aprobado

1. El usuario o una integración registra un mensaje.
2. El backend crea o actualiza una `Conversation`.
3. El backend guarda un `Message` con estado trazable.
4. La IA genera una salida estructurada: respuesta, intención, confianza y aprobación requerida.
5. La respuesta IA se guarda como `pending_approval` salvo que el modo de la conversación permita envío automático seguro.
6. El reclutador aprueba o rechaza el mensaje desde la bandeja.
7. Cada acción queda en `audit-log.jsonl`.

## Pendiente para fase Firebase Admin

- Mover `conversations`, `messages`, `workflowRuns` y `auditLogs` de `.sessions/runtime` a Firestore mediante Firebase Admin.
- Agregar custom claims `companyId` y `role` a los usuarios Firebase.
- Eliminar escrituras directas restantes del frontend para candidatos, agentes, automatizaciones y citas.

