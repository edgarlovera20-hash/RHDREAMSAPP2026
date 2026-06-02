# Plan Maestro de Mejora - RHDreamsApp 2026

**Fecha:** 2026-06-02  
**Repositorio:** RHDREAMSAPP2026  
**Objetivo:** mejorar la lógica de chats, flujos, arquitectura, frontend, backend, OCR documental, versión móvil y UX/UI de la aplicación.

## 1. Resumen ejecutivo

La aplicación ya tiene una base funcional fuerte: React + Vite, Firebase/Firestore, backend Express, rutas serverless para Vercel/Cloudflare, módulos de candidatos, mensajes, agentes IA, flujos IA, reportes, Google Workspace e integraciones.

La prioridad debe ser convertirla de una app demostrativa o semiprototipo en una plataforma de reclutamiento robusta, segura y escalable. Los puntos más urgentes son: cerrar reglas de Firestore, mover la lógica crítica del frontend al backend, formalizar conversaciones y mensajes, usar historial real en IA, unificar automatizaciones con workflows, optimizar OCR para CVs/documentos, preparar una experiencia móvil de primer nivel y definir una arquitectura de despliegue única.

## 2. Diagnóstico principal

### 2.1 Seguridad

- Las reglas de Firestore deben dejar de permitir lectura y escritura pública.
- Las operaciones sensibles deben requerir usuario autenticado, rol y empresa.
- Los endpoints de IA deben validar identidad real, no auth opcional.
- Deben eliminarse secretos fallback o valores por defecto inseguros.
- El frontend no debe escribir directamente mensajes, automatizaciones, agentes o etapas críticas sin pasar por backend.

### 2.2 Chats

- La pantalla de mensajes infiere conversaciones desde candidatos y mensajes, pero falta una entidad formal `Conversation`.
- La respuesta IA se guarda como WhatsApp aunque el canal original pueda ser Instagram, Messenger, email o manual.
- La IA recibe historial desde el cliente, pero el backend debe convertirlo en contexto real para el modelo.
- Las etapas no deben cambiar por palabras clave en el texto de la IA; deben cambiar por intención estructurada y validada.
- Falta trazabilidad de estado: enviado, entregado, leído, fallido, pendiente de aprobación, escalado humano y borrador IA.

### 2.3 Flujos y automatizaciones

- Hoy conviven automatizaciones simples en el hook de datos y un builder de workflows más avanzado.
- El workflow actual valida variables y marca pasos como completados, pero no ejecuta acciones reales de negocio.
- Hace falta una sola fuente de verdad para triggers, condiciones, pasos, aprobaciones, logs y resultados.
- Las aprobaciones humanas deben integrarse al chat y no quedar separadas en una pantalla de flujos.

### 2.4 Backend

- Hay Express, Vercel serverless y Cloudflare Pages Functions con comportamientos distintos.
- La app necesita decidir una arquitectura oficial: backend Node persistente o serverless con proveedores compatibles.
- WhatsApp normal con Baileys requiere servidor persistente; si se quiere serverless, conviene WhatsApp Business Cloud API.
- La lógica de negocio debe vivir en servicios backend: conversaciones, mensajes, IA, flujos, estados de candidato e integraciones.

### 2.5 Frontend y UX/UI

- La navegación es completa y está bien segmentada por módulos.
- La pantalla de chat necesita estados operativos claros: IA pensando, requiere aprobación, escalado, error, no enviado, SLA vencido.
- Los estados vacíos deben invitar a crear candidato, importar conversación, conectar canal o simular una conversación.
- El usuario debe poder ver por qué la IA tomó una decisión, qué datos usó y qué workflow se ejecutó.

### 2.6 OCR documental

- El reclutamiento necesita extraer datos de CVs, identificaciones, comprobantes, certificados, formularios escaneados e imágenes recibidas por WhatsApp.
- El OCR debe separar extracción de texto, clasificación documental, validación, scoring y revisión humana.
- No debe sobrescribir datos del candidato automáticamente si la confianza es baja o si detecta documentos sensibles.
- Debe guardar evidencia, fuente, versión del extractor, confianza por campo y auditoría de aprobación.

### 2.7 Versión móvil

- La app debe funcionar como experiencia mobile-first para reclutadores que atienden candidatos desde teléfono.
- El chat, la revisión de documentos, la aprobación de respuestas IA y la agenda deben estar optimizados para pantallas pequeñas.
- La versión móvil debe soportar PWA instalable, navegación inferior, acciones rápidas, offline básico y carga progresiva.
- El diseño debe reducir tablas anchas, modales grandes y paneles simultáneos en favor de tarjetas, drawers y flujos por pasos.

