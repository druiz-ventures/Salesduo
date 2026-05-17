import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_test_51TXmAIJ8SzDql7MTtbdkxllpQBUBL4eUqh9c6yiWmNiSrcMi6UB1dsWFQvg0ctFRzAQxXZJw04yKTFBzTOX7N4lu00B0oTJXNf");

const BrowserSR =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const BUYER = {
  name: "Diego Martínez",
  title: "Director de Operaciones",
  company: "ContactPro",
  initial: "D",
};

const WAITLIST_WEBHOOK = ""; // TODO: pegar webhook de Make aquí
const STRIPE_LINK = "";      // TODO: pegar enlace de Stripe aquí
const LANDING_URL = "https://salesduo-landing.vercel.app";

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/gm4bcobbujwf5o6iewmoerhuy2l9wh9b';

async function sendEventToMake(payload) {
  try {
    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (error) {
    console.error('Error enviando a Make:', error);
  }
}

const SCENARIO = {
  buyerPersona: "",
  context: "",
  objection: "Buenos días, soy Diego Martínez. Dígame.",
};

const MAX_TURNS = 5;

function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function getScoreColor(score) {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

async function playTTS(text) {
  try {
    const { data, error } = await supabase.functions.invoke("text-to-speech", {
      body: { text, voiceId: "851ejYcv2BoNPjrkw93G", modelId: "eleven_flash_v2_5" },
    });
    if (error || !data?.audioBase64) throw new Error("tts-failed");
    const audio = new Audio(`data:${data.mimeType || "audio/mpeg"};base64,${data.audioBase64}`);
    return new Promise((resolve) => {
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play().catch(resolve);
    });
  } catch {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-ES";
      u.rate = 1.0;
      u.pitch = 0.95;
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((x) => /es/i.test(x.lang));
      if (v) u.voice = v;
      u.onend = resolve;
      u.onerror = resolve;
      window.speechSynthesis.speak(u);
    });
  }
}

