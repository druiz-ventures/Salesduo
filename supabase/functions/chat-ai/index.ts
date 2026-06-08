// supabase/functions/chat-ai/index.ts
// Deploy con: supabase functions deploy chat-ai

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const REQUIRE_AUTH = (Deno.env.get("REQUIRE_AUTH") ?? "false").toLowerCase() === "true";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buildProviderFallback = (reason: string, status: number | null = null) => ({
  clientMessage: "Perdona, creo que se ha cortado un momento. ¿Me puedes repetir lo que has dicho?",
  feedback: "Tu respuesta se registró, pero la IA no pudo evaluarla. " + reason,
  matchType: "nomatch",
  scoreImpact: 0,
  technique: "Sin evaluación (fallback técnico)",
  isEndNode: false,
  endType: null,
  _providerStatus: status,
  _providerReason: reason,
});

const getCandidateModels = () => {
  const configured = (ANTHROPIC_MODEL || "").trim();
  const candidates = [
    configured,
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6",
    "claude-opus-4-8",
  ].filter(Boolean);

  return [...new Set(candidates)];
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    let authVerified = false;
    if (authHeader.startsWith("Bearer ") && SUPABASE_URL && SUPABASE_ANON_KEY) {
      const authCheck = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": authHeader,
        },
      });
      authVerified = authCheck.ok;
      if (!authVerified) {
        console.warn("chat-ai auth check failed; continuing in guest mode");
      }
    }

    if (REQUIRE_AUTH && !authVerified) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversationHistory, scenarioContext, userProfile, salesRole, turnCount } = await req.json();

    if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return new Response(JSON.stringify({ error: "conversationHistory inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!scenarioContext?.buyerPersona || !scenarioContext?.context || !scenarioContext?.objection) {
      return new Response(JSON.stringify({ error: "scenarioContext incompleto" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((turnCount ?? 0) > 12) {
      return new Response(JSON.stringify({ error: "Límite de turnos alcanzado" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

        const roleMode = salesRole === "closer" ? "closer" : "setter";
        const roleRules = roleMode === "setter"
      ? `
    MODO SDR / SETTER (para evaluar al vendedor):
    - Objetivo principal del vendedor: calificar necesidad y conseguir siguiente reunión, NO cerrar venta final en la primera conversación.
    - Premia preguntas abiertas, diagnóstico y calificación (dolor, urgencia, proceso de decisión).
    - Penaliza pitch largo, hablar de producto demasiado pronto y cerrar agresivamente sin diagnóstico.
    - Si el vendedor intenta cerrar compra directa demasiado pronto, aumenta resistencia.
    - Un buen final de setter es: reunión agendada con fecha/hora y criterio claro.
    `
      : `
    MODO AE / CLOSER (para evaluar al vendedor):
    - Objetivo principal del vendedor: avanzar a compromiso comercial concreto (demo decisoria, propuesta validada, cierre o siguiente hito de decisión).
    - Premia manejo de objeciones con preguntas, cuantificación de impacto (ROI/coste de inacción) y cierre con plan claro.
    - Penaliza respuestas defensivas, descuentos prematuros y falta de control del proceso.
    - Un buen final de closer es: siguiente paso con owner, fecha y criterio de éxito.
    `;

        const roleScoreRules = roleMode === "setter"
      ? `
    - Pregunta abierta de diagnóstico o calificación bien hecha: +25 a +40
    - Detectar dolor + urgencia + siguiente paso: +30 a +40
    - Pitch de producto prematuro: -10 a -20
    - Intentar cerrar compra final demasiado pronto: -20 a -30
    - Rendirse ante objeción: -30`
      : `
    - Manejo de objeción con pregunta y reencuadre: +25 a +40
    - Cuantificar impacto / ROI con datos del cliente: +30 a +40
    - Descuento prematuro o defensa de precio sin diagnóstico: -20 a -30
    - Cierre difuso sin fecha ni compromiso: -10 a -20
    - Rendirse ante objeción: -30`;

        // ── System prompt: Claude juega el rol del comprador ──────────────────
    const systemPrompt = `Eres un simulador de entrenamiento de ventas. Juegas DOS roles simultáneamente:

ROL 1 — COMPRADOR SIMULADO:
${scenarioContext.buyerPersona}

Contexto: ${scenarioContext.context}
Objeción inicial: ${scenarioContext.objection}

Reglas como comprador:
- Responde SIEMPRE en español, en primera persona como el comprador
- Muestra resistencia inicial, pero cede si el vendedor aplica empatía, hace preguntas de diagnóstico y maneja objeciones con preguntas — no lo hagas más difícil de lo necesario
- Si el vendedor es genérico o presiona sin escuchar, mantén resistencia; si aplica buenas técnicas, avanza hacia el cierre
- Máximo 2-3 frases por respuesta
- No acumules más de 2-3 objeciones en total aunque la conversación sea larga; una vez manejadas, acepta
- Después de 4-5 turnos, lleva la conversación a un cierre (positivo si el vendedor aplicó las técnicas básicas descritas en tu perfil)
- IMPORTANTE: Si el vendedor escribe algo ininteligible, sin sentido, en otro idioma o claramente irrelevante (ej: "asdasd", "jjjj", teclas aleatorias), reacciona como lo haría un comprador real: con confusión o impaciencia ("¿Perdona? No te he entendido.", "¿Me puedes repetir eso?", "Mira, no tengo tiempo para esto.") y penaliza con scoreImpact negativo

ROL 2 — EVALUADOR DE TÉCNICA:
Analiza la última respuesta del vendedor y evalúa:
- ¿Usó técnicas de venta efectivas? (empatía, preguntas abiertas, ROI, diferenciación, urgencia)
- ¿Fue genérico o específico?
- ¿Avanzó o retrocedió la conversación?
- Si la respuesta es incomprensible o irrelevante, indícalo directamente en el feedback

${roleRules}

REGLA CRÍTICA DE FORMATO:
Tu respuesta DEBE ser ÚNICAMENTE el objeto JSON válido que se muestra abajo.
NO incluyas texto antes ni después. NO uses bloques markdown (\`\`\`). NO añadas explicaciones.
Empieza directamente con { y termina con }.

{
  "clientMessage": "Lo que dice el comprador como respuesta",
  "feedback": "Análisis breve de la técnica usada (1-2 frases, directo y accionable)",
  "matchType": "positive" | "negative" | "nomatch",
  "scoreImpact": número entre -30 y +40,
  "technique": "Nombre de la técnica detectada o 'Sin técnica identificada'",
  "isEndNode": false,
  "endType": null
}

Si la conversación debe terminar (turno 5+ o cierre natural):
- endType: "success" si el comprador acepta avanzar/agendar demo
- endType: "failure" si el comprador rechaza definitivamente
- isEndNode: true

Criterios de puntuación:
${roleScoreRules}
- Empatía + redirección: +20 a +30
- Argumento genérico sin personalizar: 0 a +10
- Respuesta ininteligible o irrelevante: -20`;

    // Validación temprana para evitar falsos "fallos temporales" cuando falta configuración.
    if (!ANTHROPIC_API_KEY) {
      console.error("chat-ai config error: missing ANTHROPIC_API_KEY");
      return new Response(JSON.stringify(buildProviderFallback("La configuración de IA no está completa (ANTHROPIC_API_KEY).", 500)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Llamada a Claude con fallback de modelo (solo si hay 404) ──────────
    const modelsToTry = getCandidateModels();
    let response: Response | null = null;
    let lastErrBody: Record<string, unknown> = {};
    let selectedModel = modelsToTry[0] || ANTHROPIC_MODEL;

    for (const candidateModel of modelsToTry) {
      selectedModel = candidateModel;
      const attempt = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: candidateModel,
          max_tokens: 800,
          system: systemPrompt,
          messages: conversationHistory,
        }),
      });

      if (attempt.ok) {
        response = attempt;
        break;
      }

      const errBody = await attempt.json().catch(() => ({}));
      lastErrBody = errBody;
      console.error("Anthropic API error", attempt.status, { model: candidateModel, errBody });

      // Si no es 404, no tiene sentido seguir probando modelos.
      if (attempt.status !== 404) {
        response = attempt;
        break;
      }
    }

    if (!response || !response.ok) {
      const status = response?.status ?? null;

      let providerReason = "Reintenta en unos segundos.";
      if (status === 401 || status === 403) {
        providerReason = "La clave del proveedor IA no es válida o no tiene permisos.";
      } else if (status === 404) {
        providerReason = "El modelo configurado no está disponible en tu cuenta. Actualiza ANTHROPIC_MODEL en secretos de Supabase.";
      } else if (status === 429) {
        providerReason = "Se alcanzó el límite de uso del proveedor IA.";
      } else if (status && status >= 500) {
        providerReason = "El proveedor IA está caído temporalmente.";
      }

      const fallback = buildProviderFallback(providerReason, status);
      fallback._providerReason = `${providerReason} Modelos probados: ${modelsToTry.join(", ")}. Último modelo: ${selectedModel}.`;
      fallback._providerError = lastErrBody;

      // Fallback para que la simulación no se rompa si el proveedor AI falla.
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text ?? "{}";
    console.log("chat-ai stop_reason:", data.stop_reason, "rawText length:", rawText.length);

    // Parsear JSON de respuesta
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Si Claude no devuelve JSON limpio, intentar extraerlo del texto
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          throw new Error(`JSON inválido de Claude: ${rawText.substring(0, 200)}`);
        }
      } else {
        throw new Error(`Claude no devolvió JSON: ${rawText.substring(0, 200)}`);
      }
    }

    if (!parsed.clientMessage) {
      throw new Error("Respuesta de Claude sin clientMessage");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("chat-ai unhandled error", err);
    return new Response(JSON.stringify({
      clientMessage: "Perdona, creo que no te he escuchado bien. ¿Me puedes repetir eso?",
      feedback: "Tu respuesta se ha guardado, pero no se pudo completar la evaluación por un error interno temporal. Reintenta en unos segundos.",
      matchType: "nomatch",
      scoreImpact: 0,
      technique: "Sin evaluación (error interno)",
      isEndNode: false,
      endType: null,
      _debugError: String(err?.message || err),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
