# Plan de Produccion RHDreams en DigitalOcean

## Estado Actual

- La app ya no siembra candidatos, agentes, mensajes, notificaciones ni cuentas conectadas de ejemplo.
- La app queda preparada para correr como servidor Express persistente con `npm run build` y `npm run start`.
- Gemini, Canva, Meta Ads y Google Workspace fallan de forma explícita cuando faltan credenciales; no generan resultados inventados.
- Firebase sigue siendo la fuente real de candidatos, vacantes, mensajes, agentes, citas y automatizaciones.
- Las rutas `/api/*` viven en el mismo backend Express, ideal para DigitalOcean App Platform, Droplet o contenedor Docker.

## Despliegue DigitalOcean App Platform

1. Crear app en DigitalOcean App Platform conectada al repositorio.
2. Seleccionar runtime Node.js.
3. Build command: `npm run build`.
4. Run command: `npm run start`.
5. HTTP port: `3000`.
6. Health check: `/health`.
7. Node version recomendada: `22`.
8. Variables públicas de Vite:
   - Config de Firebase si se migra desde `firebase-applet-config.json` a variables `VITE_*`.
9. Secretos en App Platform:
   - `GEMINI_FREE_API_KEY`
   - `GEMINI_PAID_API_KEY`
   - `GROQ_API_KEY`
   - `OPENROUTER_API_KEY`
   - `JWT_SECRET`
   - `CANVA_ACCESS_TOKEN`
   - `META_ADS_ACCESS_TOKEN`
   - `META_AD_ACCOUNT_ID`
   - `INDEED_CLIENT_SECRET`

## API Y WhatsApp

1. Mantener `/api/gemini/*`, `/api/groq/*`, `/api/openrouter/*` y `/api/integrations/*` dentro de Express.
2. Usar App Platform o Droplet con proceso persistente para que Baileys conserve socket y sesion.
3. Persistir `.sessions/baileys` si necesitas que WhatsApp sobreviva reinicios del servicio.
4. Mantener claves sensibles solo como secretos del backend:
   - `GEMINI_API_KEY`
   - `CANVA_ACCESS_TOKEN`
   - `META_ADS_ACCESS_TOKEN`
   - `META_AD_ACCOUNT_ID`
   - `WHATSAPP_BUSINESS_ACCESS_TOKEN`
   - `INDEED_CLIENT_SECRET`
5. Configurar CORS solo para el dominio final.
6. Validar Firebase ID token en cada escritura o acción sensible.

## Firebase

1. Activar Google Auth y, solo si realmente se necesita, Auth anónimo.
2. Revisar `firestore.rules` por usuario, rol y empresa.
3. Crear índices para consultas de candidatos, citas, mensajes y agentes.
4. Cargar datos iniciales reales desde consola o script administrativo, nunca desde el cliente.
5. Configurar backups/export programados de Firestore.

## Google Workspace

1. Configurar pantalla OAuth y dominio autorizado de Cloudflare.
2. Habilitar APIs: Calendar, Drive, Photos Library, Gmail, Sheets, Forms y Keep si aplica.
3. Revisar scopes sensibles/restringidos y solicitar verificación OAuth si Google lo exige.
4. Probar con datos reales:
   - Exportar candidatos a Sheets.
   - Importar candidatos desde Sheets.
   - Agendar entrevista en Calendar.
   - Enviar correo con Gmail.
   - Leer PDFs, imágenes y CVs desde Drive.
   - Leer fotos autorizadas desde Photos.

## Seguridad

1. No exponer `GEMINI_API_KEY` ni tokens de integraciones en Vite.
2. Usar secretos de DigitalOcean para credenciales del backend.
3. Mantener rate limit por usuario/IP en Express.
4. Evitar logs con teléfono, email completo, CVs o datos sensibles.
5. Revisar permisos de OAuth y tokens de Meta/Google cada trimestre.

## Validación Antes De Producción

1. `npm run lint`
2. `npm run build`
3. Smoke test del sitio publicado:
   - Login
   - Dashboard vacío
   - Candidatos sin datos inventados
   - Workspace Google sin modo local falso
   - Reportes calculados desde Firestore
4. Revisar que `/api/*` responda desde el mismo dominio antes de activar agentes automáticos.
