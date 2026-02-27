import { useState } from "react";
import "../App.css";

// ─── Perfil: qué vendes ────────────────────────────────────────────────────
const SELL_OPTIONS = [
  { id: "saas",        emoji: "💻", label: "Software / SaaS" },
  { id: "servicios",   emoji: "🛠️", label: "Servicios profesionales" },
  { id: "inmobiliaria",emoji: "🏠", label: "Inmobiliaria" },
  { id: "formacion",   emoji: "🎓", label: "Formación / Cursos" },
  { id: "retail",      emoji: "🛍️", label: "Producto físico" },
  { id: "otro",        emoji: "✨", label: "Otro" },
];

// ─── Perfil: a quién vendes ────────────────────────────────────────────────
const BUYER_OPTIONS = [
  { id: "empresas",    emoji: "🏢", label: "Empresas (B2B)" },
  { id: "particulares",emoji: "👤", label: "Particulares (B2C)" },
  { id: "ambos",       emoji: "🔄", label: "Ambos" },
];

// ─── Perfil: mayor reto ────────────────────────────────────────────────────
const CHALLENGE_OPTIONS = [
  { id: "objeciones",  emoji: "🛡️", label: "Me frenan las objeciones" },
  { id: "precio",      emoji: "💰", label: "Siempre me dicen que es caro" },
  { id: "tiempo",      emoji: "⏰", label: "El cliente nunca tiene tiempo" },
  { id: "competencia", emoji: "⚔️", label: "Me comparan con la competencia" },
  { id: "cierre",      emoji: "🤝", label: "No sé cómo cerrar" },
  { id: "confianza",   emoji: "😬", label: "Me falta confianza al vender" },
];

// ─── Pantallas informativas ────────────────────────────────────────────────
const INFO_STEPS = [
  {
    emoji: "😤",
    title: "¿Cuántas veces has salido de una reunión pensando\u00A0'podría haberlo hecho mejor'?",
    description: "Esa sensación tiene nombre: es la distancia entre lo que sabes sobre tu producto y lo que sabes sobre vender. La buena noticia es que vender es una habilidad. Se entrena.",
    highlight: "No se nace vendedor. Se aprende.",
  },
  {
    emoji: "🤖",
    title: "Entrena con clientes que reaccionan de verdad",
    description: "Escribe lo que quieras. El cliente simulado responde según tu técnica: si defiendes el precio, te pide descuento. Si preguntas bien, te abre sus problemas. Sin guiones, sin trampa.",
    highlight: "Como un piloto de vuelo, pero para ventas.",
  },
  {
    emoji: "📈",
    title: "Cada error te hace mejor",
    description: "Recibes feedback en tiempo real después de cada respuesta: qué técnica usaste, si funcionó y por qué. Sumas XP, desbloqueas badges y ves tu progreso sesión a sesión.",
    highlight: "Aprende más en 20 minutos aquí que en un mes sin practicar.",
  },
];

