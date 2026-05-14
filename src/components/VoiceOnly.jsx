import React, { useState, useRef } from "react";
import "../App.css";
// Conversacion simple: usamos un JSON de ejemplo (objecion-precio)
import convo from "../data/conversations/objecion-precio.json";

export default function VoiceOnly() {
  const [currentNodeId, setCurrentNodeId] = useState(convo?.initialNode || "start");
  const node = convo?.nodes?.[currentNodeId] || null;
  const [messages, setMessages] = useState([
    { sender: "client", text: node?.clientMessage || "Hola, tengo una duda sobre el precio." },
  ]);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef(null);

  const rules = convo?.rules || [];

  const start = () => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Tu navegador no soporta SpeechRecognition en esta demo.");
      return;
    }
    const r = new SR();
    r.lang = "es-ES";
    r.interimResults = false;
    r.onresult = (e) => {
      const txt = e.results?.[0]?.[0]?.transcript || "";
      onUserSpeak(txt);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recognitionRef.current = r;
    r.start();
    setListening(true);
  };

  const stop = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
  };

  function addMessage(sender, text) {
    setMessages((m) => [...m, { sender, text }]);
  }

  async function onUserSpeak(text) {
    setTranscript(text);
    addMessage("user", text);

    // If we have node options, try to pick best option based on simple word overlap
    if (node?.options && node.options.length > 0) {
      const lowered = text.toLowerCase();
      let best = null;
      let bestScore = 0;
      for (const opt of node.options) {
        const words = opt.text.toLowerCase().split(/[^a-z0-9áéíóúüñ]+/i).filter(Boolean);
        let score = 0;
        for (const w of words) if (w && lowered.includes(w)) score++;
        if (score > bestScore) {
          bestScore = score;
          best = opt;
        }
      }

      if (best && bestScore > 0) {
        // pick best
        addMessage("client", best.correct ? "(Respuesta correcta) " + (best.explanation || "") : "(Respuesta no ideal) " + (best.explanation || ""));
        // advance node
        const next = best.correct ? node.nextCorrectNode || null : node.nextIncorrectNode || null;
        if (next && convo.nodes[next]) {
          setTimeout(() => {
            setCurrentNodeId(next);
            addMessage("client", convo.nodes[next].clientMessage || "");
          }, 600);
        } else if (node.nextCorrectNode && convo.nodes[node.nextCorrectNode]) {
          // fallback: follow nextCorrectNode
          setTimeout(() => {
            setCurrentNodeId(node.nextCorrectNode);
            addMessage("client", convo.nodes[node.nextCorrectNode].clientMessage || "");
          }, 600);
        } else if (convo.nodes['end-success']) {
          setTimeout(() => addMessage("client", convo.nodes['end-success'].clientMessage || "(Fin)"), 600);
        }
        return;
      }
    }

    // default fallback: encourage elaboration
    addMessage("client", convo?.fallback || "No estoy seguro de entender, dime más.");
  }

  return (
    <div className="voice-only-container">
      <h2>Simulador de voz — Demo</h2>
      <div className="voice-only-chat">
        {messages.map((m, i) => (
          <div key={i} className={`voice-msg voice-msg-${m.sender}`}>
            <strong>{m.sender === "user" ? "Tú" : "Cliente"}:</strong> {m.text}
          </div>
        ))}
      </div>

      <div className="voice-only-controls">
        <button onClick={start} disabled={listening}>Start (habla)</button>
        <button onClick={stop} disabled={!listening}>Stop</button>
        <div className="voice-only-transcript">{transcript}</div>
      </div>
    </div>
  );
}
