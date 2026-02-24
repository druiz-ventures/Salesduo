import { useState, useEffect, useRef } from "react";
import { processUserInput } from "../engine/keywordMatcher";

export default function ChatSimulator({ conversationData, onFinish }) {
  const [currentNodeId, setCurrentNodeId] = useState(
    conversationData.initialNode
  );
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
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || ended) return;

    const currentNode = conversationData.nodes[currentNodeId];
    const newMessages = [...messages, { sender: "user", text: input }];
    const { nextNodeId, scoreImpact } = processUserInput(currentNode, input);
    const nextNode = conversationData.nodes[nextNodeId];

    if (!nextNode) {
      setMessages([
        ...newMessages,
        { sender: "system", text: "Error: nodo no encontrado" },
      ]);
      setInput("");
      return;
    }

    newMessages.push({ sender: "client", text: nextNode.clientMessage });

    if (nextNode.hint) {
      newMessages.push({ sender: "hint", text: "💡 " + nextNode.hint });
    }

    const newScore = score + scoreImpact;
    setMessages(newMessages);
    setScore(newScore);
    setCurrentNodeId(nextNodeId);
    setInput("");

    if (nextNode.isEndNode) {
      setEnded(true);
      const finalScore = newScore + (nextNode.scoreImpact || 0);
      setScore(finalScore);
      setResult(conversationData.endResults[nextNode.endType]);
      setEndType(nextNode.endType);
    }
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
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.sender}`}>
            <div className="message-bubble">{msg.text}</div>
          </div>
        ))}
      </div>

      {!ended ? (
        <div className="chat-input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escribe tu respuesta de ventas..."
            className="chat-input"
          />
          <button onClick={handleSend} className="btn-send">
            Enviar
          </button>
        </div>
      ) : (
        <div className={`result-card ${endType}`}>
          <h3>{result?.title}</h3>
          <p>{result?.message}</p>
          <p className="result-xp">
            +{result?.xpEarned} XP | Puntuación final: {score}
          </p>
          <button onClick={handleFinish} className="btn-back">
            Volver al menú
          </button>
        </div>
      )}
    </div>
  );
}