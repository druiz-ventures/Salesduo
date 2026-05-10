# Voice Hyperreal Setup

Esta guia activa la prueba de voz hiperrealista en la rama `mvp/voice-hyperreal`.

## Importante (antes de empezar)

- No necesitas crear ninguna tabla nueva en Supabase para esta prueba.
- Puedes probar sin `OPENAI_API_KEY` usando transcripcion de voz del navegador (recomendado para validar rapido).
- Necesitas `ANTHROPIC_API_KEY` (ya lo usas en `chat-ai`) y `ELEVENLABS_API_KEY` para la voz de salida.

## Archivos y funciones creadas

- `src/components/voice/VoiceLab.jsx`
- `supabase/functions/speech-to-text/index.ts`
- `supabase/functions/text-to-speech/index.ts`

## 1) Preparar entorno local

Prepara variables del frontend para apuntar a staging:

```bash
cp .env.voice.example .env.local
```

Rellena `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env.local`.

Copia el ejemplo de variables (solo para edge functions):

```bash
cp supabase/functions/.env.voice.local.example supabase/functions/.env.voice.local
```

Rellena claves reales en `supabase/functions/.env.voice.local`.

Si vas a usar transcripcion del navegador, `OPENAI_API_KEY` es opcional.

## 2) Levantar Edge Functions en local

Si tu frontend apunta a un proyecto de staging en Supabase, es mas simple desplegar funciones a ese staging en lugar de `serve` local.

### Opcion recomendada (staging en Supabase)

```bash
supabase secrets set ELEVENLABS_API_KEY=TU_KEY
supabase secrets set ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
supabase secrets set ANTHROPIC_API_KEY=TU_KEY
supabase secrets set ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

supabase functions deploy chat-ai
supabase functions deploy text-to-speech
```

Solo si quieres fallback STT por API (en vez de navegador), agrega:

```bash
supabase secrets set OPENAI_API_KEY=TU_KEY
supabase functions deploy speech-to-text
```

### Opcion alternativa (serve local)

```bash
supabase functions serve chat-ai --env-file supabase/functions/.env.voice.local
supabase functions serve speech-to-text --env-file supabase/functions/.env.voice.local
supabase functions serve text-to-speech --env-file supabase/functions/.env.voice.local
```

## 3) Levantar frontend

```bash
npm run dev
```

En la app, abre el boton `Voz hiperrealista (beta)` en la barra superior.

## 4) Prueba recomendada

- Preset: `Closer B2C - Objecion de precio`
- Click en `Reiniciar`
- Click en `Hablar respuesta`
- Hablar 8-20 segundos
- Click en `Detener`

Flujo esperado:

1. Tu voz se transcribe (modo navegador por defecto, sin API extra).
2. Se envia a `chat-ai` para generar objecion/feedback.
3. Respuesta del cliente se sintetiza con ElevenLabs (`text-to-speech`).
4. Se reproduce audio de vuelta.

## 5) Coste orientativo por minuto

- STT navegador: 0 EUR/min (normalmente)
- STT API (opcional): 0.006 a 0.03 EUR/min
- LLM: 0.02 a 0.12 EUR/min
- TTS: 0.01 a 0.08 EUR/min
- Total hiperrealista sin OpenAI STT: 0.03 a 0.20 EUR/min

Nota: si usas `serve` local, el frontend debe apuntar al stack local de Supabase; para pruebas rapidas suele ser mejor staging desplegado.
