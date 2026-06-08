import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe("pk_test_51TXmAIJ8SzDql7MTtbdkxllpQBUBL4eUqh9c6yiWmNiSrcMi6UB1dsWFQvg0ctFRzAQxXZJw04yKTFBzTOX7N4lu00B0oTJXNf");

// Detecta soporte de getUserMedia + MediaRecorder (pipeline propio de grabación).
// Firefox y Safari modernos soportan ambos → ya no bloqueamos por navegador.
function detectBrowserCompat() {
  if (typeof window === "undefined") return { hasMedia: true, warning: "" };
  const ua = navigator.userAgent || "";
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg/i.test(ua);
  const hasMedia =
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
    typeof MediaRecorder !== "undefined";

  if (!hasMedia) {
    return {
      hasMedia: false,
      warning: "Tu navegador no soporta grabación de audio. Usa Chrome, Edge, Safari 15+ o Firefox.",
    };
  }
  if (isSafari) {
    return {
      hasMedia: true,
      warning: "Safari puede requerir confirmar permisos de micrófono. Si la demo no arranca, prueba Chrome o Edge.",
    };
  }
  return { hasMedia: true, warning: "" };
}

// Devuelve el mimeType más capaz que soporta el navegador.
// Safari no soporta webm/opus → cae a mp4; el Edge Function mapea mp4 → m4a.
function getSupportedMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/wav",
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

const BROWSER_COMPAT = detectBrowserCompat();

