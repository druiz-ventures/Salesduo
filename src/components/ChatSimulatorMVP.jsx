import { useState, useEffect, useRef } from "react";
import ValidationFeedback from "./ValidationFeedback";
import { supabase } from "../supabaseClient";

// Función para mezclar array aleatoriamente
const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export default function ChatSimulatorMVP({ conversationData, onFinish, userId }) {
  const [currentNodeId, setCurrentNodeId] = useState(conversationData.initialNode || "start");
  const [messages, setMessages] = useState([]);
  const [score, setScore] = useState(0);
  const [ended, setEnded] = useState(false);
  const [endType, setEndType] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const chatRef = useRef(null);

  const currentNode = conversationData.nodes?.[currentNodeId];
  const hasOptions = currentNode?.options && currentNode.options.length > 0;

  // Inicializar con el mensaje del cliente
  useEffect(() => {
    if (currentNode) {
      setMessages([
        { 
          sender: "client", 
          text: currentNode.clientMessage,
          technique: currentNode.technique 
        }
      ]);
      // Mezclar las opciones cuando cambia el nodo
      if (currentNode.options) {
        setShuffledOptions(shuffleArray(currentNode.options));
      }
    }
  }, [currentNode]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleOptionSelect = async (option) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setSelectedOption(option.id);

    // Agregar respuesta del usuario al chat
    const newMessages = [...messages, { 
      sender: "user", 
      text: option.text,
      correct: option.correct 
    }];
    setMessages(newMessages);

    // Simular que el cliente está "pensando"
    await new Promise(r => setTimeout(r, 600));

    // Mostrar feedback inmediato
    const feedbackMessage = {
      sender: "feedback",
      correct: option.correct,
      explanation: option.explanation,
      technique: currentNode.technique
    };
    setMessages(prev => [...prev, feedbackMessage]);

    // Actualizar score
    if (option.correct) {
      setScore(s => s + 25);
    }
    setTurnCount(t => t + 1);

    await new Promise(r => setTimeout(r, 1500));

    // Avanzar al siguiente nodo
    const nextNodeId = option.correct ? currentNode.nextCorrectNode : null;
    
    if (nextNodeId && conversationData.nodes?.[nextNodeId]) {
      if (conversationData.nodes[nextNodeId].isEndNode) {
        setEnded(true);
        setEndType(conversationData.nodes[nextNodeId].endType || "success");
      } else {
        setCurrentNodeId(nextNodeId);
        setSelectedOption(null);
      }
    } else if (!option.correct) {
      // Si es incorrecta, mostrar fin de sesión como failure
      setEnded(true);
      setEndType("failure");
    }

    setIsAnimating(false);
  };

  const handleFinish = () => {
    const xpEarned = endType === "success" ? 100 : 40;
    if (onFinish) {
      onFinish({ 
        score, 
        xpEarned, 
        endType: endType || "failure", 
        badgeUnlocked: endType === "success" ? "first-win" : null 
      });
    }
  };

  const handleValidationComplete = () => {
    handleFinish();
  };

  const clientAvatar = conversationData.clientAvatar || "👨‍💼";
  const clientName = conversationData.clientName || "Cliente";
  const dealValue = conversationData.dealValue || 0;
  const commissionRate = conversationData.commissionRate || 10;
  const commission = Math.round(dealValue * commissionRate / 100);
  const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k" : n;

  const endResults = {
    success: { 
      title: "🎉 ¡Excelente!", 
      message: "Respondiste correctamente. Eso es la técnica de venta que funciona.",
      xpEarned: 100 
    },
    failure: { 
      title: "📉 No esta vez", 
      message: "Eso no era la respuesta correcta. Repasa la técnica y vuelve a intentarlo.",
      xpEarned: 40 
    },
  };
  const result = endResults[endType] || endResults.failure;

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>{clientAvatar} {clientName}</h2>
        <span className="chat-score">🏆 {score} pts</span>
      </div>
      <p className="chat-role">{conversationData.clientRole || "Cliente simulado"}</p>
      <p className="chat-context">{conversationData.context}</p>

      {/* Stake bar */}
      {dealValue > 0 && (
        <div style={{
          display: "flex",
          gap: "10px",
          margin: "0 0 12px",
          background: "#0f172a",
          borderRadius: "10px",
          padding: "10px 14px",
          border: "1px solid #1e293b",
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "16px" }}>💰</span>
            <span style={{ color: "#64748b", fontSize: "12px" }}>Venta:</span>
            <span style={{ color: "#f1f5f9", fontWeight: "700", fontSize: "14px" }}>
              {fmt(dealValue)}€
            </span>
          </div>
          <div style={{ width: "1px", background: "#1e293b" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "16px" }}>💸</span>
            <span style={{ color: "#64748b", fontSize: "12px" }}>Tu comisión ({commissionRate}%):</span>
            <span style={{ color: "#22c55e", fontWeight: "800", fontSize: "15px" }}>
              {fmt(commission)}€
            </span>
          </div>
        </div>
      )}

      <div className="chat-messages" ref={chatRef}>
        {messages.map((msg, i) => {
          if (msg.sender === "feedback") {
            const bgColor = msg.correct ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";
            const borderColor = msg.correct ? "#22c55e44" : "#ef444444";
            const textColor = msg.correct ? "#22c55e" : "#ef4444";
            
            return (
              <div key={i} className="message feedback-row">
                <div style={{
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: "12px",
                  padding: "12px 16px",
                  color: textColor,
                }}>
                  <div style={{ fontWeight: "700", marginBottom: "6px", fontSize: "13px" }}>
                    {msg.correct ? "✅ Correcto" : "❌ Incorrecto"}
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: "1.5", marginBottom: "8px" }}>
                    {msg.explanation}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "600" }}>
                    Técnica: {msg.technique}
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

        {isAnimating && (
          <div className="message client">
            <div className="message-bubble typing-indicator">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {!ended && hasOptions && !isAnimating && (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "12px",
              padding: "14px 16px",
              marginBottom: "4px"
            }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "700", color: "#f1f5f9" }}>
                ⬇️ Escoge una opción
              </h3>
            </div>
            {shuffledOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => handleOptionSelect(option)}
              disabled={isAnimating}
              style={{
                padding: "14px 16px",
                borderRadius: "10px",
                border: "1px solid #334155",
                background: selectedOption === option.id ? "#6366f155" : "#0f172a",
                color: "#f1f5f9",
                cursor: isAnimating ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                fontSize: "14px",
                textAlign: "left",
                lineHeight: "1.5",
                opacity: isAnimating ? 0.6 : 1,
                "&:hover": !isAnimating ? {
                  background: "#1e293b",
                  borderColor: "#6366f1",
                } : {},
              }}
            >
              {option.text}
            </button>
          ))}
        </div>
      )}

      {ended && (
        <div className={`result-card ${endType}`}>
          <h3>{result.title}</h3>
          <p>{result.message}</p>

          {dealValue > 0 && (
            <div style={{
              background: endType === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${endType === "success" ? "#22c55e44" : "#ef444444"}`,
              borderRadius: "12px",
              padding: "14px 18px",
              margin: "12px 0",
              textAlign: "center",
            }}>
              {endType === "success" ? (
                <>
                  <div style={{ color: "#22c55e", fontSize: "13px", marginBottom: "4px" }}>
                    🎉 Comisión ganada
                  </div>
                  <div style={{
                    color: "#22c55e",
                    fontSize: "36px",
                    fontWeight: "900",
                    lineHeight: 1,
                  }}>
                    +{commission.toLocaleString("es-ES")}€
                  </div>
                  <div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>
                    sobre una venta de {dealValue.toLocaleString("es-ES")}€
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color: "#ef4444", fontSize: "13px", marginBottom: "4px" }}>
                    📉 Comisión perdida
                  </div>
                  <div style={{
                    color: "#ef4444",
                    fontSize: "36px",
                    fontWeight: "900",
                    lineHeight: 1,
                  }}>
                    -{commission.toLocaleString("es-ES")}€
                  </div>
                  <div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>
                    no ganarás esta venta de {dealValue.toLocaleString("es-ES")}€
                  </div>
                </>
              )}
            </div>
          )}

          <p className="result-xp">+{result.xpEarned} XP &nbsp;|&nbsp; Puntuación final: {score}</p>
          <button
            onClick={() => setShowValidation(true)}
            className="btn-back"
            style={{ background: "#6366f1", marginBottom: "10px" }}
          >
            ⭐ Valorar esta sesión
          </button>
          <button
            onClick={handleFinish}
            className="btn-back"
            style={{ background: "transparent", border: "1px solid #334155", color: "#64748b" }}
          >
            Ahora no → Volver al menú
          </button>
        </div>
      )}

      {showValidation && (
        <ValidationFeedback
          userId={userId}
          conversationId={conversationData.id}
          scoreFinal={score}
          endType={endType || "failure"}
          onComplete={handleValidationComplete}
        />
      )}
    </div>
  );
}
