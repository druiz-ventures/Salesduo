// ─── Normalización ────────────────────────────────────────────────────────────
function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿¡]/g, "");
}

// ─── Detecta si una palabra está negada en el contexto anterior ──────────────
const NEGATION_WORDS = ["no ", "ni ", "nunca ", "jamas ", "sin ", "tampoco ", "nada de "];

function isNegated(input, wordIndex) {
  const lookback = input.slice(Math.max(0, wordIndex - 25), wordIndex);
  return NEGATION_WORDS.some((neg) => lookback.includes(neg));
}

// ─── Motor principal: scoring ponderado ──────────────────────────────────────
function scoreWeighted(input, weightedKeywords) {
  const norm = normalize(input);
  let total = 0;

  for (const { word, weight } of weightedKeywords) {
    const idx = norm.indexOf(normalize(word));
    if (idx === -1) continue;
    const negated = isNegated(norm, idx);
    total += negated ? -Math.abs(weight) : weight;
  }

  return total;
}

// ─── Compatibilidad con formato legacy (arrays positive/negative) ─────────────
function scoreFromLists(input, positiveWords = [], negativeWords = []) {
  const norm = normalize(input);
  let total = 0;

  for (const word of positiveWords) {
    const idx = norm.indexOf(normalize(word));
    if (idx === -1) continue;
    total += isNegated(norm, idx) ? -10 : 10;
  }

  for (const word of negativeWords) {
    const idx = norm.indexOf(normalize(word));
    if (idx === -1) continue;
    total += isNegated(norm, idx) ? 5 : -20;
  }

  return total;
}

// ─── Clasificador final ───────────────────────────────────────────────────────
export function analyzeResponse(userInput, keywords) {
  let score;

  if (keywords.weighted && keywords.weighted.length > 0) {
    score = scoreWeighted(userInput, keywords.weighted);
  } else {
    score = scoreFromLists(userInput, keywords.positive, keywords.negative);
  }

  if (score >= 10) return { match: "positive", score };
  if (score <= -8) return { match: "negative", score };
  return { match: "nomatch", score };
}

// ─── Entrada principal desde ChatSimulator ───────────────────────────────────
export function processUserInput(currentNode, userInput) {
  const { match, score } = analyzeResponse(userInput, currentNode.keywords);
  const nextNodeId = currentNode.onKeywordMatch[match];

  return {
    nextNodeId,
    matchType: match,
    localScore: score,
    scoreImpact: currentNode.scoreImpact || 0,
  };
}