// ─── ICP CONFIGS ─────────────────────────────────────────────────────────────
// Cada landing (closer, inmo, default) dispara una simulación distinta.
// Para añadir un ICP nuevo: añadir entrada aquí, deploy. La landing solo tiene
// que mandar al user con ?icp=<id> en la URL.
const ICP_CONFIGS = {
  closer: {
    salesRole: "closer",
    maxTurns: 6,
    objective: "Conseguir que Carlos cierre el Programa de Optimización Metabólica (3.000€)",
    outcome: {
      acceptedTitle: "¡Cierre conseguido!",
      rejectedTitle: "Cierre rechazado",
      acceptedDesc: "Carlos ha decidido unirse al programa. Buen trabajo manejando sus objeciones.",
      rejectedDesc: "Carlos no se convenció esta vez. Analiza qué objeciones no trabajaste bien.",
    },
    successPhrases: ["me apunto", "vamos adelante", "sí, lo hago", "me has convencido", "acepto el programa", "me uno al programa", "lo contrato"],
    BUYER: {
      name: "Carlos López",
      title: "Lead cualificado por setter",
      company: "Programa Optimización Metabólica",
      initial: "C",
    },
    SCENARIO: {
      buyerPersona:
        "Eres Carlos López, 38 años, hombre, profesional sedentario con unos 15kg de sobrepeso. Vienes agendado a esta llamada de cierre porque un setter te explicó por encima el 'Programa de Optimización Metabólica' (3.000€, 12 semanas, transformación física integral con nutrición, entrenamiento y coaching). YA HAS PROBADO dos programas anteriores (un gym con entrenador y un curso online) y no te funcionaron porque no mantuviste los hábitos — estás escéptico pero todavía interesado, por eso aceptaste la llamada. Tus objeciones reales irán apareciendo según avance la conversación: 1) 'ya he probado otros programas', 2) 'es caro, tengo que mirarlo con calma', 3) 'déjame consultarlo con mi pareja'. NO sueltes las tres seguidas — déjate llevar por la conversación, pero saca cada una en algún momento si el closer no la ataca antes. Si el closer hace buenas preguntas (te entiende, no te juzga), te abres. Si presiona o salta a vender, te cierras y dices 'mejor déjame pensarlo'.",
      context:
        "Llamada de cierre por Zoom de 30 minutos. El closer sabe tu nombre, tu situación general (sobrepeso, sedentario, has probado cosas) y que vienes cualificado por un setter. Tu trabajo: ser realista — escéptico pero no cerrado. La transformación física te importa, pero el dinero y el miedo a fracasar de nuevo pesan. Tu pareja es un factor secundario que solo sacas si el closer no maneja bien el precio.",
      objection: "Hola, sí, soy Carlos. Hablé con el chico del programa la semana pasada y me agendó contigo. Tú dirás, te escucho.",
    },
  },
  inmo: {
    salesRole: "closer",
    maxTurns: 7,
    objective: "Conseguir una visita de captación con Javier (sin exclusiva)",
    outcome: {
      acceptedTitle: "¡Captación conseguida!",
      rejectedTitle: "Captación rechazada",
      acceptedDesc: "Javier ha aceptado una visita. Te diferenciaste de los otros 8 agentes que le llamaron.",
      rejectedDesc: "Javier no quiso quedar esta vez. Analiza qué objeciones no manejaste bien.",
    },
    successPhrases: ["cuando quedamos", "puedes venir", "tráeme a quien tengas", "de acuerdo, ven", "vale, quedo contigo"],
    BUYER: {
      name: "Javier Ramírez",
      title: "Propietario",
      company: "Piso en Idealista",
      initial: "J",
    },
    SCENARIO: {
      buyerPersona:
        "Eres Javier Ramírez, 52 años, propietario de un piso de 3 habitaciones en Madrid (320.000€) anunciado en Idealista desde hace 6 semanas. YA ESTÁS con la inmobiliaria 'Aliseda' (sin exclusiva). Esta semana te han llamado al menos 8 agentes y estás saturado, casi enfadado. NO quieres cambiar de agencia y NO quieres más agentes molestando. Tu agencia actual te ha conseguido 4 visitas en 6 semanas, ninguna cerró — estás algo decepcionado pero no lo vas a admitir fácilmente. " +
        "TUS OBJECIONES REALES (sácalas en este orden aproximado, una por turno, no varias de golpe): " +
        "1) ENTRADA INMEDIATA — 'mira, ya estoy con otra inmobiliaria, gracias' (la sueltas casi al instante para cortar la llamada). " +
        "2) POSTERGACIÓN POR CANAL — 'pues mándame info por WhatsApp y ya te diré algo' (cuando el agente no se rinde con la primera). " +
        "3) DIY TÉCNICO — 'yo también sé ponerlo en Idealista, ya lo tengo publicado yo' o 'no es ninguna ciencia, pongo el anuncio y ya está' (cuando el agente intenta justificar su valor). " +
        "4) DESCONFIANZA AL GREMIO — 'las inmobiliarias sois todos unos ladrones, cobráis un 3-4% por colgar cuatro fotos en Idealista, eso lo hago yo gratis' (la sueltas con frustración real cuando ves que el agente sigue insistiendo). " +
        "5) DIY ECONÓMICO — 'la verdad es que estoy pensando venderlo yo directamente, sin pagar comisiones a nadie' (variante de la anterior, más fría, menos enfadada). " +
        "6) TERCERO QUE DECIDE — 'esto lo tengo que hablar con mi mujer, no te puedo decir nada ahora' (cuando el agente te pide compromiso firme: visita, firma, lo que sea). " +
        "7) CONCESIÓN LIMITADA (solo si el agente te ha desmontado bien 2-3 objeciones) — 'vale, mira, si quieres tráeme a quien tengas, pero olvídate de la exclusiva, eh, eso ni de coña'. " +
        "Tu actitud es SECA pero educada — eres mayor, profesional. Si el agente hace preguntas inteligentes sobre cómo te va con Aliseda, te abres un poco a regañadientes. Si suelta el pitch típico de 'tenemos una cartera enorme de clientes', cuelgas mentalmente y empiezas a responder con monosílabos. La concesión #7 es el ÚNICO camino al 'sí': sin exclusiva.",
      context:
        "Llamada en frío de un agente inmobiliario que ha visto tu piso en Idealista. El agente quiere conseguir una visita comercial (verte a ti para captarte y firmar nota de encargo). Tu objetivo defensivo: no comprometerte a nada, no quedar con nadie. Si el agente te pide quedar, postergas con 'mejor mándame info'. Solo cederás a una visita SI demuestra que entiende tu situación, no es uno más de los 8 que te han llamado, y acepta trabajar SIN exclusiva.",
      objection: "¿Sí? ¿Diga?",
    },
  },
  b2b: {
    salesRole: "setter",
    maxTurns: 5,
    objective: "Convencer a Diego de agendar una demo de 20 minutos",
    outcome: {
      acceptedTitle: "¡Demo conseguida!",
      rejectedTitle: "Demo rechazada",
      acceptedDesc: "Diego ha aceptado agendar la demo de 20 minutos. Bien hecho.",
      rejectedDesc: "Diego no se convenció esta vez. Analiza qué argumentos faltaron.",
    },
    successPhrases: ["agendamos", "sí, podemos agendar", "te doy un hueco", "demo de 20", "agendemos", "me parece bien la demo"],
    BUYER: {
      name: "Diego Martínez",
      title: "Director de Operaciones",
      company: "ContactPro · Empresa logística",
      initial: "D",
    },
    SCENARIO: {
      buyerPersona:
        "Eres Diego Martínez, Director de Operaciones de ContactPro, una empresa logística de 80 empleados en Madrid. Tienes 45 años, llevas 12 años en el sector y eres responsable directo de optimizar costes operativos. Recibes llamadas de comerciales cada día y eres ESCÉPTICO por defecto — el último que te llamó prometió 'ahorro del 30%' y no cumplió. Tu situación real: efectivamente tu equipo de back-office tarda mucho en procesar pedidos, pero priorizas estabilidad sobre cambio. Tus objeciones reales irán apareciendo: 1) 'estoy ocupado, mándame info por email', 2) 'ya tenemos un proveedor con el que estamos cómodos', 3) 'me parece caro para lo que ofrecéis' (si llega al precio). Si el comercial hace buenas preguntas de descubrimiento sobre tu día a día y tus métricas, te abres. Si suelta el pitch típico de 'somos los mejores', cortas educado pero firme.",
      context:
        "Llamada en frío de un comercial que quiere agendar una demo de 20 minutos contigo. Tu objetivo: filtrar rápido — si el comercial demuestra que entiende tu negocio, le das hueco. Si no, te lo quitas educadamente con 'mándame info'.",
      objection: "Buenos días, soy Diego Martínez. Dígame.",
    },
  },
  movistar: {
    salesRole: "closer",
    maxTurns: 8,
    objective: "Conseguir que Roberto acepte un upgrade de tarifa o un nuevo terminal",
    outcome: {
      acceptedTitle: "¡Venta conseguida!",
      rejectedTitle: "Venta rechazada",
      acceptedDesc: "Roberto ha aceptado el cambio de producto. Bien hecho detectando su necesidad real.",
      rejectedDesc: "Roberto no se convenció esta vez. Analiza si resolviste su queja antes de intentar vender.",
    },
    successPhrases: ["acepto el cambio", "me quedo con eso", "sí, cámbiame", "de acuerdo", "adelante con el cambio", "me lo pones", "ponme la tarifa", "venga, ponlo", "pues venga", "de acuerdo, ponlo"],
    BUYER: {
      name: "Roberto Sánchez",
      title: "Cliente Movistar",
      company: "Consulta de factura",
      initial: "R",
    },
    SCENARIO: {
      buyerPersona:
        "Eres Roberto Sánchez, 48 años, autónomo (pequeña empresa de reformas). Llevas 6 años con Movistar. Tu tarifa era 35€/mes con una oferta de permanencia de 2 años que terminó este mes, por eso la factura ha subido a 45€. Llamas para saber por qué subió. " +
        "Tu situación real: tienes un Samsung Galaxy S20 con la batería al 68% que no siempre llega a final del día, y tus 20GB de datos se agotan 2-3 días antes de fin de mes. Son problemas reales que tienes pero que no sacas tú solo — si el comercial pregunta directamente por la batería o los datos, lo admites sin drama. " +
        "TUS OBJECIONES (en orden, UNA por turno, no varias a la vez): " +
        "1) DEFLEXIÓN — 'Mira, llamo por la factura, no por ofertas' (al inicio, antes del pitch). " +
        "2) PRECIO — 'Si ya me ha subido, no quiero gastar más' (si el comercial ofrece algo sin haber preguntado). " +
        "3) POSTERGACIÓN — 'Déjame pensarlo' (cuando te piden una decisión sin haber explicado bien el precio). " +
        "CONDICIÓN DE APERTURA — Si el comercial: a) te explica por qué subió la factura, b) te pregunta por la batería o los datos (y admites el problema), c) te ofrece solución con precio concreto y sin permanencia → preguntas '¿Y cuánto me quedaría al mes?' o similares. " +
        "CIERRE — Si el precio es ≤40€/mes y no hay permanencia larga, dices que sí con naturalidad ('de acuerdo', 'venga, ponlo', 'pues sí'). " +
        "CUÁNDO CUELGAS — Solo si el comercial intenta venderte algo SIN haber preguntado nada sobre tu situación, o si miente sobre el precio. Si ha seguido el proceso (explicar factura → preguntar → ofrecer con precio claro), NO cuelgas aunque estés algo reticente. Eres directo pero razonable.",
      context:
        "Llamada inbound a Movistar. El comercial tiene que resolver tu duda de factura y, si detecta tus necesidades reales (batería o datos), ofrecerte un upgrade con precio claro. Si lo hace bien, acabas comprando. Si hace pitch sin escucharte, cortas. La barra es alta pero alcanzable con el guion correcto.",
      objection: "Buenos días, sí, llamo porque este mes me ha llegado la factura con 10 euros más de lo habitual y no entiendo por qué ha subido.",
    },
  },
  default: {
    // Fallback para URLs sin ?icp= explícito → mismo cliente que b2b
    salesRole: "setter",
    maxTurns: 5,
    objective: "Convencer a Diego de agendar una demo de 20 minutos",
    outcome: {
      acceptedTitle: "¡Demo conseguida!",
      rejectedTitle: "Demo rechazada",
      acceptedDesc: "Diego ha aceptado agendar la demo de 20 minutos. Bien hecho.",
      rejectedDesc: "Diego no se convenció esta vez. Analiza qué argumentos faltaron.",
    },
    successPhrases: ["agendamos", "sí, podemos agendar", "te doy un hueco", "demo de 20", "agendemos", "me parece bien la demo"],
    BUYER: {
      name: "Diego Martínez",
      title: "Director de Operaciones",
      company: "ContactPro · Empresa logística",
      initial: "D",
    },
    SCENARIO: {
      buyerPersona:
        "Eres Diego Martínez, Director de Operaciones de ContactPro, una empresa logística de 80 empleados en Madrid. Tienes 45 años, llevas 12 años en el sector y eres responsable directo de optimizar costes operativos. Recibes llamadas de comerciales cada día y eres ESCÉPTICO por defecto — el último que te llamó prometió 'ahorro del 30%' y no cumplió. Tu situación real: efectivamente tu equipo de back-office tarda mucho en procesar pedidos, pero priorizas estabilidad sobre cambio. Tus objeciones reales irán apareciendo: 1) 'estoy ocupado, mándame info por email', 2) 'ya tenemos un proveedor con el que estamos cómodos', 3) 'me parece caro para lo que ofrecéis' (si llega al precio). Si el comercial hace buenas preguntas de descubrimiento sobre tu día a día y tus métricas, te abres. Si suelta el pitch típico de 'somos los mejores', cortas educado pero firme.",
      context:
        "Llamada en frío de un comercial que quiere agendar una demo de 20 minutos contigo. Tu objetivo: filtrar rápido — si el comercial demuestra que entiende tu negocio, le das hueco. Si no, te lo quitas educadamente con 'mándame info'.",
      objection: "Buenos días, soy Diego Martínez. Dígame.",
    },
  },
};