## 3. Modelo de datos propuesto

### 3.1 Conversation

```ts
Conversation {
  id: string;
  companyId: string;
  candidateId: string;
  channel: "whatsapp" | "instagram" | "messenger" | "email" | "manual";
  provider: "baileys" | "meta" | "gmail" | "manual";
  status: "open" | "pending_ai" | "pending_human" | "closed";
  assignedAgentId?: string;
  assignedRecruiterId?: string;
  lastMessageAt: number;
  unreadCount: number;
  tags: string[];
  aiMode: "off" | "suggest" | "auto_with_approval" | "auto_send";
}
```

### 3.2 Message

```ts
Message {
  id: string;
  companyId: string;
  conversationId: string;
  candidateId: string;
  channel: string;
  direction: "inbound" | "outbound";
  body: string;
  status: "draft" | "pending_approval" | "sent" | "delivered" | "read" | "failed";
  providerMessageId?: string;
  sentAt?: number;
  deliveredAt?: number;
  readAt?: number;
  failedReason?: string;
  aiGenerated?: boolean;
  aiAgentId?: string;
  aiConfidence?: number;
  intent?: string;
  sentiment?: string;
  requiresApproval?: boolean;
  approvedBy?: string;
  approvedAt?: number;
  dedupeKey?: string;
}
```

### 3.3 WorkflowRun

```ts
WorkflowRun {
  id: string;
  companyId: string;
  workflowId: string;
  entityType: "candidate" | "conversation" | "appointment";
  entityId: string;
  status: "queued" | "running" | "approval_required" | "completed" | "failed";
  startedAt: number;
  finishedAt?: number;
  logs: WorkflowRunLog[];
}
```

### 3.4 DocumentOcrJob

```ts
DocumentOcrJob {
  id: string;
  companyId: string;
  candidateId?: string;
  conversationId?: string;
  source: "upload" | "whatsapp" | "email" | "drive" | "camera";
  documentType: "cv" | "id" | "proof_of_address" | "certificate" | "unknown";
  fileUrl: string;
  status: "queued" | "processing" | "needs_review" | "completed" | "failed";
  extractedText?: string;
  extractedFields: Record<string, { value: string; confidence: number }>;
  overallConfidence: number;
  requiresHumanReview: boolean;
  reviewedBy?: string;
  reviewedAt?: number;
  createdAt: number;
}
```

### 3.5 MobileSessionState

```ts
MobileSessionState {
  userId: string;
  companyId: string;
  deviceId: string;
  lastRoute: string;
  preferredInboxFilter?: string;
  offlineQueueCount: number;
  pushEnabled: boolean;
  lastSyncAt: number;
}
```

## 4. Roadmap recomendado

### Fase 0 - Seguridad y control de datos

1. Cerrar Firestore con reglas por `request.auth`, `companyId` y rol.
2. Desactivar escrituras públicas en candidatos, mensajes, agentes, workflows y notificaciones.
3. Validar Firebase ID Token en backend.
4. Sustituir autenticación opcional por autenticación obligatoria en endpoints de IA.
5. Agregar auditoría mínima: quién creó, actualizó, aprobó o envió cada acción.

### Fase 1 - Chat robusto

1. Crear entidad `Conversation` y migrar la pantalla de mensajes para usarla.
2. Agregar estados de mensajes y trazabilidad de proveedor.
3. Corregir el canal de respuesta IA para respetar el canal original.
4. Mostrar estados UX: “IA redactando”, “pendiente de aprobación”, “enviado”, “falló”, “escalado”.
5. Agregar panel lateral de candidato dentro del chat con vacante, etapa, tags, últimos eventos y próximo paso.

### Fase 2 - IA conversacional confiable

1. Crear `ai-orchestrator.service.ts` en backend.
2. Enviar historial real al modelo, no solo el último prompt.
3. Pedir salida JSON estructurada: respuesta, intención, confianza, siguiente etapa, campos faltantes y escalamiento.
4. Validar la salida con Zod antes de guardar cualquier decisión.
5. Activar aprobación humana para respuestas sensibles: rechazo, salario, documentos, temas legales o baja confianza.

### Fase 3 - Workflows reales

1. Unificar automatizaciones simples y workflows visuales.
2. Crear colecciones `workflows`, `workflowRuns` y `workflowRunLogs`.
3. Convertir pasos simulados en acciones reales: mensaje, IA, condición, calendario, tarea, webhook y handoff.
4. Agregar simulador de workflow con candidato real.
5. Agregar versionado, publicación y rollback de flujos.