function detectOutcomeFromText(text) {
  const t = String(text || "").toLowerCase();
  const accepted = ["agendamos", "me has convencido", "sí, podemos agendar", "hablamos", "te doy un hueco", "demo de 20", "puedo darte", "agendemos", "me parece bien la demo", "sí, adelante"];
  if (accepted.some((w) => t.includes(w))) return "accepted";
  return null;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DemoCallMVP() {
  const [phase, setPhase] = useState("idle"); // idle | calling | active | ended
  const [elapsed, setElapsed] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [score, setScore] = useState(0);
  const [buyerText, setBuyerText] = useState("");
  const [userText, setUserText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [outcome, setOutcome] = useState(null);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [highlights, setHighlights] = useState([]);
  const [history, setHistory] = useState([]);
  const [tokenData, setTokenData] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [demoCompleted, setDemoCompleted] = useState(false);

  const sessionRef = useRef(false);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const historyRef = useRef([]);
  const scoreRef = useRef(0);
  const turnRef = useRef(0);
  const silenceTimerRef = useRef(null);
  const pendingTranscriptRef = useRef("");

  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { turnRef.current = turnCount; }, [turnCount]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      if (LANDING_URL) window.location.href = LANDING_URL;
      else setTokenLoading(false);
      return;
    }
    supabase
      .from("demo_tokens")
      .select("token, email, name, attempts")
      .eq("token", token)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          if (LANDING_URL) window.location.href = LANDING_URL;
          else setTokenLoading(false);
          return;
        }
        setTokenData(data);
        if (data.attempts >= 2) setDemoCompleted(true);
        setTokenLoading(false);
        sendEventToMake({ event: 'demo_accessed', token: data.token, email: data.email, name: data.name, attempts: data.attempts, timestamp: new Date().toISOString() });
      });
  }, []);

  useEffect(() => {
    if (phase === "active") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  useEffect(() => {
    return () => {
      sessionRef.current = false;
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
      clearInterval(timerRef.current);
    };
  }, []);

  async function incrementAttempts() {
    if (!tokenData) return;
    const newAttempts = (tokenData.attempts || 0) + 1;
    await supabase
      .from("demo_tokens")
      .update({ attempts: newAttempts })
      .eq("token", tokenData.token);
    setTokenData((prev) => ({ ...prev, attempts: newAttempts }));
    if (newAttempts >= 2) setDemoCompleted(true);
  }

  function stopListening() {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }

  function startListening() {
    if (!sessionRef.current || !BrowserSR) return;
    pendingTranscriptRef.current = "";
    clearTimeout(silenceTimerRef.current);

    const r = new BrowserSR();
    r.lang = "es-ES";
    r.continuous = true;
    r.interimResults = false;

    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          pendingTranscriptRef.current += e.results[i][0].transcript + " ";
        }
      }
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const text = pendingTranscriptRef.current.trim();
        pendingTranscriptRef.current = "";
        if (text && sessionRef.current) processUserTurn(text);
      }, 1800);
    };

    r.onerror = () => {
      clearTimeout(silenceTimerRef.current);
      pendingTranscriptRef.current = "";
      setIsListening(false);
      recognitionRef.current = null;
    };

    r.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  }

  function handleMicClick() {
    if (isListening) {
      const text = pendingTranscriptRef.current.trim();
      pendingTranscriptRef.current = "";
      stopListening();
      if (text && sessionRef.current) processUserTurn(text);
    } else {
      startListening();
    }
  }

  async function processBuyerTurn(clientMessage, feedbackText, scoreImpact, isEndNode, endType) {
    setIsSpeaking(true);
    setBuyerText(clientMessage);
    setFeedback(feedbackText || "");

    if (scoreImpact) {
      const next = Math.max(0, Math.min(100, scoreRef.current + scoreImpact));
      setScore(next);
      scoreRef.current = next;
    }

    if (feedbackText) {
      setHighlights((prev) => [...prev, feedbackText].slice(-4));
    }

    await playTTS(clientMessage);
    setIsSpeaking(false);
    if (!sessionRef.current) return;

    const textOutcome = detectOutcomeFromText(clientMessage);
    const finalOutcome =
      endType === "success" ? "accepted"
      : endType === "failure" ? "rejected"
      : textOutcome;

    if (finalOutcome || isEndNode || turnRef.current >= MAX_TURNS) {
      doEndCall(finalOutcome || (turnRef.current >= MAX_TURNS ? "neutral" : null));
      return;
    }

    setTimeout(startListening, 400);
  }

  async function processUserTurn(text) {
    if (!sessionRef.current) return;
    stopListening();
    setIsProcessing(true);
    setUserText(text);
    setError("");

    const nextTurn = turnRef.current + 1;
    const newHistory = [...historyRef.current, { role: "user", content: text }];

    try {
      const { data, error: aiErr } = await supabase.functions.invoke("chat-ai", {
        body: {
          conversationHistory: newHistory,
          scenarioContext: SCENARIO,
          salesRole: "setter",
          turnCount: nextTurn,
        },
      });

      if (aiErr || !data?.clientMessage) throw new Error(aiErr?.message || "Sin respuesta de la IA");

      const updatedHistory = [...newHistory, { role: "assistant", content: JSON.stringify(data) }];
      setHistory(updatedHistory);
      historyRef.current = updatedHistory;
      setTurnCount(nextTurn);
      turnRef.current = nextTurn;
      setIsProcessing(false);

      await processBuyerTurn(
        data.clientMessage,
        data.feedback || "",
        data.scoreImpact || 0,
        data.isEndNode || false,
        data.endType || null,
      );
    } catch (err) {
      setIsProcessing(false);
      setError(String(err?.message || "Error al conectar con la IA. Inténtalo de nuevo."));
    }
  }

  async function startCall() {
    sessionRef.current = true;
    setPhase("calling");
    setElapsed(0);
    setTurnCount(0);
    turnRef.current = 0;
    setScore(0);
    scoreRef.current = 0;
    setBuyerText("");
    setUserText("");
    setFeedback("");
    setOutcome(null);
    setError("");
    setHighlights([]);

    const initHistory = [
      { role: "user", content: "[INICIO DE LLAMADA EN FRIO]" },
      {
        role: "assistant",
        content: JSON.stringify({
          clientMessage: SCENARIO.objection,
          feedback: "",
          scoreImpact: 0,
          isEndNode: false,
          endType: null,
        }),
      },
    ];
    setHistory(initHistory);
    historyRef.current = initHistory;

    await new Promise((r) => setTimeout(r, 1800));
    if (!sessionRef.current) return;
    setPhase("active");
    sendEventToMake({ event: 'call_started', buyer: BUYER.name, company: BUYER.company, email: tokenData?.email, name: tokenData?.name, timestamp: new Date().toISOString() });

    setBuyerText(SCENARIO.objection);
    setIsSpeaking(true);
    await playTTS(SCENARIO.objection);
    setIsSpeaking(false);
    if (!sessionRef.current) return;
    setTimeout(startListening, 400);
  }

  function doEndCall(result) {
    sessionRef.current = false;
    stopListening();
    window.speechSynthesis?.cancel();
    clearInterval(timerRef.current);
    const r = result || "neutral";
    setScore((s) => {
      const bonus = r === "accepted" ? 20 : r === "rejected" ? -10 : 0;
      return Math.max(0, Math.min(100, s + bonus));
    });
    setOutcome(r);
    setPhase("ended");
    sendEventToMake({ event: 'call_ended', endType: r, turns: turnRef.current, score: scoreRef.current, email: tokenData?.email, name: tokenData?.name, timestamp: new Date().toISOString() });
    incrementAttempts();
  }

  function restart() {
    sessionRef.current = false;
    stopListening();
    window.speechSynthesis?.cancel();
    clearInterval(timerRef.current);
    setPhase("idle");
    setElapsed(0);
    setTurnCount(0);
    setScore(0);
    setBuyerText("");
    setUserText("");
    setFeedback("");
    setOutcome(null);
    setError("");
    setHighlights([]);
    setHistory([]);
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
  }

  if (tokenLoading) return <LoadingScreen />;
  if (demoCompleted && phase !== "active" && phase !== "calling") return <DemoCompletedScreen tokenData={tokenData} />;

  if (phase === "idle") return <IdleScreen onStart={startCall} />;
  if (phase === "calling") return <CallingScreen />;
  if (phase === "ended") {
    return (
      <EndedScreen
        outcome={outcome}
        score={score}
        elapsed={elapsed}
        highlights={highlights}
        onRestart={restart}
        canRestart={!demoCompleted}
        tokenData={tokenData}
      />
    );
  }

  return (
    <div className="dcm-screen">
      <div className="dcm-header">
        <span className="dcm-live">● EN LLAMADA</span>
        <span className="dcm-timer">{formatTime(elapsed)}</span>
        <button className="dcm-hangup-mini" onClick={() => doEndCall("neutral")}>Colgar</button>
      </div>

      <div className="dcm-buyer-info">
        <div className={`dcm-avatar ${isSpeaking ? "speaking" : ""}`}>
          {isSpeaking
            ? <span className="dcm-speaking-dots"><span /><span /><span /></span>
            : BUYER.initial}
        </div>
        <div>
          <div className="dcm-buyer-name">{BUYER.name}</div>
          <div className="dcm-buyer-title">{BUYER.title} · {BUYER.company}</div>
        </div>
      </div>

      <div className="dcm-buyer-bubble">
        {isSpeaking && <span className="dcm-speaking-label">Hablando...</span>}
        {!isSpeaking && buyerText && <span>"{buyerText}"</span>}
        {!isSpeaking && !buyerText && <span className="dcm-muted">Esperando...</span>}
      </div>

      <div className="dcm-progress-section">
        <div className="dcm-progress-label">
          <span>Nivel de persuasión</span>
          <span style={{ color: getScoreColor(score) }}><strong>{score}%</strong></span>
        </div>
        <div className="dcm-progress-bar">
          <div
            className="dcm-progress-fill"
            style={{ width: `${score}%`, background: getScoreColor(score) }}
          />
        </div>
        <div className="dcm-turns-label">
          Turno {turnCount} de {MAX_TURNS} · {MAX_TURNS - turnCount} argumentos restantes
        </div>
      </div>

      {feedback && (
        <div className="dcm-feedback">
          <span className="dcm-feedback-icon">💡</span> {feedback}
        </div>
      )}

      {userText && !isListening && (
        <div className="dcm-user-bubble">
          <span className="dcm-user-label">Tú:</span> "{userText}"
        </div>
      )}

      {error && <div className="dcm-error">{error}</div>}

      <div className="dcm-controls">
        {isProcessing ? (
          <div className="dcm-processing">
            <span className="dcm-spinner" /> Procesando...
          </div>
        ) : isSpeaking ? (
          <div className="dcm-buyer-speaking-msg">Diego está hablando...</div>
        ) : (
          <button
            className={`dcm-mic-btn ${isListening ? "active" : ""}`}
            onClick={handleMicClick}
            disabled={isSpeaking || isProcessing}
          >
            <span className="dcm-mic-icon">🎤</span>
            {isListening ? "Escuchando... (toca para detener)" : "Hablar"}
          </button>
        )}
      </div>

      <div className="dcm-objective">
        <span className="dcm-obj-label">Objetivo:</span> Convencer a Diego de agendar una demo de 20 minutos
      </div>
    </div>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="dcm-screen dcm-loading">
      <div className="dcm-loading-content">
        <div className="dcm-loading-logo">Sales<span>Duo</span></div>
        <div className="dcm-loading-spinner" />
      </div>
    </div>
  );
}

