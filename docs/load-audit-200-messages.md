# Auditoria de carga: 200 mensajes por hora

Fecha: 2026-06-01
App: RHDreams / Heavenly Dreams
Objetivo: simular recepcion de 200 mensajes/hora, equivalente a 1 mensaje cada 18 segundos.

## Simulador creado

Comando:

```bash
npm run simulate:messages -- --base=http://127.0.0.1:3001 --messages=200 --per-hour=200 --concurrency=8
```

Opciones utiles:

```bash
# Simula muchos remitentes o candidatos distintos
npm run simulate:messages -- --base=http://127.0.0.1:3001 --messages=200 --per-hour=200 --concurrency=8

# Simula un solo canal/IP, parecido a un WhatsApp conectado por backend
npm run simulate:messages -- --base=http://127.0.0.1:3001 --messages=60 --per-hour=200 --concurrency=4 --shared-ip

# Prueba capacidad HTTP sin generar respuestas IA
npm run simulate:messages -- --base=http://127.0.0.1:3001 --messages=200 --per-hour=200 --concurrency=8 --no-ai
```

## Resultados observados

### 1. API sin IA

- 200 solicitudes aceleradas.
- 0 fallas.
- p50: 20 ms.
- p95: 42 ms.
- max: 86 ms.

Conclusion: Express/Node y el servidor pueden recibir 200 eventos/hora sin problema cuando no dependen de IA ni limitadores por canal.

### 2. Respuesta IA con remitentes distintos

- 60 mensajes acelerados.
- 0 fallas.
- p50: 116 ms.
- p95: 265 ms.
- max: 300 ms.

Conclusion: con fallback local activo, el endpoint responde rapido. Si se usa Gemini/Groq real, la latencia puede subir mucho mas y debe entrar una cola.

### 3. Respuesta IA con un solo canal/IP

- 60 mensajes acelerados.
- 29 exitos.
- 31 bloqueados.
- Error: 429 `Has alcanzado el limite de solicitudes de IA`.

Conclusion: el limitador actual de IA permite 30 solicitudes cada 15 minutos. Eso equivale a 120/hora por IP/usuario. Para 200 mensajes/hora desde un mismo WhatsApp, el sistema bloquearia aproximadamente el 40% de respuestas automaticas si todo pasa por el mismo endpoint.

## Riesgos principales

1. Rate limit insuficiente para 200 mensajes/hora por canal.
   - `geminiLimiter`: 30 solicitudes / 15 min.
   - Requerido para 200/hora: al menos 50 solicitudes / 15 min por canal, mas margen.

2. Sin cola de mensajes.
   - Si la IA tarda o falla, los mensajes no quedan en una cola persistente con reintentos.
   - Recomendado: Redis + BullMQ, 3 a 5 workers, backoff y reintentos.

3. Baileys guarda historial en memoria.
   - Actualmente conserva `session.messages.slice(-100)`.
   - Con 200/hora, el historial visible de WhatsApp cubre aproximadamente 30 minutos si todo entra por una sesion.
   - Recomendado: guardar cada mensaje en PostgreSQL/Supabase.

4. Sin control por canal/agente.
   - El limitador se basa en IP/usuario.
   - Para WhatsApp conectado desde backend, conviene limitar por `sessionId`, `channelId` o `agentId`.

5. Riesgo si se usa IA externa real.
   - 200/hora es bajo para Node, pero puede ser alto para costos, latencia y cuotas del proveedor.
   - Recomendado: clasificador ligero primero, cache de respuestas frecuentes y escalamiento humano.

## Recomendacion de arquitectura

Para operar 200 mensajes/hora estable:

```text
Baileys / Webhook
  -> guardar mensaje en BD
  -> agregar job a Redis/BullMQ
  -> worker IA con concurrencia limitada
  -> enviar respuesta
  -> guardar resultado
```

Configuracion sugerida inicial:

- Cola: Redis + BullMQ.
- Workers: 3.
- Concurrencia por worker: 2.
- Max IA por canal: 60 / 15 min.
- Reintentos: 3.
- Backoff: 10s, 30s, 90s.
- Circuit breaker: si IA falla, responder plantilla humana corta y marcar para revision.

## Veredicto

La app puede recibir 200 mensajes/hora, pero no esta lista para responder automaticamente 200 mensajes/hora desde un mismo canal sin ajustes.

Estado actual:

- Recepcion HTTP: bien.
- Respuesta IA directa: bloqueada por rate limit en canal unico.
- Persistencia de inbox: insuficiente para produccion.
- Recomendacion: implementar cola y persistencia antes de activar autorespuesta masiva.

## Mejoras ejecutadas

Fecha de aplicacion: 2026-06-01.

Cambios:

- Se agrego una cola interna de IA para respuestas de agentes.
- Se agrego endpoint de monitoreo: `/api/gemini/agent/queue`.
- Se subio `GEMINI_RATE_LIMIT_MAX` por defecto de 30 a 75 solicitudes cada 15 minutos.
- Se subio `API_RATE_LIMIT_MAX` por defecto de 100 a 300 solicitudes cada 15 minutos.
- Se amplio el buffer de mensajes Baileys de 100 a 1000 mensajes por sesion.
- Se corrigio el endpoint de IA para permitir auth opcional en webhooks/simulaciones.

Validacion posterior:

```text
60 mensajes simulados desde un solo canal/IP
Resultado: 60 exitos, 0 fallas
p50: 296 ms
p95: 611 ms
max: 667 ms
cola IA: completed=60, failed=0, rejected=0
```

Nuevo estado antes de Redis:

- 200 mensajes/hora desde un canal unico: viable con margen inicial.
- Riesgo pendiente: la cola es en memoria; si el proceso se reinicia, los jobs pendientes se pierden.
- Siguiente mejora recomendada: Redis + BullMQ + persistencia en PostgreSQL/Supabase para produccion formal.

## Mejora Redis + BullMQ ejecutada

Fecha de aplicacion: 2026-06-01.

Cambios:

- Se instalo y activo Redis en el droplet.
- Se reemplazo la cola interna de respuestas IA por BullMQ cuando `REDIS_URL` esta configurado.
- Se mantuvo fallback en memoria para desarrollo local o si `AI_QUEUE_DRIVER=memory`.
- Se agregaron reintentos automaticos con backoff exponencial.
- Se configuro `AI_QUEUE_CONCURRENCY=4`, `AI_QUEUE_MAX_SIZE=500`, `AI_QUEUE_ATTEMPTS=3`.
- El endpoint `/api/gemini/agent/queue` ahora reporta `driver: redis-bullmq`.

Validacion posterior con Redis:

```text
30 mensajes simulados desde un solo canal/IP
Resultado: 30 exitos, 0 fallas
p50: 252 ms
p95: 689 ms
max: 799 ms
cola IA: driver=redis-bullmq, redisReady=true, completed=30, failed=0, queued=0
```

Estado actual:

- 200 mensajes/hora desde un canal unico: viable con cola persistente.
- Los jobs pendientes quedan en Redis y no dependen de la memoria del proceso Node.
- Si el servidor se reinicia, BullMQ puede retomar trabajos pendientes o reintentar fallos segun `AI_QUEUE_ATTEMPTS`.
- Riesgo pendiente para produccion formal: guardar cada mensaje y cada respuesta en PostgreSQL/Supabase para auditoria historica completa.