function getActiveICP() {
  if (typeof window === "undefined") return { id: "default", ...ICP_CONFIGS.default };
  const params = new URLSearchParams(window.location.search);
  const icp = (params.get("icp") || "").toLowerCase();
  if (ICP_CONFIGS[icp]) return { id: icp, ...ICP_CONFIGS[icp] };
  return { id: "default", ...ICP_CONFIGS.default };
}

const ACTIVE_ICP = getActiveICP();
const ACTIVE_ICP_ID = ACTIVE_ICP.id;
const ACTIVE_ROLE = ACTIVE_ICP.salesRole;
const BUYER = ACTIVE_ICP.BUYER;
const SCENARIO = ACTIVE_ICP.SCENARIO;
const ACTIVE_OUTCOME = ACTIVE_ICP.outcome;
const SUCCESS_PHRASES = ACTIVE_ICP.successPhrases || [];

// ─── ATTEMPTS POR ICP ────────────────────────────────────────────────────────
// Cada (token, icp) tiene su propio contador en localStorage → así un mismo
// email puede hacer 2 demos por ICP (closer, inmo, default) sin chocar entre sí.
// La columna `attempts` en demo_tokens sigue existiendo como contador GLOBAL
// para analytics (cuántos demos totales hace cada user), pero el gate de
// lockout se basa en localStorage.
const MAX_ATTEMPTS_PER_ICP = 2;

function attemptsKey(token, icp) {
  return `salesduo_attempts_${token}_${icp}`;
}

function getLocalAttempts(token, icp) {
  if (typeof window === "undefined") return 0;
  const v = window.localStorage.getItem(attemptsKey(token, icp));
  return Number.parseInt(v || "0", 10) || 0;
}

