# SalesDuo — App MVP

App de validación que entrena conversaciones de venta con IA. El usuario llega desde una landing, recibe un token por email/URL, y completa una demo de llamada simulada con un cliente IA.

- Producción: https://salesduo-tan.vercel.app/
- Landing (repo separado): https://salesduo-landing.vercel.app/ (carpeta `../landing/salesduo-landing/`)
- Email operativo: `salesduoapp@gmail.com`

## Stack

- **Frontend**: React 19 + Vite 7 (deploy en Vercel)
- **Backend**: Vercel Serverless Functions (`api/`) + Supabase Edge Functions (`supabase/functions/`)
- **DB / Auth**: Supabase
- **Pagos**: Stripe (SetupIntent, no charge — solo reserva tarjeta)
- **Automatización**: Make (escenario `5319826`)
- **Tracking**: Airtable + Slack + Gmail (vía Make)

## Estructura

```
src/
  AppRouter.jsx                 Router por query param (?product=mvp|sdr|closer)
  App.jsx                       App principal (gamified lessons)
  components/
    demos/
      DemoCallMVP.jsx           ⭐ Demo principal del MVP (token + Stripe + feedback)
      VoiceOnly.jsx             Demo SDR voz
      CloserVoiceOnly.jsx       Demo closer voz
      ProductLanding.jsx        Landing genérica de producto
api/
  create-setup-intent.js        Stripe SetupIntent endpoint
supabase/functions/
  chat-ai/                      Llamadas a Anthropic (Claude)
  speech-to-text/
  text-to-speech/
  create-setup-intent/
```

## Flujo de datos del MVP

```
Landing (form) ──► Make webhook ──► Supabase (token) + Airtable Usuarios + Gmail
                                            │
                                            ▼
                              URL con ?mvp=1&token=<md5(email)>
                                            │
                                            ▼
App MVP (DemoCallMVP.jsx) ──► sendEventToMake(...) ──► Make
                                                        ├─► Airtable Eventos (log)
                                                        ├─► Airtable "Actividad App" (1 fila/usuario, upsert por email)
                                                        ├─► Gmail (waitlist / stripe_reserved)
                                                        └─► Slack (todos los eventos)
```

**El token se calcula como `md5(email)` tanto en la landing (JS local, redirect instantáneo) como en Make.** No hay que esperar a Make para redirigir.

## Eventos enviados desde la app

| Evento | Cuándo | Campos clave en `Detalle` |
|---|---|---|
| `demo_accessed` | Abre la app con token | email, nombre, demo nº (`attempts`) |
| `call_started` | Inicia la llamada | email, nombre |
| `call_ended` | Termina la llamada | email, score, resultado |
| `waitlist_clicked` | Pulsa lista de espera | email, nombre |
| `stripe_reserved` | Confirma tarjeta en Stripe | email, Stripe SetupIntent ID |
| `feedback_positive` | Pulsa 👍 | email, nombre |
| `feedback_negative` | Pulsa 👎 + escribe | email, nombre, comentario |

Helper: `sendEventToMake({ event, email, name, ... })` en `DemoCallMVP.jsx`.

## Airtable (base del MVP)

- **Usuarios** — leads desde la landing (campos: Nombre, Email, Funnel, Última actividad). Mantener.
- **Eventos** — log plano, una fila por evento. Campo `Detalle` con todo en texto (sin relaciones por Record ID).
- **Actividad App** — una fila por usuario, upsert por email. Columnas: Email, Nombre, Demos hechas, Call hecha, Score, Resultado, Waitlist, Stripe reservado, Feedback, Comentario, Última actividad.
- ~~Intenciones de pago~~ — DEPRECADA, no recibe datos. Borrar cuando se quiera.

## Stripe

- Modo: SetupIntent (sin cobro real, solo guardar tarjeta). El cobro real ocurriría en el lanzamiento.
- Endpoint: `POST /api/create-setup-intent` → crea/recupera customer y devuelve `clientSecret`.
- Variable requerida en Vercel: `STRIPE_SECRET_KEY` (`sk_test_...` para test).
- Cliente Stripe inicializado en `CheckoutForm` dentro de `DemoCallMVP.jsx`.

## Make (escenario 5319826)

- Webhook único recibe todos los eventos. Router por `event` decide destino.
- Conexión Gmail: "Botón demo App - Landing (salesduoapp@gmail.com)" — si caduca el OAuth, hay que reconectar manualmente desde Make UI (Credentials).
- WebhookRespond colocado al inicio para que la landing no espere a Airtable/Supabase/Slack.

## Comandos

```bash
npm run dev          # Vite dev server en localhost:5173
npm run build        # Build de producción
npm run lint         # ESLint
npm run preview      # Preview del build

# Deploy: push a main → Vercel autodeploy
git add . && git commit -m "..." && git push
```

## Variables de entorno

Locales (`.env.local`):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_MAKE_WEBHOOK_URL` (envío de eventos desde la app)

En Vercel (server-side):
- `STRIPE_SECRET_KEY`

En Supabase (Edge functions):
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`

## Estrategia ICPs (en marcha)

Plan: una landing + una demo por ICP, distribución orgánica primero en grupos de Facebook/Reddit/LinkedIn. Subdirectorios en Vercel (`/closer`, `/inmo`...), un solo repo.

ICPs priorizados para Fase 1:
1. **Closer de infoproductos** — vertical: programa de transformación física high-ticket ("Programa Optimización Metabólica", 3.000€, cierre por Zoom). Cliente ya cualificado por un setter. Objeciones típicas: "he probado otros cursos y no me sirvió", "es caro", "no sé si tendré tiempo".
2. **Agente inmobiliario** (Engel, RE/MAX) — prospección en frío para conseguir visita o captación. Más agresivo que closer. No limitar a España.

ICPs en pipeline (no construir aún): setter (necesita demo de chat antigua), AE software, emprendedor sin perfil de ventas.

Personalización de la demo por ICP: parámetro `?icp=closer|inmo` en URL → la app carga un system prompt distinto desde Supabase (tabla de ICPs con prompt por ICP).

## Notas operativas

- Pre-existían 3 tablas en Airtable con relaciones por Record ID → daban fallos porque mandamos email y no ID. Por eso se consolidó en log plano + tabla upsert.
- El feedback (👍/👎 + comentario) se guarda **además** en Supabase tabla `demo_feedback`.
- La carpeta de proyecto vive en Google Drive sincronizado → ejecutar git desde Terminal del Mac, no desde sandboxes que monten la carpeta como remota.
- README.md del repo tiene info adicional sobre Login Google y diagnóstico de chat-ai.
