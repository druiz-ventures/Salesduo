export function analyzeResponse(userInput, keywords) {
  const input = userInput
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const positiveWords = keywords.positive || [];
  const negativeWords = keywords.negative || [];

  const positiveMatch = positiveWords.some((word) =>
    input.includes(word.toLowerCase())
  );

  const negativeMatch = negativeWords.some((word) =>
    input.includes(word.toLowerCase())
  );

  // Si hay AMBAS, la positiva gana (el usuario sabe de qué habla)
  if (positiveMatch && negativeMatch) {
    return "positive";
  }

  // Si solo hay negativa → trampa
  if (negativeMatch) {
    return "negative";
  }

  // Si solo hay positiva → bien
  if (positiveMatch) {
    return "positive";
  }

  return "nomatch";
}

export function processUserInput(currentNode, userInput) {
  const matchType = analyzeResponse(userInput, currentNode.keywords);
  const nextNodeId = currentNode.onKeywordMatch[matchType];

  return {
    nextNodeId,
    matchType,
    scoreImpact: currentNode.scoreImpact || 0,
  };
}