export default function Onboarding({ onComplete }) {
  const [phase, setPhase] = useState("info"); // "info" | "profile"
  const [infoStep, setInfoStep] = useState(0);
  const [profileStep, setProfileStep] = useState(0); // 0=sell 1=buyer 2=challenge

  const [sells, setSells]         = useState([]);
  const [buyer, setBuyer]         = useState(null);
  const [challenges, setChallenges] = useState([]);

  // ── Info navigation ────────────────────────────────────────────────────
  const handleInfoNext = () => {
    if (infoStep < INFO_STEPS.length - 1) {
      setInfoStep(infoStep + 1);
    } else {
      setPhase("profile");
    }
  };

  // ── Profile navigation ─────────────────────────────────────────────────
  const handleProfileNext = () => {
    if (profileStep < 2) {
      setProfileStep(profileStep + 1);
    } else {
      onComplete({ sells, buyer, challenges });
    }
  };

  const canContinueProfile = () => {
    if (profileStep === 0) return sells.length > 0;
    if (profileStep === 1) return buyer !== null;
    if (profileStep === 2) return challenges.length > 0;
    return false;
  };

  const toggleMulti = (id, list, setList) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  // ── Render: info slides ────────────────────────────────────────────────
  if (phase === "info") {
    const step = INFO_STEPS[infoStep];
    const totalDots = INFO_STEPS.length + 3; // info + 3 profile steps
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-card">
          <div className="onboarding-dots">
            {Array.from({ length: totalDots }).map((_, i) => (
              <div key={i} className={`onboarding-dot ${i === infoStep ? "active" : ""} ${i < infoStep ? "done" : ""}`} />
            ))}
          </div>

          <div className="onboarding-emoji">{step.emoji}</div>
          <h2 className="onboarding-title">{step.title}</h2>
          <p className="onboarding-description">{step.description}</p>
          <div className="onboarding-highlight">{step.highlight}</div>

          <div className="onboarding-buttons">
            <button className="btn-skip" onClick={() => setPhase("profile")}>
              Saltar intro
            </button>
            <button className="btn-next" onClick={handleInfoNext}>
              {infoStep < INFO_STEPS.length - 1 ? "Siguiente →" : "Crear mi perfil →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: profile steps ──────────────────────────────────────────────
  const totalDots = INFO_STEPS.length + 3;
  const currentDot = INFO_STEPS.length + profileStep;

  const profileTitles = [
    "¿Qué vendes?",
    "¿A quién vendes?",
    "¿Cuál es tu mayor reto ahora mismo?",
  ];
  const profileSubs = [
    "Selecciona todo lo que aplique",
    "Elige una opción",
    "Puedes elegir más de uno",
  ];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card onboarding-card-profile">
        {/* Dots */}
        <div className="onboarding-dots">
          {Array.from({ length: totalDots }).map((_, i) => (
            <div key={i} className={`onboarding-dot ${i === currentDot ? "active" : ""} ${i < currentDot ? "done" : ""}`} />
          ))}
        </div>

        <div className="profile-step-label">Tu perfil · {profileStep + 1} de 3</div>
        <h2 className="onboarding-title">{profileTitles[profileStep]}</h2>
        <p className="profile-step-sub">{profileSubs[profileStep]}</p>

        {/* Step 0: qué vendes */}
        {profileStep === 0 && (
          <div className="profile-grid">
            {SELL_OPTIONS.map(opt => (
              <button
                key={opt.id}
                className={`profile-chip ${sells.includes(opt.id) ? "selected" : ""}`}
                onClick={() => toggleMulti(opt.id, sells, setSells)}
              >
                <span className="chip-emoji">{opt.emoji}</span>
                <span className="chip-label">{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: a quién vendes */}
        {profileStep === 1 && (
          <div className="profile-grid profile-grid-3">
            {BUYER_OPTIONS.map(opt => (
              <button
                key={opt.id}
                className={`profile-chip ${buyer === opt.id ? "selected" : ""}`}
                onClick={() => setBuyer(opt.id)}
              >
                <span className="chip-emoji">{opt.emoji}</span>
                <span className="chip-label">{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: retos */}
        {profileStep === 2 && (
          <div className="profile-grid">
            {CHALLENGE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                className={`profile-chip ${challenges.includes(opt.id) ? "selected" : ""}`}
                onClick={() => toggleMulti(opt.id, challenges, setChallenges)}
              >
                <span className="chip-emoji">{opt.emoji}</span>
                <span className="chip-label">{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="onboarding-buttons" style={{ marginTop: "24px" }}>
          {profileStep > 0 && (
            <button className="btn-skip" onClick={() => setProfileStep(profileStep - 1)}>
              ← Atrás
            </button>
          )}
          <button
            className="btn-next"
            onClick={handleProfileNext}
            disabled={!canContinueProfile()}
            style={{ opacity: canContinueProfile() ? 1 : 0.4 }}
          >
            {profileStep < 2 ? "Continuar →" : "🚀 Empezar a entrenar"}
          </button>
        </div>
      </div>
    </div>
  );
}