### Fase 4 - Backend productivo

1. Decidir arquitectura oficial.
2. Si se requiere Baileys/WhatsApp normal, usar backend Node persistente en VPS/Render/Fly/Railway.
3. Si se quiere serverless puro, migrar a WhatsApp Business Cloud API.
4. Eliminar divergencia entre Express, Vercel y Cloudflare o documentar responsabilidades claras.
5. Implementar Firebase Admin en backend y repositorios por entidad.

### Fase 5 - OCR y documentos inteligentes

1. Crear pipeline OCR para CVs, identificaciones, comprobantes y documentos enviados por WhatsApp/email/upload.
2. Clasificar documentos antes de extraer campos y aplicar reglas por tipo documental.
3. Extraer campos con confianza por dato: nombre, teléfono, email, experiencia, ubicación, habilidades, escolaridad, documentos faltantes y fechas.
4. Enviar a revisión humana cualquier documento sensible, ilegible, duplicado o con confianza baja.
5. Conectar OCR con scoring de candidato, enriquecimiento del perfil y checklist de contratación.

### Fase 6 - Versión móvil y PWA

1. Rediseñar navegación móvil con bottom navigation, drawers y acciones rápidas.
2. Optimizar chat móvil para responder, aprobar IA, grabar audio, adjuntar documentos y agendar en pocos taps.
3. Convertir tablas y kanban complejos en tarjetas responsive y vistas resumidas.
4. Agregar PWA instalable, push notifications, cache de shell, offline queue para borradores y sincronización segura.
5. Medir Core Web Vitals móviles, tamaño de bundle, latencia de primer render y tiempo hasta responder un chat.

### Fase 7 - UX/UI y métricas

1. Rediseñar chat con bandejas por estado y prioridad.
2. Crear estados vacíos accionables.
3. Integrar aprobaciones IA dentro del chat.
4. Mostrar explicación de decisiones IA, resultados OCR y logs de workflow.
5. Medir KPIs: tiempo de respuesta, show rate, tasa de conversión, escalaciones, tasa de error por proveedor, precisión OCR, revisión humana y rendimiento por agente.

## 5. Arquitectura backend recomendada

La opción más práctica para esta app es:

- Frontend en Cloudflare Pages.
- Backend Node persistente para IA, WhatsApp/Baileys, colas y cron jobs.
- Firebase Auth para identidad.
- Firebase Admin en backend para Firestore.
- Firestore como base operacional.
- Cloud Tasks, BullMQ, Redis o cola equivalente para eventos asíncronos.
- Workers o funciones serverless solo para endpoints simples si se decide mantener Cloudflare.

Esta arquitectura evita que WhatsApp Web falle por falta de socket persistente y permite ejecutar flujos largos, reintentos, aprobaciones y trabajos programados.

## 6. Servicios backend propuestos

```txt
server/services/conversation.service.ts
server/services/message.service.ts
server/services/ai-orchestrator.service.ts
server/services/recruitment-state.service.ts
server/services/workflow-engine.service.ts
server/services/handoff.service.ts
server/services/audit-log.service.ts
server/services/ocr.service.ts
server/services/document-intelligence.service.ts
server/services/mobile-sync.service.ts
server/repositories/candidates.repository.ts
server/repositories/conversations.repository.ts
server/repositories/messages.repository.ts
server/repositories/workflows.repository.ts
server/repositories/appointments.repository.ts
server/repositories/ocr-jobs.repository.ts
server/repositories/mobile-session.repository.ts
```

## 7. UX/UI propuesta para chat

- Bandejas: Todos, Sin responder, Pendiente IA, Pendiente aprobación, Escalados, Cerrados.
- Badges visibles por conversación.
- Composer con acciones rápidas: sugerir respuesta, aprobar y enviar, agendar, escalar, insertar plantilla.
- Vista de candidato al lado derecho: datos, vacante, etapa, score, próximos pasos, historial y notas.
- Timeline de eventos: mensaje recibido, IA generó borrador, reclutador aprobó, workflow ejecutado, cita agendada.
- Filtros por canal, vacante, agente, etapa, prioridad y SLA.

## 8. Plan específico de OCR optimizado

### 8.1 Pipeline OCR recomendado

