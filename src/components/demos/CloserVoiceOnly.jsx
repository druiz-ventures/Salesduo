import { useEffect, useRef, useState } from "react";

const SpeechRecognitionCtor =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const OPEN_QUESTION_MARKERS = ["qué", "como", "cómo", "cuál", "cual", "por qué", "porque", "cuanto", "cuánto", "quien", "quién", "dónde", "donde"];
const EARLY_CLOSE_MARKERS = ["compra", "comprar", "firma", "cerramos", "cierra", "agendamos", "demo", "descuento", "precio", "te va bien", "vamos a cerrar", "te paso propuesta"];
const BUDGET_MARKERS = ["presupuesto", "coste", "precio", "caro", "barato", "cuesta", "inversión", "inversion"];
const TIMING_MARKERS = ["ahora", "este mes", "este trimestre", "mes que viene", "cuando", "plazo", "tiempo", "urgencia"];
const AUTHORITY_MARKERS = ["decidir", "aprobar", "comprar", "jefe", "equipo", "socio", "director", "decisión", "decision"];
const MAX_TURNS = 8;

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function speak(text, onEnd) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.rate = 1.0;
  utterance.pitch = 0.95;

  const voices = window.speechSynthesis.getVoices?.() || [];
  const spanishVoice = voices.find((voice) => /es(-|_)?(ES|MX|AR|CO|CL|US)?/i.test(voice.lang) || /spanish|español/i.test(voice.name));
  if (spanishVoice) utterance.voice = spanishVoice;

  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

function detectIntent(text) {
  const normalized = normalize(text);
  const isOpenQuestion = OPEN_QUESTION_MARKERS.some((marker) => normalized.includes(marker));
  const isCloseAttempt = EARLY_CLOSE_MARKERS.some((marker) => normalized.includes(marker));

  if (isCloseAttempt) return "close";
  if (isOpenQuestion) return "discovery";
  if (BUDGET_MARKERS.some((marker) => normalized.includes(marker))) return "budget";
  if (TIMING_MARKERS.some((marker) => normalized.includes(marker))) return "timing";
  if (AUTHORITY_MARKERS.some((marker) => normalized.includes(marker))) return "authority";
  if (normalized.includes("entiendo") || normalized.includes("tiene sentido") || normalized.includes("correcto")) return "empathy";
  return "neutral";
}