function setLocalAttempts(token, icp, n) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(attemptsKey(token, icp), String(n));
}

const WAITLIST_WEBHOOK = ""; // TODO: pegar webhook de Make aquí
const STRIPE_LINK = "";      // TODO: pegar enlace de Stripe aquí
// Devuelve a la landing por la que entró el usuario, NO a la genérica.
// closer → /closer, inmo → /inmo, b2b/default → / (la principal de B2B)
const LANDING_BASE_URL = "https://salesduo-landing.vercel.app";
const LANDING_URL = (() => {
  switch (ACTIVE_ICP_ID) {
    case "closer":   return `${LANDING_BASE_URL}/closer`;
    case "inmo":     return `${LANDING_BASE_URL}/inmo`;
    case "movistar": return `${LANDING_BASE_URL}/telemarketing`;
    case "b2b":
    case "default":
    default:         return LANDING_BASE_URL;
  }
})();

const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/gm4bcobbujwf5o6iewmoerhuy2l9wh9b';

// Inyecta automáticamente el ICP activo en cada evento → Make sabe siempre
// desde qué landing entró el user, sin tener que añadirlo en cada call site.
async function sendEventToMake(payload) {
  try {
    await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icp: ACTIVE_ICP_ID, ...payload }),
      keepalive: true,
    });
  } catch (error) {
    console.error('Error enviando a Make:', error);
  }
}

const MAX_TURNS = ACTIVE_ICP.maxTurns || 5;

function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function getScoreColor(score) {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

// Ceba el motor de audio durante un gesto de usuario (click "Iniciar llamada").
// iOS Safari y Chrome móvil bloquean audio.play() si no se llamó al menos una
// vez dentro del tap original. Sin esto, el primer playTTS (que llega tras un
// setTimeout de 1.8s) ya está fuera del gesto y queda silencioso.
let audioUnlocked = false;
// Elemento <audio> creado y reproducido durante el gesto del usuario.
// iOS Safari bloquea new Audio().play() fuera de un gesto → reutilizamos
// siempre este mismo elemento (iOS lo mantiene "desbloqueado" de por vida).
let ttsAudioEl = null;

function unlockAudio() {
  if (audioUnlocked || typeof window === "undefined") return;
  try {
    // Cebar HTMLAudioElement con un WAV silencioso y guardarlo para reutilizarlo
    const silentWav = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    ttsAudioEl = new Audio(silentWav);
    ttsAudioEl.volume = 0;
    const p = ttsAudioEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch { /* ignore */ }
  try {
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  } catch { /* ignore */ }
  audioUnlocked = true;
}

async function playTTS(text) {
  // Tiempo mínimo basado en longitud del texto. Si TODOS los caminos de audio
  // fallan en silencio garantiza que el usuario tenga tiempo de leer el texto.
  const words = text.trim().split(/\s+/).filter(Boolean).length || 1;
  const minMs = Math.max(1500, Math.min(12000, words * 280));

  // Camino 1: audio remoto (ElevenLabs vía Supabase function)
  try {
    const { data, error } = await supabase.functions.invoke("text-to-speech", {
      body: { text, voiceId: "851ejYcv2BoNPjrkw93G", modelId: "eleven_flash_v2_5" },
    });
    if (error || !data?.audioBase64) throw new Error("tts-failed");

    // Reutilizamos el elemento desbloqueado en unlockAudio() en lugar de crear
    // uno nuevo — en iOS Safari, new Audio().play() fuera del gesto falla y cae
    // al fallback de speechSynthesis (voz de robot).
    const audio = ttsAudioEl || new Audio();
    audio.src = `data:${data.mimeType || "audio/mpeg"};base64,${data.audioBase64}`;
    audio.volume = 1;

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      await playPromise;
    }
    await new Promise((resolve) => {
      audio.onended = resolve;
      audio.onerror = resolve;
    });
    return;
  } catch { /* sigue al fallback */ }

  // Camino 2: speechSynthesis del navegador
  try {
    if (!window.speechSynthesis) throw new Error("no-synth");
    await new Promise((resolve) => {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "es-ES";
        u.rate = 1.0;
        u.pitch = 0.95;
        const voices = window.speechSynthesis.getVoices();
        const v = voices.find((x) => /es/i.test(x.lang));
        if (v) u.voice = v;
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        u.onend = finish;
        u.onerror = finish;
        window.speechSynthesis.speak(u);
        // Algunos navegadores nunca disparan onend → red de seguridad
        setTimeout(finish, minMs + 4000);
      } catch { resolve(); }
    });
    return;
  } catch { /* sigue al fallback */ }

  // Camino 3: solo damos tiempo a leer el texto en pantalla
  await new Promise((resolve) => setTimeout(resolve, minMs));
}

