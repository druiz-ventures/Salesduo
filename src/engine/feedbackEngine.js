// ─── Mensajes por calidad de respuesta ───────────────────────────────────────

const feedback = {
  excellent: [
    "🔥 Técnica sólida — conectaste el valor antes de responder a la objeción",
    "💡 Muy bien ejecutado — el cliente necesitaba escuchar exactamente eso",
    "✅ Respuesta de nivel senior — directo, relevante y orientado al cliente",
    "🎯 Perfecto — identificaste el punto clave y fuiste a por él",
  ],
  good: [
    "👍 Buen enfoque, aunque podrías haber sido más específico con cifras concretas",
    "✅ Correcto — la próxima vez añade un ejemplo o un dato que lo respalde",
    "💬 Vas por buen camino — profundiza más en el problema del cliente",
    "🟢 Bien orientado — trabaja la especificidad para cerrar con más fuerza",
  ],
  neutral: [
    "🤔 Respuesta genérica — el cliente no ve todavía por qué debería cambiar",
    "💬 Falta anclar en su situación concreta — habla de SU problema, no del tuyo",
    "⚠️ Mensaje poco diferenciador — cualquier competidor podría haber dicho lo mismo",
    "🔄 Reformula conectando con lo que el cliente ya te dijo antes",
  ],
  poor: [
    "❌ Esa respuesta aleja al cliente — evita ese enfoque en el futuro",
    "⚠️ Cuidado con ese camino — el cliente lo interpretará como debilidad",
    "🚫 Esa táctica suele disparar objeciones nuevas en vez de resolverlas",
    "📉 Respuesta que resta puntos — revisa la técnica sugerida en el hint",
  ],
};

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Función principal ────────────────────────────────────────────────────────
// localScore: puntuación del keyword scorer (puede ser negativa)
// scoreImpact: impacto del nodo (definido en el JSON)
export function getFeedback(localScore, matchType) {
  if (matchType === "positive" && localScore >= 20) return rand(feedback.excellent);
  if (matchType === "positive") return rand(feedback.good);
  if (matchType === "nomatch") return rand(feedback.neutral);
  if (matchType === "negative") return rand(feedback.poor);
  return rand(feedback.neutral);
}

// ─── Etiqueta de técnica detectada ───────────────────────────────────────────
export function getTechniqueLabel(matchType, nodeId = "") {
  const labels = {
    positive: {
      default: "Técnica aplicada correctamente",
      "node-discovery": "Pregunta de diagnóstico",
      "node-roi-close": "Cálculo de ROI",
      "node-transition": "Reducción de riesgo",
      "node-differentiation": "Diferenciación",
      "node-cost-of-waiting": "Coste de no actuar",
      "node-numbers": "Argumento cuantificado",
    },
    negative: { default: "Técnica contraproducente" },
    nomatch: { default: "Sin técnica identificada" },
  };

  const group = labels[matchType] || labels.nomatch;
  return group[nodeId] || group.default;
}