function getBuyerReply({ stage, turnCount, intent }) {
  const discoveryReplies = [
    "Ahora mismo nos cuesta bastante ordenar esto y se nos va tiempo cada semana.",
    "Lo que me preocupa es quitar carga operativa sin complicarle más la vida al equipo.",
    "Si es algo serio, necesito ver que realmente encaja con nuestra forma de trabajar.",
    "Ya he visto opciones parecidas, así que quiero entender qué tenéis de distinto.",
  ];

  const proofReplies = [
    "Vale, eso ya me suena mejor. Dame un ejemplo concreto de cómo lo haríais.",
    "Si me demuestras que esto no me genera más trabajo, ya me interesa más.",
    "Eso me ayuda, pero sigo queriendo ver si el resultado compensa la inversión.",
  ];

  const closeReplies = [
    "Si me lo dejas claro por escrito, lo reviso con calma y lo vemos internamente.",
    "Podría tener sentido, pero antes necesito confirmar tiempos y condiciones.",
    "Si todo cuadra, sí, podríamos avanzar al siguiente paso.",
  ];

  const closePushReplies = [
    "Ya me has dado bastante contexto. Si de verdad ves claro el valor, dime cómo sería el siguiente paso.",
    "A estas alturas necesito aterrizarlo: ¿qué propones exactamente para avanzar hoy?",
    "Vale, ya entiendo el problema. Ahora dime qué cierre concreto me estás proponiendo.",
  ];

  const resistanceReplies = [
    "Todavía es pronto para cerrar. Primero quiero entender bien el problema y el encaje.",
    "No me quiero precipitar. Necesito ver que esto realmente me aporta valor.",
    "Aún no estoy ahí. Quiero estar seguro de que esto nos compensa de verdad.",
  ];

  const budgetReplies = [
    "El presupuesto ahora mismo es sensible. Si el impacto es claro, podemos valorarlo, pero necesito entender el retorno.",
    "No me preocupa solo el precio, me preocupa justificar la inversión internamente.",
    "Si me das números concretos de ahorro o impacto, el presupuesto deja de ser el problema principal.",
  ];

  const timingReplies = [
    "El momento importa. No quiero meter otra herramienta si luego no vamos a poder implantarla bien.",
    "Ahora mismo tenemos algo de presión, pero también necesitamos orden para no complicarlo más.",
    "Si esto nos ahorra tiempo de verdad, el timing puede encajar, pero no quiero improvisar.",
  ];

  const authorityReplies = [
    "Yo lo veo interesante, pero esto no lo decido yo solo. Lo tengo que comentar internamente.",
    "Antes de mover nada, necesito alinearlo con el equipo y con quien aprueba esto.",
    "Si me lo dejas claro, puedo llevarlo a la conversación interna con más seguridad.",
  ];

  const decisionReplies = [
    "Aún no estoy listo para decidir. Me falta claridad en el encaje y en el siguiente paso.",
    "Voy viendo interés, pero todavía necesito más seguridad para moverlo adelante.",
    "Si me cierras bien el contexto, ya sí podríamos hablar de decisión.",
  ];

  if (stage === "opening") {
    return "Buenos días, dígame.";
  }

  if (turnCount >= MAX_TURNS) {
    return decisionReplies[Math.min(turnCount - MAX_TURNS, decisionReplies.length - 1)];
  }

  if (turnCount >= 6 && intent !== "close") {
    return closePushReplies[Math.min(turnCount - 6, closePushReplies.length - 1)];
  }

  if (intent === "close") {
    if (turnCount < 4) return resistanceReplies[Math.min(turnCount - 1, resistanceReplies.length - 1)];
    return closeReplies[Math.min(turnCount - 3, closeReplies.length - 1)];
  }

  if (stage === "discovery") {
    if (intent === "budget") return budgetReplies[Math.min(turnCount - 1, budgetReplies.length - 1)];
    if (intent === "timing") return timingReplies[Math.min(turnCount - 1, timingReplies.length - 1)];
    if (intent === "authority") return authorityReplies[Math.min(turnCount - 1, authorityReplies.length - 1)];
    return discoveryReplies[Math.min(turnCount - 1, discoveryReplies.length - 1)];
  }

  if (stage === "proof") {
    if (intent === "budget") return "Si el retorno es claro, el presupuesto deja de ser la barrera principal. Necesito ver ese retorno.";
    if (intent === "timing") return "El timing me importa porque no quiero meter algo que luego no podamos sostener.";
    if (intent === "authority") return "Esto lo tendré que comentar con el resto. Si me das claridad, lo puedo mover mejor internamente.";
    return proofReplies[Math.min(turnCount - 1, proofReplies.length - 1)];
  }

  if (stage === "close") {
    if (intent === "budget") return "En este punto ya necesito una propuesta con números concretos para revisar internamente.";
    if (intent === "timing") return "Si el siguiente paso es claro y rápido, puedo ver si lo encajamos este mes.";
    if (intent === "authority") return "Sí, esto hay que validarlo con las personas adecuadas antes de moverlo.";
    return closeReplies[Math.min(turnCount - 1, closeReplies.length - 1)];
  }

  if (intent === "empathy") {
    return "Sí, exactamente. Lo que me preocupa es si eso luego de verdad nos ahorra tiempo y esfuerzo.";
  }

  return discoveryReplies[Math.min(turnCount - 1, discoveryReplies.length - 1)];
}

