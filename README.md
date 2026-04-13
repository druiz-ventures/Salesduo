# SalesDuo

Demo desplegada: https://salesduo-tan.vercel.app/

Cómo usar rápido:
- Si no ves el onboarding: abre DevTools → Console → `localStorage.clear()` → recarga.
- Flujo demo: seleccionar lección → responder en el chat → finalizar lección → ver XP y badges.
- Pruebas recomendadas: móvil (DevTools o teléfono), flujo completo y revisión de la consola por errores.

Notas:
- Para mejor compartición, añade `/public/og-image.png` con imagen de preview para redes.
- No exponer claves en el repo público.

## Login con Google (Supabase)

Si al volver de Google te redirige a `localhost:3000` y falla, configura estas URLs en Supabase Auth:

- Site URL: `https://salesduo-tan.vercel.app`
- Redirect URLs (allow list):
	- `https://salesduo-tan.vercel.app`
	- `http://localhost:5173` (solo desarrollo)
	- `http://localhost:3000` (opcional si usas ese puerto)

Además, en el frontend puedes fijar la URL pública creando `.env` con:

`VITE_PUBLIC_SITE_URL=https://salesduo-tan.vercel.app`

## Diagnóstico de fallo IA (chat-ai)

Si aparece siempre "Sin evaluación (fallback técnico)", no suele ser frontend: la Edge Function está viva pero el proveedor IA falla.

Checklist en Supabase:

1. Verifica secretos de la función:
	- `ANTHROPIC_API_KEY` (obligatorio)
	- `ANTHROPIC_MODEL` (recomendado, por ejemplo `claude-3-5-haiku-latest`)
2. Revisa logs de `chat-ai` para ver el código del proveedor (401/403/404/429/5xx).
3. Si cambias secretos, redeploy:
	- `supabase functions deploy chat-ai --no-verify-jwt`

Tipos de error más comunes:

- 401/403: API key inválida, revocada o sin permisos.
- 404: modelo no disponible para la cuenta.
- 429: cuota/créditos agotados.
- 5xx: caída temporal del proveedor.

Caso detectado en producción (404):

- Log típico: `model: claude-3-5-haiku-latest`.
- Solución inmediata: actualizar `ANTHROPIC_MODEL` a un modelo disponible en tu cuenta (por ejemplo `claude-3-5-haiku-20241022`) y redeploy.