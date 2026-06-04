# Separacion de dominios Heavenly Dreams

Esta app corresponde exclusivamente al sistema de reclutamiento RHDreams.

## Dominios

| Dominio | Uso | Aplicacion |
| --- | --- | --- |
| `https://heavenlydreams.com.mx` | Pagina principal publica | Sitio corporativo/landing principal |
| `https://app.heavenlydreams.com.mx` | App administrativa | Panel administrativo general |
| `https://rh.heavenlydreams.com.mx` | App de reclutamiento | RHDreams App 2026, candidatos, mensajes, agentes IA y WhatsApp |

## Regla operativa

- La app de reclutamiento solo debe servir frontend y API desde `rh.heavenlydreams.com.mx`.
- `app.heavenlydreams.com.mx` no debe apuntar a este servicio RH; debe apuntar al servidor de administracion.
- `heavenlydreams.com.mx` no debe apuntar a este servicio RH; debe apuntar al sitio publico principal.
- Si por DNS o proxy alguno de esos dominios llega a este servidor, la app RH responde `421` y no entrega la interfaz de reclutamiento.

## Variables de entorno recomendadas para este servicio RH

```env
APP_URL=https://rh.heavenlydreams.com.mx
RH_ALLOWED_HOSTS=rh.heavenlydreams.com.mx
ADMIN_APP_URL=https://app.heavenlydreams.com.mx
MAIN_SITE_URL=https://heavenlydreams.com.mx
```

## Integracion entre dominios

Las apps pueden integrarse sin mezclarse:

- La pagina principal puede enlazar a `app.heavenlydreams.com.mx` para administracion y a `rh.heavenlydreams.com.mx` para reclutamiento.
- La app administrativa puede abrir modulos RH mediante links o API autenticada hacia `rh.heavenlydreams.com.mx/api`.
- La app RH mantiene sus cookies, tokens y rutas separadas del sitio principal y de la app administrativa.

## DNS esperado

- `heavenlydreams.com.mx`: proveedor del sitio publico principal.
- `app.heavenlydreams.com.mx`: proveedor/servidor de la app administrativa.
- `rh.heavenlydreams.com.mx`: proveedor/servidor de RHDreams App 2026.