1. Ingesta: recibir archivo desde upload, WhatsApp, email, Drive o cámara móvil.
2. Preprocesamiento: normalizar orientación, contraste, tamaño, ruido, compresión y páginas.
3. Clasificación: detectar si es CV, identificación, comprobante, certificado, formulario o desconocido.
4. Extracción OCR: obtener texto completo y bloques con posición.
5. Extracción semántica: convertir texto a campos normalizados con IA y reglas determinísticas.
6. Validación: comparar campos contra candidato, vacante, teléfono, email y documentos requeridos.
7. Revisión humana: solicitar aprobación si hay baja confianza, datos sensibles o conflicto.
8. Persistencia: guardar texto, campos, confianza, fuente, versión del extractor y auditoría.

### 8.2 Reglas de calidad OCR

- No aceptar OCR como verdad absoluta si `overallConfidence` es menor a 0.85.
- No actualizar teléfono, email, nombre legal o documentos sensibles sin aprobación humana.
- Detectar duplicados por hash de archivo y similitud de texto.
- Guardar el documento original y el resultado OCR por separado.
- Permitir corrección manual de campos extraídos y usar esa corrección para aprendizaje supervisado.

### 8.3 UX OCR

- Vista móvil y desktop para revisar documento al lado del texto extraído.
- Resaltar campos con baja confianza.
- Botones rápidos: aprobar, corregir, rechazar, pedir documento nuevamente.
- Mostrar checklist de documentos por candidato.
- Usar OCR para autocompletar perfil y sugerir vacantes compatibles.

## 9. Plan específico de versión móvil

### 9.1 Principios mobile-first

- Priorizar inbox, candidato, agenda y aprobaciones IA como navegación inferior.
- Reducir formularios largos a pasos cortos con guardado automático.
- Usar drawers en vez de modales grandes.
- Mantener botones táctiles de al menos 44px y evitar targets pequeños.
- Optimizar performance para redes móviles lentas.

### 9.2 Funciones móviles clave

- PWA instalable con manifest, service worker y cache de shell.
- Push notifications para nuevos mensajes, citas próximas y aprobaciones pendientes.
- Offline queue para borradores de mensajes, notas y cambios no críticos.
- Cámara móvil para subir documentos y disparar OCR.
- Audio rápido: grabar, transcribir, revisar y responder.
- Agenda móvil con confirmación, reprogramación y recordatorios.

### 9.3 Métricas móviles

- Largest Contentful Paint móvil menor a 2.5s.
- Interaction to Next Paint menor a 200ms en acciones de chat.
- Tiempo para aprobar y enviar respuesta IA menor a 20s.
- Bundle inicial por debajo de 250KB comprimido cuando sea posible.
- Tasa de errores offline/sync menor al 1%.

## 10. Checklist de implementación inmediata

- [ ] Cerrar reglas públicas de Firestore.
- [ ] Crear `Conversation` y migrar chat.
- [ ] Mover `triggerAgentDialogue` del frontend al backend.
- [ ] Usar historial real en IA.
- [ ] Exigir salida JSON estructurada de IA.
- [ ] Agregar aprobación humana.
- [ ] Unificar workflows y automatizaciones.
- [ ] Definir backend productivo único.
- [ ] Crear pipeline OCR con revisión humana.
- [ ] Agregar PWA, navegación móvil y push notifications.
- [ ] Crear pruebas unitarias, E2E, OCR fixtures y pruebas responsive.
- [ ] Documentar variables de entorno y despliegue real.

## 11. Indicadores de éxito

- Cero escrituras públicas en Firestore.
- 100% de respuestas IA auditables.
- Menos falsos cambios de etapa por heurísticas.
- Mayor tasa de respuesta en chats.
- Menor tiempo promedio hasta entrevista.
- Mayor show rate de entrevistas.
- Menos errores por proveedor de IA o WhatsApp.
- Workflows con logs y ejecución reproducible.
- Precisión OCR por encima de 90% en CVs legibles y documentos frecuentes.
- Menos de 10% de documentos enviados a revisión por baja calidad después de optimizar captura.
- Tiempo móvil para responder o aprobar IA menor a 20 segundos.
- Core Web Vitals móviles dentro de rangos recomendados.

## 12. Próximo paso sugerido

El primer sprint debería enfocarse en seguridad, chat, OCR base y móvil:

1. Bloquear Firestore público.
2. Crear `Conversation`.
3. Crear endpoint backend para mensajes.
4. Migrar auto-respuesta IA al backend.
5. Agregar aprobación humana antes de enviar respuestas IA.
6. Crear `DocumentOcrJob` y prototipo OCR para CVs/documentos desde upload y cámara móvil.
7. Crear navegación móvil principal: inbox, candidatos, agenda y aprobaciones.

Con eso la app gana seguridad, control operativo, captura documental inteligente y una base móvil sólida para mejorar flujos y UX sin seguir acumulando lógica crítica en el frontend.