function detectOutcomeFromText(text) {
  // Usa las frases de éxito específicas del ICP activo — evita falsos positivos
  // con frases conversacionales genéricas ("hablamos", "sí, adelante", etc.)
  if (!SUCCESS_PHRASES.length) return null;
  const t = String(text || "").toLowerCase();
  if (SUCCESS_PHRASES.some((w) => t.includes(w))) return "accepted";
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
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [callNumber, setCallNumber] = useState(1);

  const [micError, setMicError] = useState("");

  const sessionRef = useRef(false);
  const timerRef = useRef(null);
  const historyRef = useRef([]);
  const scoreRef = useRef(0);
  const turnRef = useRef(0);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  // Pipeline de audio propio (getUserMedia → MediaRecorder → STT)
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const vadIntervalRef = useRef(null);

  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { turnRef.current = turnCount; }, [turnCount]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    // Fallback de email/name desde la URL (base64). La landing los pasa además
    // del token para que si Make tarda o falla en insertar en demo_tokens, la
    // app pueda arrancar la demo igualmente sin depender de Supabase.
    function decodeB64(v) {
      if (!v) return "";
      try { return decodeURIComponent(escape(atob(v.replace(/-/g, '+').replace(/_/g, '/')))); }
      catch { return ""; }
    }
    const urlEmail = decodeB64(params.get("e")) || params.get("email") || "";
    const urlName  = decodeB64(params.get("n")) || params.get("name")  || "";

    if (!token) {
      if (LANDING_URL) window.location.href = LANDING_URL;
      else setTokenLoading(false);
      return;
    }

    // Make procesa el cta_form_submit con un rate-limit de 4 runs/min y
    // puede tardar varios segundos en insertar el row en demo_tokens cuando
    // hay cola. Reintentamos el select unas cuantas veces, y si aun así no
    // aparece pero tenemos email/name en la URL, arrancamos la demo igual
    // (modo "fallback URL") — así no dependemos críticamente de Make.
    const MAX_RETRIES = 4;
    const RETRY_DELAY_MS = 1500;

    (async () => {
      let row = null;
      for (let i = 0; i < MAX_RETRIES; i++) {
        const { data } = await supabase
          .from("demo_tokens")
          .select("token, email, name, attempts")
          .eq("token", token)
          .maybeSingle();
        if (data) { row = data; break; }
        if (i < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }

      // Fallback: si no encontramos el row pero tenemos email/name en URL,
      // construimos un tokenData "virtual" con attempts=0. Stripe, eventos y
      // gating funcionan igual; lo único que perdemos es el contador global
      // en Supabase (que sigue contando vía localStorage).
      if (!row) {
        if (urlEmail) {
          row = { token, email: urlEmail, name: urlName || "", attempts: 0 };
        } else {
          if (LANDING_URL) window.location.href = LANDING_URL;
          else setTokenLoading(false);
          return;
        }
      }

      setTokenData(row);
      const localAttempts = getLocalAttempts(row.token, ACTIVE_ICP_ID);
      if (localAttempts >= MAX_ATTEMPTS_PER_ICP) setDemoCompleted(true);
      setTokenLoading(false);
      sendEventToMake({ event: 'demo_accessed', token: row.token, email: row.email, name: row.name, attempts: row.attempts, attemptsByIcp: localAttempts, timestamp: new Date().toISOString() });
    })();
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
      clearInterval(vadIntervalRef.current);
      try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close().catch(() => {});
      window.speechSynthesis?.cancel();
      clearInterval(timerRef.current);
    };
  }, []);

  async function incrementAttempts() {
    if (!tokenData) return;
    // Global (DB) — sigue contando total para analytics en Supabase
    const newAttempts = (tokenData.attempts || 0) + 1;
    await supabase
      .from("demo_tokens")
      .update({ attempts: newAttempts })
      .eq("token", tokenData.token);
    setTokenData((prev) => ({ ...prev, attempts: newAttempts }));
    // Por ICP (localStorage) — esto es lo que controla el lockout
    const newLocalAttempts = getLocalAttempts(tokenData.token, ACTIVE_ICP_ID) + 1;
    setLocalAttempts(tokenData.token, ACTIVE_ICP_ID, newLocalAttempts);
    if (newLocalAttempts >= MAX_ATTEMPTS_PER_ICP) setDemoCompleted(true);
  }

  function stopListening() {
    clearInterval(vadIntervalRef.current);
    vadIntervalRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    audioChunksRef.current = [];
    setIsListening(false);
  }

  async function startListening() {
    if (!sessionRef.current) return;
    if (isSpeakingRef.current || isProcessingRef.current) return;
    if (mediaRecorderRef.current) return; // ya grabando

    setMicError("");

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,        // mono — óptimo para STT, descarta ruido estéreo
          sampleRate: 16000,      // 16kHz — frecuencia nativa de modelos de voz
        },
      });
    } catch (err) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setMicError("Necesitamos permiso para usar el micrófono. Actívalo en los permisos de tu navegador.");
      } else if (name === "NotFoundError") {
        setMicError("No detectamos micrófono. Conecta uno o revisa la configuración de audio.");
      } else {
        setMicError("Error al acceder al micrófono. Inténtalo de nuevo.");
      }
      return;
    }

    if (!sessionRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    mediaStreamRef.current = stream;

    // AudioContext para VAD — resume() necesario en Safari: sin él el contexto
    // arranca en "suspended" y getByteTimeDomainData devuelve todo 128 (silencio).
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    try { await ctx.resume(); } catch { /* Safari puede ignorarlo, continuamos */ }
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    analyserRef.current = analyser;

    // MediaRecorder con el mejor formato soportado
    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    // Sin timeslice: todos los datos llegan en un único ondataavailable al hacer stop().
    // Con timeslice=100ms Safari genera fragmentos de mp4 que OpenAI STT no decodifica bien.
    recorder.start();
    setIsListening(true);

    // VAD: detección de silencio por RMS
    // - SILENCE_THRESHOLD: nivel mínimo de RMS que cuenta como "habla"
    // - MIN_SPEECH_MS: ms mínimos de habla detectada antes de empezar a contar silencio
    //   (evita que un ruido puntual + pausa dispare la transcripción)
    // - SILENCE_DURATION_MS: ms de silencio continuado tras habla para cortar
    //   2200ms es similar a Google Voice — aguanta pausas naturales al pensar
    const SILENCE_THRESHOLD = 0.018; // más alto = ignora más ruido ambiente/lejano
    const MIN_SPEECH_MS = 500;
    const SILENCE_DURATION_MS = 2800;
    const CHECK_INTERVAL_MS = 100;
    const minSpeechSamples = MIN_SPEECH_MS / CHECK_INTERVAL_MS;
    const silenceSamplesNeeded = SILENCE_DURATION_MS / CHECK_INTERVAL_MS;
    let silenceSamples = 0;
    let speechSamples = 0;

    // Timer de seguridad: máximo 45s por turno (cubre argumentos de venta largos).
    const maxRecordingTimer = setTimeout(() => {
      if (mediaRecorderRef.current) {
        clearInterval(vadIntervalRef.current);
        vadIntervalRef.current = null;
        stopAndTranscribe();
      }
    }, 45000);

    vadIntervalRef.current = setInterval(() => {
      if (!analyserRef.current || !sessionRef.current) {
        clearTimeout(maxRecordingTimer);
        return;
      }
      const buf = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buf);
      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / buf.length);

      if (rms > SILENCE_THRESHOLD) {
        speechSamples++;
        silenceSamples = 0;
      } else if (speechSamples >= minSpeechSamples) {
        // Solo contamos silencio una vez que haya habla mínima detectada
        silenceSamples++;
        if (silenceSamples >= silenceSamplesNeeded) {
          clearTimeout(maxRecordingTimer);
          clearInterval(vadIntervalRef.current);
          vadIntervalRef.current = null;
          stopAndTranscribe();
        }
      }
    }, CHECK_INTERVAL_MS);
  }

  async function stopAndTranscribe() {
    clearInterval(vadIntervalRef.current);
    vadIntervalRef.current = null;

    const recorder = mediaRecorderRef.current;
    const mimeType = recorder?.mimeType || "audio/webm";

    // Esperar el último ondataavailable antes de leer los chunks
    if (recorder && recorder.state !== "inactive") {
      await new Promise((resolve) => {
        recorder.onstop = resolve;
        try { recorder.stop(); } catch { resolve(); }
      });
    }

    // Limpiar recursos de audio
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setIsListening(false);

    const chunks = [...audioChunksRef.current];
    audioChunksRef.current = [];

    console.log("[STT] chunks:", chunks.length, "mimeType:", mimeType);
    if (!chunks.length || !sessionRef.current) {
      console.warn("[STT] sin chunks o sesión terminada, abortando");
      return;
    }

    // Blob → base64 vía FileReader (eficiente con buffers grandes)
    const blob = new Blob(chunks, { type: mimeType });
    console.log("[STT] blob size:", blob.size, "bytes");
    let audioBase64;
    try {
      audioBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("[STT] FileReader error:", e);
      return;
    }

    if (!sessionRef.current) return;

    // Indicar que estamos procesando (STT + IA comparten el mismo spinner)
    setIsProcessing(true);
    isProcessingRef.current = true;

    try {
      console.log("[STT] enviando a edge function, base64 length:", audioBase64?.length);
      const { data, error: sttErr } = await supabase.functions.invoke("speech-to-text", {
        body: { audioBase64, mimeType, language: "es" },
      });

      console.log("[STT] respuesta:", { data, error: sttErr });
      const text = data?.text?.trim();
      if (sttErr || !text) {
        console.warn("[STT] texto vacío o error, reiniciando escucha");
        setIsProcessing(false);
        isProcessingRef.current = false;
        if (sessionRef.current && !isSpeakingRef.current) setTimeout(startListening, 400);
        return;
      }

      console.log("[STT] texto transcrito:", text);
      // processUserTurn toma el control del estado isProcessing a partir de aquí
      setIsProcessing(false);
      isProcessingRef.current = false;
      processUserTurn(text);
    } catch (e) {
      console.error("[STT] excepción:", e);
      setIsProcessing(false);
      isProcessingRef.current = false;
      if (sessionRef.current && !isSpeakingRef.current) setTimeout(startListening, 400);
    }
  }

  function handleMicClick() {
    if (isListening) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
      stopAndTranscribe();
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

    setTimeout(startListening, 600);
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
          salesRole: ACTIVE_ROLE,
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

  function handleStartButtonClick() {
    if (!instructionsAccepted) {
      setShowInstructions(true);
    } else {
      startCall();
    }
  }

  async function startCall(explicitCallNumber = null) {
    // CRÍTICO en móvil: desbloquear audio DENTRO del gesto del usuario.
    // Si dejamos esto fuera o pasado el setTimeout de abajo, iOS Safari rechaza
    // audio.play() silenciosamente y el cliente IA no se oye.
    unlockAudio();
    const currentLocalAttempts = getLocalAttempts(tokenData?.token, ACTIVE_ICP_ID);
    setCallNumber(explicitCallNumber ?? (currentLocalAttempts >= 1 ? 2 : 1));
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
    setMicError("");
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
    // Nota: NO disparamos 'call_started' a Make a propósito. Ese evento no
    // matchea ninguna rama del escenario y solo consume operaciones del plan
    // free. Si más adelante quieres tracking de "cuántas llamadas se inician
    // pero no se completan", añadimos una rama en Make y descomentamos esto.

    setBuyerText(SCENARIO.objection);
    setIsSpeaking(true);
    await playTTS(SCENARIO.objection);
    setIsSpeaking(false);
    if (!sessionRef.current) return;
    setTimeout(startListening, 600);
  }

  function doEndCall(result) {
    sessionRef.current = false;
    stopListening();
    window.speechSynthesis?.cancel();
    if (ttsAudioEl) { ttsAudioEl.pause(); ttsAudioEl.currentTime = 0; }
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
    if (ttsAudioEl) { ttsAudioEl.pause(); ttsAudioEl.currentTime = 0; }
    clearInterval(timerRef.current);
    setIsListening(false);
    setIsSpeaking(false);
    setIsProcessing(false);
    // Arranca la segunda llamada directamente sin pasar por idle.
    // startCall() resetea el resto del estado (score, history, etc.).
    startCall(2);
  }

  if (tokenLoading) return <LoadingScreen />;
  if (demoCompleted && phase !== "active" && phase !== "calling") return <DemoCompletedScreen tokenData={tokenData} />;

  if (phase === "idle") return (
    <>
      <IdleScreen onStart={handleStartButtonClick} compat={BROWSER_COMPAT} />
      {showInstructions && (
        <InstructionsModal onAccept={() => { setShowInstructions(false); setInstructionsAccepted(true); startCall(); }} />
      )}
    </>
  );
  if (phase === "calling") return <CallingScreen buyer={BUYER} />;
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

      <ScriptHint
        callNumber={callNumber}
        turnCount={turnCount}
        buyerText={buyerText}
        isSpeaking={isSpeaking}
        isListening={isListening}
        icpId={ACTIVE_ICP_ID}
      />

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
      {micError && <div className="dcm-error">{micError}</div>}

      <div className="dcm-controls">
        {isProcessing ? (
          <div className="dcm-processing">
            <span className="dcm-spinner" /> Procesando...
          </div>
        ) : isSpeaking ? (
          <div className="dcm-buyer-speaking-msg">{BUYER.name} está hablando...</div>
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
        <span className="dcm-obj-label">Objetivo:</span> {ACTIVE_ICP.objective}
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
    sendEventToMake({ event: 'waitlist_clicked', email: tokenData?.email, name: tokenData?.name, timestamp: new Date().toISOString() });
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
      {stripeOpen && <StripeModal email={tokenData?.email} name={tokenData?.name} token={tokenData?.token} onClose={() => setStripeOpen(false)} />}
    </div>
  );
}

// ─── Stripe Modal ─────────────────────────────────────────────────────────────
function StripeModal({ email, name, token, onClose }) {
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
            <p className="dcm-stripe-subtitle">Reserva tu plaza</p>
            <p className="dcm-stripe-note">Introduce tu tarjeta para reservar. No se realizará ningún cargo ahora.</p>
          </div>
        )}
        {loading && <div className="dcm-stripe-loading"><div className="dcm-loading-spinner" /></div>}
        {error && <p className="dcm-stripe-error">{error}</p>}
        {clientSecret && !done && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm onDone={() => setDone(true)} email={email} name={name} token={token} clientSecret={clientSecret} />
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

function CheckoutForm({ onDone, email, name, token, clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const cardStyle = {
    style: {
      base: {
        color: "#e2e8f0",
        fontFamily: "inherit",
        fontSize: "16px",
        "::placeholder": { color: "#4b5563" },
      },
      invalid: { color: "#ef4444" },
    },
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError("");
    const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });
    if (stripeError) {
      setError(stripeError.message ?? "Error al procesar la tarjeta.");
      setProcessing(false);
    } else {
      sendEventToMake({ event: 'stripe_reserved', email, name, token, stripeSetupIntentId: setupIntent?.id, timestamp: new Date().toISOString() });
      onDone();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="dcm-stripe-form">
      <div className="dcm-card-element-wrap">
        <CardElement options={cardStyle} />
      </div>
      {error && <p className="dcm-stripe-error">{error}</p>}
      <button className="dcm-stripe-submit" type="submit" disabled={processing || !stripe}>
        {processing ? "Procesando..." : "Confirmar reserva"}
      </button>
    </form>
  );
}

// ─── Idle Screen ─────────────────────────────────────────────────────────────
function IdleScreen({ onStart, compat }) {
  const blocked = compat && !compat.hasMedia;
  return (
    <div className="dcm-screen dcm-idle">
      <div className="dcm-idle-content">
        <div className="dcm-idle-icon">📞</div>
        <h2 className="dcm-idle-title">Simulación de llamada de ventas</h2>
        <p className="dcm-idle-desc">
          Practica una llamada en frío real con un comprador con IA. Tu misión: conseguir que acepte
          una demo de 20 minutos en menos de 5 argumentos.
        </p>
        {compat?.warning && (
          <div
            className="dcm-compat-warning"
            style={{
              background: blocked ? "rgba(239,68,68,.12)" : "rgba(245,158,11,.12)",
              border: `1px solid ${blocked ? "#ef4444" : "#f59e0b"}`,
              color: blocked ? "#fecaca" : "#fde68a",
              padding: "12px 14px",
              borderRadius: 10,
              margin: "12px 0 18px",
              fontSize: 14,
              lineHeight: 1.5,
              textAlign: "left",
            }}
          >
            {blocked ? "⚠️ " : "ℹ️ "}{compat.warning}
          </div>
        )}
        <div className="dcm-idle-tips">
          <div className="dcm-tip">Descubre el problema antes de vender</div>
          <div className="dcm-tip">Responde objeciones con datos concretos</div>
          <div className="dcm-tip">Pide la demo cuando hayas aportado valor</div>
          <div className="dcm-tip">Habla con naturalidad, como en una llamada real</div>
        </div>
        <button
          className="dcm-start-btn"
          onClick={onStart}
          disabled={blocked}
          style={blocked ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        >
          {blocked ? "No disponible en este navegador" : "Iniciar llamada"}
        </button>
        <p className="dcm-idle-note">Requiere micrófono · Mejor en Chrome, Edge o Brave</p>
        <p className="dcm-idle-note">🎧 Usa auriculares o busca un lugar tranquilo para mejores resultados</p>
      </div>
    </div>
  );
}

// ─── Calling Screen ───────────────────────────────────────────────────────────
function CallingScreen({ buyer }) {
  return (
    <div className="dcm-screen dcm-calling">
      <div className="dcm-calling-content">
        <div className="dcm-calling-ring">
          <div className="dcm-ring-circle r1" />
          <div className="dcm-ring-circle r2" />
          <div className="dcm-ring-circle r3" />
          <div className="dcm-calling-avatar-inner">{buyer?.initial || "?"}</div>
        </div>
        <div className="dcm-calling-name">{buyer?.name}</div>
        <div className="dcm-calling-company">{buyer?.company}</div>
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
    sendEventToMake({ event: 'waitlist_clicked', email: tokenData?.email, name: tokenData?.name, timestamp: new Date().toISOString() });
  }

  function handleRating(value) {
    // El último click siempre gana. Si pulsa 👍 → 👎 → 👍 nos quedamos con el
    // último (Make upsertea el campo Feedback con el valor más reciente).
    setRating(value);
    const isPositive = value === "up";
    supabase.from("demo_feedback").insert({
      token: tokenData?.token,
      email: tokenData?.email,
      rating: isPositive ? "positive" : "negative",
      comment: null,
    }).then(() => {});
    sendEventToMake({
      event: isPositive ? 'feedback_positive' : 'feedback_negative',
      email: tokenData?.email,
      name: tokenData?.name,
      timestamp: new Date().toISOString(),
    });
  }

  function handleFeedbackSubmit() {
    if (!feedbackText.trim()) return;
    supabase.from("demo_feedback").insert({
      token: tokenData?.token,
      email: tokenData?.email,
      rating: "negative",
      comment: feedbackText.trim(),
    }).then(() => {});
    // Re-dispara feedback_negative con el comentario (Make upsertea el campo
    // Comentario sin tocar el resto). El click de 👎 ya dejó el thumb seteado.
    sendEventToMake({ event: 'feedback_negative', email: tokenData?.email, name: tokenData?.name, comment: feedbackText.trim(), timestamp: new Date().toISOString() });
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
            {isAccepted
              ? (ACTIVE_OUTCOME?.acceptedTitle || "¡Conseguido!")
              : isRejected
              ? (ACTIVE_OUTCOME?.rejectedTitle || "Rechazado")
              : "Llamada finalizada"}
          </h2>
          <p className="dcm-outcome-desc">
            {isAccepted
              ? (ACTIVE_OUTCOME?.acceptedDesc || "¡Bien hecho!")
              : isRejected
              ? (ACTIVE_OUTCOME?.rejectedDesc || "Analiza qué argumentos faltaron.")
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
      {stripeOpen && <StripeModal email={tokenData?.email} name={tokenData?.name} token={tokenData?.token} onClose={() => setStripeOpen(false)} />}
    </div>
  );
}

// ─── Guion fijo por ICP (segunda llamada) ────────────────────────────────────
// Índice = turnCount en el momento en que el cliente acaba de hablar
const ICP_SCRIPTS = {
  movistar: [
    // Turno 0 — Roberto llama por la factura subida
    "Gracias Roberto, le explico: tenía una oferta de permanencia de 2 años que venció este mes, por eso ha vuelto al precio normal. ¿Me permite un momento para ver qué opciones tenemos?",
    // Turno 1 — Roberto puede deflexionar ("llamo por la factura, no por ofertas")
    "Claro, primero resolvemos la factura. Dicho esto, ¿cómo le va con el móvil últimamente? ¿Tiene algún problema con la batería o con los datos?",
    // Turno 2 — Roberto admite problema de batería o datos
    "Tiene sentido, con ese uso es normal notarlo. ¿Los datos también se le agotan antes de fin de mes?",
    // Turno 3 — Roberto confirma el problema (punto de apertura)
    "Perfecto. Tengo una tarifa sin permanencia a 39€ con 50GB. Le soluciona los dos problemas. ¿Le cuento qué incluye?",
    // Turno 4 — Roberto pone objeción de precio ("no quiero gastar más")
    "Entiendo. Son 4€ más al mes, pero con 50GB en lugar de 20GB y sin permanencia. ¿Le cuadraría eso?",
    // Turno 5 — Roberto pide tiempo ("déjame pensarlo")
    "Totalmente normal. Esta condición sin permanencia es de esta semana. ¿Hay algo que le genere dudas que le pueda aclarar ahora?",
    // Turno 6 — Roberto pregunta precio final
    "39€/mes, sin permanencia, con 50GB. Si lo activa hoy incluye cambio de terminal. ¿Lo procesamos?",
    // Turno 7 — Cierre
    "Perfecto Roberto. Le confirmo: 39€/mes, 50GB, sin permanencia. ¿Quiere que le procese el cambio ahora?",
  ],
  closer: [],
  inmo: [],
  b2b: [],
  default: [],
};

// ─── InstructionsModal ────────────────────────────────────────────────────────
function InstructionsModal({ onAccept }) {
  return (
    <div className="dcm-instructions-overlay">
      <div className="dcm-instructions-modal">
        <h2 className="dcm-instructions-title">Instrucciones de la demo</h2>
        <div className="dcm-instructions-item">
          <div className="dcm-instructions-label">Primera llamada</div>
          <p className="dcm-instructions-text">
            Practicarás la simulación sin los conocimientos que <span style={{color:"#06b6d4",fontWeight:700}}>SalesDuo</span> te puede aportar.
          </p>
        </div>
        <div className="dcm-instructions-item">
          <div className="dcm-instructions-label">Segunda llamada</div>
          <p className="dcm-instructions-text">
            Al pulsar el botón «Intentar de nuevo», te mostrará el guión de cómo efectuar la llamada con los conocimientos que habrías adquirido usando <span style={{color:"#06b6d4",fontWeight:700}}>SalesDuo</span>.
          </p>
        </div>
        <button className="dcm-instructions-accept" onClick={onAccept}>
          Aceptar
        </button>
      </div>
    </div>
  );
}

// ─── ScriptHint ───────────────────────────────────────────────────────────────
function ScriptHint({ callNumber, turnCount, buyerText, isSpeaking, icpId }) {
  if (callNumber !== 2) return null;
  if (!buyerText || isSpeaking) return null;

  const script = ICP_SCRIPTS[icpId] || ICP_SCRIPTS.default;
  const hint = script[turnCount];
  if (!hint) return null;

  return (
    <div className="dcm-script-hint">
      <div className="dcm-script-hint-label">📖 Qué decir ahora:</div>
      <div className="dcm-script-hint-text">"{hint}"</div>
    </div>
  );
}
