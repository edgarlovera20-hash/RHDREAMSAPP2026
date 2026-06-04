# WhatsApp Business Meta Cloud API Integration

## Arquitectura Actual

- Frontend: React 18, Vite, Tailwind CSS, React Router.
- Backend: Express en `server.ts`, bundling con esbuild, runtime Node 22.
- Integraciones: rutas `/api/integrations/*` con controladores Express.
- Mensajeria:
  - Baileys QR para WhatsApp Web local/persistente.
  - Meta Cloud API para WhatsApp Business, Messenger, Instagram y Lead Ads.
- Persistencia runtime backend: `.sessions/runtime/*.json` para conversaciones, mensajes, auditoria y sesiones.
- Memoria conversacional: `.sessions/conversations/*.json`.
- Autenticacion API: JWT via `/api/auth/login`.
- Produccion: proceso persistente en DigitalOcean/PM2/nginx, puerto interno 3000.

## Puntos De Integracion WhatsApp Business

- Webhook oficial: `GET/POST /api/integrations/meta/webhook`.
- Modulo nuevo: `server/modules/whatsapp`.
- Cliente Graph API:
  - marcar mensajes como leidos,
  - enviar texto,
  - enviar menu interactivo,
  - enviar plantillas Meta.
- CRM runtime:
  - `server/services/conversation.service.ts`,
  - `server/services/message.service.ts`,
  - `server/services/conversationSession.service.ts`.

## Lo Aplicado En Esta Iteracion

- Se creo un modulo desacoplado para WhatsApp Cloud API:
  - `config.ts`: variables, firma y verify token.
  - `graphApi.service.ts`: llamadas a Graph API sin SDK externo.
  - `templates.ts`: menu inicial de reclutamiento.
  - `recruitmentFlow.service.ts`: lectura de mensajes y respuesta por menu/IA.
  - `webhook.service.ts`: recepcion de mensajes, estados y persistencia.
  - `types.ts`: tipos propios del modulo.
- `meta.service.ts` delega `whatsapp_business_account` al modulo nuevo.
- `message.service.ts` ahora deduplica mensajes por `providerMessageId`/`dedupeKey`.
- `message.service.ts` puede actualizar estados por ID de proveedor para `sent`, `delivered`, `read` y `failed`.
- `.env.example` y `render.yaml` incluyen las variables oficiales de WhatsApp/Meta.

## Variables Necesarias

```text
META_WEBHOOK_VERIFY_TOKEN
META_APP_SECRET
WHATSAPP_CLOUD_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_ACCOUNT_ID
WHATSAPP_AGENT_NAME
META_GRAPH_VERSION
```

`WHATSAPP_APP_SECRET` se acepta como alias opcional si la app de WhatsApp usa un secreto separado.

## Flujo Conversacional Inicial

El primer menu de WhatsApp Business es:

```text
Bienvenido a Heavenly Dreams.

1. Vacantes
2. Seguimiento
3. Entrevista
4. Hablar con reclutador
```

Las opciones 1 a 4 tienen respuestas deterministicas. El resto de la conversacion pasa por la memoria HDRS/IA existente y puede pausarse y retomarse por telefono.

## Riesgos Tecnicos

- El dominio debe apuntar al servidor correcto antes de activar webhooks productivos.
- Meta solo enviara webhooks si la URL HTTPS esta verificada.
- Las plantillas outbound fuera de la ventana de 24 horas deben aprobarse en WhatsApp Manager.
- El runtime actual usa archivos JSON; para SaaS/multiempresa real debe migrarse a PostgreSQL.
- Las llaves de Meta/Gemini/Groq/OpenRouter deben estar solo en entorno del servidor.

## Siguiente Migracion Recomendada

1. Cambiar DNS de `rh.heavenlydreams.com.mx` a `159.89.87.91`.
2. Emitir SSL con Certbot.
3. Configurar webhook Meta:
   - URL: `https://rh.heavenlydreams.com.mx/api/integrations/meta/webhook`
   - Verify token: valor de `META_WEBHOOK_VERIFY_TOKEN`.
   - Campo: `messages`.
4. Configurar secretos reales en `.env` del servidor.
5. Migrar runtime JSON a PostgreSQL cuando se arranque Fase 3/9 del plan.