// ─── Demo Completed Screen ────────────────────────────────────────────────────
function DemoCompletedScreen({ tokenData }) {
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [stripeOpen, setStripeOpen] = useState(false);

  function handleWaitlist() {
    setWaitlistDone(true);
    if (WAITLIST_WEBHOOK) {
      fetch(WAITLIST_WEBHOOK, { method: "POST" }).catch(() => {});
    }
    sendEventToMake({ event: 'waitlist_clicked', timestamp: new Date().toISOString() });
  }

  return (
    <div className="dcm-screen dcm-ended">
      <div className="dcm-ended-content">
        <div className="dcm-ended-logo">Sales<span>Duo</span></div>
        <div className="dcm-result-card">
          <div className="dcm-outcome-icon neutral">✓</div>
          <h2 className="dcm-outcome-title">Gracias por probar SalesDuo</h2>
          <p className="dcm-outcome-desc">Ya has completado tu demo. Si quieres acceder a la plataforma completa, reserva ahora con un 50% de descuento de por vida.</p>
        </div>
        <div className="dcm-cta-section">
          <div className="dcm-cta-reserve-wrap">
            <span className="dcm-cta-badge">⚡ Early adopter · 50% off for life</span>
            <button className="dcm-cta-reserve" onClick={() => setStripeOpen(true)}>
              Reservar ahora
            </button>
          </div>
          {waitlistDone ? (
            <p className="dcm-cta-confirm">¡Genial! En cuanto la aplicación esté disponible serás el primero en saberlo.</p>
          ) : (
            <button className="dcm-cta-waitlist" onClick={handleWaitlist}>
              Apuntarme a la lista de espera
            </button>
          )}
        </div>
      </div>
      {stripeOpen && <StripeModal email={tokenData?.email} token={tokenData?.token} onClose={() => setStripeOpen(false)} />}
    </div>
  );
}