export default function CloserVoiceOnly() {
  const [stage, setStage] = useState("idle");
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("Pulsa empezar para iniciar la llamada.");
  const [lastUserText, setLastUserText] = useState("");
  const [lastBuyerText, setLastBuyerText] = useState("");
  const [sessionOutcome, setSessionOutcome] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [turnCount, setTurnCount] = useState(0);

  const recognitionRef = useRef(null);
  const sessionActiveRef = useRef(false);
  const voicesLoadedRef = useRef(false);
  const listenDelayRef = useRef(null);

  const clearTimers = () => {
    if (listenDelayRef.current) {
      window.clearTimeout(listenDelayRef.current);
      listenDelayRef.current = null;
    }
  };

  const startListening = () => {
    if (!SpeechRecognitionCtor) {
      setStatus("Tu navegador no soporta reconocimiento de voz.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) handleUserSpeech(transcript);
    };

    recognition.onerror = () => {
      setListening(false);
      if (sessionActiveRef.current) setStatus("No he entendido bien. Repite de forma natural.");
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setListening(true);
    setStatus("Escuchando tu respuesta...");
    recognition.start();
  };

  const stopSession = () => {
    sessionActiveRef.current = false;
    setListening(false);
    setSpeaking(false);
    setStage("idle");
    setStatus("Sesión detenida.");
    setSessionOutcome("");
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    clearTimers();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleUserSpeech = (transcript) => {
    const text = String(transcript || "").trim();
    if (!text) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const nextTurn = turnCount + 1;
    const intent = detectIntent(text);
    const nextStage =
      nextTurn <= 2
        ? "discovery"
        : nextTurn <= 4
          ? "proof"
          : "close";

    const buyerReply = getBuyerReply({ stage: nextStage, turnCount: nextTurn, intent });

    setTurnCount(nextTurn);
    setLastUserText(text);
    setLastBuyerText(buyerReply);

    if (intent === "close" && nextTurn < 3) {
      setScore((current) => current - 1);
    } else if (intent === "discovery") {
      setScore((current) => current + 1);
    } else if (intent === "empathy") {
      setScore((current) => current + 1);
    }

    setStage(nextStage);
    setStatus("El comprador está respondiendo...");
    setSpeaking(true);

    speak(buyerReply, () => {
      setSpeaking(false);
      if (!sessionActiveRef.current) return;

      if (nextTurn >= MAX_TURNS) {
        const finalOutcome = intent === "close" || buyerReply.toLowerCase().includes("siguiente paso")
          ? "El comprador acepta avanzar al siguiente paso."
          : intent === "budget"
            ? "El comprador se queda con dudas de presupuesto y deja la decisión en pausa."
            : "La llamada termina con interés, pero sin cierre todavía.";

        setSessionOutcome(finalOutcome);
        setStatus(finalOutcome);
        stopSession();
        return;
      }

      if (nextTurn >= 6) {
        setStatus("El comprador ya está pidiendo un cierre concreto o un siguiente paso.");
      } else if (nextStage === "proof") {
        setStatus("El comprador pide prueba y contexto. Sigue descubriendo con precisión.");
      } else {
        setStatus("Tu turno. El comprador espera tu respuesta.");
      }

      clearTimers();
      listenDelayRef.current = window.setTimeout(() => {
        if (sessionActiveRef.current) startListening();
      }, 800);
    });
  };

  const startSession = () => {
    sessionActiveRef.current = true;
    setStage("opening");
    setScore(0);
    setTurnCount(0);
    setLastUserText("");
    setLastBuyerText("");
    setSessionOutcome("");
    setStatus("Iniciando llamada...");

    speak("Buenos días, dígame.", () => {
      if (!sessionActiveRef.current) return;
      setStage("discovery");
      setLastBuyerText("Buenos días, dígame.");
      setStatus("Ahora habla tú. El comprador te escucha.");
      clearTimers();
      listenDelayRef.current = window.setTimeout(() => {
        if (sessionActiveRef.current) startListening();
      }, 900);
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (window.speechSynthesis && !voicesLoadedRef.current) {
      voicesLoadedRef.current = true;
      const warmup = () => window.speechSynthesis.getVoices();
      warmup();
      window.speechSynthesis.onvoiceschanged = warmup;
    }

    return () => {
      stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="voice-only-container closer-voice-demo">
      <h2>Closer Voice Demo</h2>
      <p className="voice-only-subtitle">Llamada 100% hablada. La IA solo representa al comprador. Tú eres el closer.</p>

      <div className="voice-only-controls">
        <button onClick={startSession} disabled={sessionActiveRef.current && listening}>Empezar simulación</button>
        <button onClick={stopSession} disabled={!sessionActiveRef.current}>Detener</button>
      </div>

      <div className="voice-only-status">
        <div>Estado: {status}</div>
        <div>Escuchando: {listening ? "sí" : "no"}</div>
        <div>Hablando: {speaking ? "sí" : "no"}</div>
        <div>Score de llamada: {score}</div>
        <div>Fase: {stage}</div>
        <div>Turnos: {turnCount}</div>
      </div>

      <div className="voice-only-summary">
        <strong>Tu última intervención como closer:</strong> {lastUserText || "-"}
      </div>
      <div className="voice-only-summary">
        <strong>Última respuesta del comprador:</strong> {lastBuyerText || "-"}
      </div>
      {sessionOutcome ? (
        <div className="voice-only-summary">
          <strong>Resultado de la llamada:</strong> {sessionOutcome}
        </div>
      ) : null}
    </div>
  );
}