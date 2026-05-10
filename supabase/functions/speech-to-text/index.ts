import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decodeBase64ToUint8Array(base64: string) {
  const cleaned = base64.includes(",") ? base64.split(",")[1] : base64;
  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Falta OPENAI_API_KEY en secretos de Supabase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { audioBase64, mimeType = "audio/webm", language = "es" } = await req.json();

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "audioBase64 es obligatorio" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bytes = decodeBase64ToUint8Array(audioBase64);
    const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("wav") ? "wav" : "webm";
    const audioBlob = new Blob([bytes], { type: mimeType });

    const form = new FormData();
    form.append("file", audioBlob, `recording.${extension}`);
    form.append("model", "gpt-4o-mini-transcribe");
    form.append("language", language);

    const startedAt = Date.now();
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: form,
    });

    const elapsedMs = Date.now() - startedAt;

    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(
        JSON.stringify({ error: "Error en proveedor STT", providerStatus: response.status, providerError: errorBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const text = String(data?.text || "").trim();

    return new Response(
      JSON.stringify({
        text,
        provider: "openai",
        model: "gpt-4o-mini-transcribe",
        latencyMs: elapsedMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
