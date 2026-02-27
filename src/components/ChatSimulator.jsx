import { useState, useEffect, useRef } from "react";
import { processUserInput } from "../engine/keywordMatcher";
import { getFeedback, getTechniqueLabel } from "../engine/feedbackEngine";

export default function ChatSimulator({ conversationData, onFinish }) {
  const [currentNodeId, setCurrentNodeId] = useState(conversationData.initialNode);
  const [messages, setMessages] = useState([
    {
      sender: "client",
      text: conversationData.nodes[conversationData.initialNode].clientMessage,
    },
    {
      sender: "hint",
      text: "💡 " + conversationData.nodes[conversationData.initialNode].hint,
    },
  ]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [ended, setEnded] = useState(false);
  const [result, setResult] = useState(null);
  const [endType, setEndType] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || ended || isTyping) return;

    const currentNode = conversationData.nodes[currentNodeId];
    const userText = input.trim();
    setInput("");

    const { nextNodeId, matchType, localScore, scoreImpact } = processUserInput(
      currentNode,
      userText
    );
    const nextNode = conversationData.nodes[nextNodeId];

    if (!nextNode) {
      setMessages((prev) => [
        ...prev,
        { sender: "user", text: userText },
        { sender: "system", text: "Error: nodo no encontrado" },
      ]);
      return;
    }

    // Feedback inline
    const feedbackText = getFeedback(localScore, matchType);
    const techniqueLabel = getTechniqueLabel(matchType, nextNodeId);

    const newScore = score + scoreImpact;

    // 1. Mensaje del usuario + feedback inmediato
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userText },
      {
        sender: "feedback",
        text: feedbackText,
        technique: techniqueLabel,
        quality: matchType,
        scoreImpact: scoreImpact,
      },
    ]);

    setScore(newScore);
    setIsTyping(true);

    // 2. Simular que el cliente "escribe" (300-700ms)
    setTimeout(() => {
      setIsTyping(false);

      const followUp = [
        { sender: "client", text: nextNode.clientMessage },
      ];

      if (nextNode.hint) {
        followUp.push({ sender: "hint", text: "💡 " + nextNode.hint });
      }

      setMessages((prev) => [...prev, ...followUp]);
      setCurrentNodeId(nextNodeId);

      if (nextNode.isEndNode) {
        const finalScore = newScore + (nextNode.scoreImpact || 0);
        setScore(finalScore);
        setResult(conversationData.endResults[nextNode.endType]);
        setEndType(nextNode.endType);
        setEnded(true);
      } else {
        inputRef.current?.focus();
      }
    }, Math.random() * 400 + 350);
  };

  const handleFinish = () => {
    if (onFinish) {
      onFinish({
        score,
        xpEarned: result?.xpEarned || 0,
        endType: endType || "failure",
        badgeUnlocked: result?.unlocksBadge || null,
      });
    }
  };

  const qualityColors = {
    positive: "#22c55e",
    negative: "#ef4444",
    nomatch: "#f59e0b",
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>
          {conversationData.clientAvatar} {conversationData.clientName}
        </h2>
        <span className="chat-score">🏆 {score} pts</span>
      </div>
      <p className="chat-role">{conversationData.clientRole}</p>
      <p className="chat-context">{conversationData.context}</p>

      <div className="chat-messages" ref={chatRef}>
        {messages.map((msg, i) => {
          if (msg.sender === "feedback") {
            return (
              <div key={i} className="message feedback-row">
                <div
                  className="feedback-bubble"
                  style={{ borderLeftColor: qualityColors[msg.quality] || "#94a3b8" }}
                >
                  <span className="feedback-text">{msg.text}</span>
                  <div className="feedback-meta">
                    <span className="feedback-technique">{msg.technique}</span>
                    <span
                      className="feedback-score-delta"
                      style={{ color: msg.scoreImpact >= 0 ? "#22c55e" : "#ef4444" }}
                    >
                      {msg.scoreImpact >= 0 ? "+" : ""}{msg.scoreImpact} pts
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={i} className={`message ${msg.sender}`}>
              <div className="message-bubble">{msg.text}</div>
            </div>
          );
        })}

        {isTyping && (
          <div className="message client">
            <div className="message-bubble typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {!ended ? (
        <div className="chat-input-area">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escribe tu respuesta de ventas..."
            className="chat-input"
            disabled={isTyping}
            autoComplete="off"
          />
          <button onClick={handleSend} className="btn-send" disabled={isTyping}>
            {isTyping ? "..." : "Enviar"}
          </button>
        </div>
      ) : (
        <div className={`result-card ${endType}`}>
          <h3>{result?.title}</h3>
          <p>{result?.message}</p>
          <p className="result-xp">
            +{result?.xpEarned} XP &nbsp;|&nbsp; Puntuación final: {score}
          </p>
          <button onClick={handleFinish} className="btn-back">
            Volver al menú
          </button>
        </div>
      )}
    </div>
  );
}