// ─── Stripe Modal ─────────────────────────────────────────────────────────────
function StripeModal({ email, token, onClose }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/create-setup-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data?.clientSecret) {
          setError("No se pudo conectar con el servidor de pago. Inténtalo de nuevo.");
        } else {
          setClientSecret(data.clientSecret);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("No se pudo conectar con el servidor de pago. Inténtalo de nuevo.");
        setLoading(false);
      });
  }, []);

  return (
    <div className="dcm-stripe-overlay">
      <div className="dcm-stripe-modal">
        {!done && <button className="dcm-stripe-close" onClick={onClose} aria-label="Cerrar">✕</button>}
        {!done && (
          <div className="dcm-stripe-header">
            <div className="dcm-stripe-logo">Sales<span>Duo</span></div>
            <p className="dcm-stripe-subtitle">Reserva tu plaza · 50% off for life</p>
            <p className="dcm-stripe-note">Introduce tu tarjeta para reservar. No se realizará ningún cargo ahora.</p>
          </div>
        )}
        {loading && <div className="dcm-stripe-loading"><div className="dcm-loading-spinner" /></div>}
        {error && <p className="dcm-stripe-error">{error}</p>}
        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: "#06b6d4" } } }}>
            <CheckoutForm onDone={() => setDone(true)} email={email} token={token} />
          </Elements>
        )}
        {done && (
          <div className="dcm-stripe-success">
            <div className="dcm-stripe-success-icon">✓</div>
            <h3>¡Reserva confirmada!</h3>
            <p>Hemos guardado tu tarjeta. No se te cobrará nada hasta que decidas activar tu cuenta.</p>
            <button className="dcm-stripe-done-btn" onClick={() => { window.location.href = LANDING_URL; }}>
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutForm({ onDone, email, token }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError("");
    const { error: stripeError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (stripeError) {
      setError(stripeError.message ?? "Error al procesar la tarjeta.");
      setProcessing(false);
    } else {
      sendEventToMake({ event: 'stripe_reserved', email, token, stripeSetupIntentId: setupIntent?.id, timestamp: new Date().toISOString() });
      onDone();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="dcm-stripe-form">
      <PaymentElement />
      {error && <p className="dcm-stripe-error">{error}</p>}
      <button className="dcm-stripe-submit" type="submit" disabled={processing || !stripe}>
        {processing ? "Procesando..." : "Confirmar reserva"}
      </button>
    </form>
  );
}

// ─── Idle Screen ─────────────────────────────────────────────────────────────
function IdleScreen({ onStart }) {
  return (
    <div className="dcm-screen dcm-idle">
      <div className="dcm-idle-content">
        <div className="dcm-idle-icon">📞</div>
        <h2 className="dcm-idle-title">Simulación de llamada de ventas</h2>
        <p className="dcm-idle-desc">
          Practica una llamada en frío real con un comprador con IA. Tu misión: conseguir que acepte
          una demo de 20 minutos en menos de 5 argumentos.
        </p>
        <div className="dcm-idle-tips">
          <div className="dcm-tip">Descubre el problema antes de vender</div>
          <div className="dcm-tip">Responde objeciones con datos concretos</div>
          <div className="dcm-tip">Pide la demo cuando hayas aportado valor</div>
          <div className="dcm-tip">Habla con naturalidad, como en una llamada real</div>
        </div>
        <button className="dcm-start-btn" onClick={onStart}>
          Iniciar llamada
        </button>
        <p className="dcm-idle-note">Requiere micrófono · Mejor en Chrome o Edge</p>
      </div>
    </div>
  );
}

// ─── Calling Screen ───────────────────────────────────────────────────────────
function CallingScreen() {
  return (
    <div className="dcm-screen dcm-calling">
      <div className="dcm-calling-content">
        <div className="dcm-calling-ring">
          <div className="dcm-ring-circle r1" />
          <div className="dcm-ring-circle r2" />
          <div className="dcm-ring-circle r3" />
          <div className="dcm-calling-avatar-inner">D</div>
        </div>
        <div className="dcm-calling-name">Diego Martínez</div>
        <div className="dcm-calling-company">Distribuciones Altair</div>
        <div className="dcm-calling-status">Llamando...</div>
      </div>
    </div>
  );
}

// ─── Ended Screen ─────────────────────────────────────────────────────────────
function EndedScreen({ outcome, score, elapsed, highlights, onRestart, canRestart, tokenData }) {
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [stripeOpen, setStripeOpen] = useState(false);
  const [rating, setRating] = useState(null); // 'up' | 'down' | null
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const MAX_CHARS = 500;
  const isAccepted = outcome === "accepted";
  const isRejected = outcome === "rejected";

  function handleWaitlist() {
    setWaitlistDone(true);
    if (WAITLIST_WEBHOOK) {
      fetch(WAITLIST_WEBHOOK, { method: "POST" }).catch(() => {});
    }
    sendEventToMake({ event: 'waitlist_clicked', timestamp: new Date().toISOString() });
  }

  function handleRating(value) {
    setRating(value);
    if (value === "up") {
      supabase.from("demo_feedback").insert({
        token: tokenData?.token,
        email: tokenData?.email,
        rating: "positive",
        comment: null,
      }).then(() => {});
    }
  }

  function handleFeedbackSubmit() {
    if (!feedbackText.trim()) return;
    supabase.from("demo_feedback").insert({
      token: tokenData?.token,
      email: tokenData?.email,
      rating: "negative",
      comment: feedbackText.trim(),
    }).then(() => {});
    setFeedbackSent(true);
  }

  return (
    <div className="dcm-screen dcm-ended">
      <div className="dcm-ended-content">
        <div className="dcm-ended-logo">Sales<span>Duo</span></div>

        <div className="dcm-result-card">
          <div className={`dcm-outcome-icon ${isAccepted ? "success" : isRejected ? "failure" : "neutral"}`}>
            {isAccepted ? "✓" : isRejected ? "✗" : "~"}
          </div>
          <h2 className="dcm-outcome-title">
            {isAccepted ? "¡Demo conseguida!" : isRejected ? "Demo rechazada" : "Llamada finalizada"}
          </h2>
          <p className="dcm-outcome-desc">
            {isAccepted
              ? "Diego ha aceptado agendar la demo de 20 minutos. Bien hecho."
              : isRejected
              ? "Diego no se convenció esta vez. Analiza qué argumentos faltaron."
              : "La llamada terminó sin un cierre claro. Intenta cerrar antes de agotar los turnos."}
          </p>

          <div className="dcm-ended-stats">
            <div className="dcm-stat-item">
              <span className="dcm-stat-value" style={{ color: getScoreColor(score) }}>{score}</span>
              <span className="dcm-stat-label">Persuasión</span>
            </div>
            <div className="dcm-stat-item">
              <span className="dcm-stat-value">{formatTime(elapsed)}</span>
              <span className="dcm-stat-label">Duración</span>
            </div>
          </div>

          {highlights.length > 0 && (
            <div className="dcm-ended-highlights">
              <div className="dcm-highlights-title">Feedback de la llamada:</div>
              {highlights.map((h, i) => (
                <div key={i} className="dcm-highlight-item">— {h}</div>
              ))}
            </div>
          )}

          <div className="dcm-rating-section">
            <p className="dcm-rating-label">¿Cómo ha ido la prueba?</p>
            <div className="dcm-rating-buttons">
              <button
                className={`dcm-rating-btn positive ${rating === "up" ? "selected" : ""}`}
                onClick={() => handleRating("up")}
                aria-label="Positivo"
              >
                👍
              </button>
              <button
                className={`dcm-rating-btn negative ${rating === "down" ? "selected" : ""}`}
                onClick={() => handleRating("down")}
                aria-label="Negativo"
              >
                👎
              </button>
            </div>
            {rating === "down" && (
              <div className="dcm-feedback-box">
                {feedbackSent ? (
                  <p className="dcm-feedback-sent">Gracias por tu feedback.</p>
                ) : (
                  <>
                    <textarea
                      className="dcm-feedback-textarea"
                      placeholder="¿Qué podríamos mejorar?"
                      maxLength={MAX_CHARS}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                    />
                    <div className="dcm-feedback-chars">{feedbackText.length}/{MAX_CHARS}</div>
                    <button className="dcm-feedback-submit" onClick={handleFeedbackSubmit}>
                      Enviar feedback
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {canRestart && (
            <button className="dcm-restart-btn" onClick={onRestart}>
              Intentar de nuevo
            </button>
          )}
        </div>

        <div className="dcm-cta-section">
          <div className="dcm-cta-reserve-wrap">
            <span className="dcm-cta-badge">⚡ Early adopter · 50% off for life</span>
            <button className="dcm-cta-reserve" onClick={() => setStripeOpen(true)}>
              Reservar ahora
            </button>
          </div>
          {waitlistDone ? (
            <p className="dcm-cta-confirm">¡Genial! En cuanto la aplicación esté disponible serás el primero en saberlo.</p>
          ) : (
            <button className="dcm-cta-waitlist" onClick={handleWaitlist}>
              Apuntarme a la lista de espera
            </button>
          )}
        </div>
      </div>
      {stripeOpen && <StripeModal email={tokenData?.email} token={tokenData?.token} onClose={() => setStripeOpen(false)} />}
    </div>
  );
}
