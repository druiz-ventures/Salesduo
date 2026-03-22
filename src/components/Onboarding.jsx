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

export default function Onboarding({ onComplete, hasTipo = false, onlyTipo = false }) {
  const [phase, setPhase] = useState(hasTipo ? "info" : "tipo"); // "tipo" | "sector" | "info" | "profile"
  const [tipo, setTipo] = useState(null);
  const [sector, setSector] = useState(null);
  const [empresa, setEmpresa] = useState("");
  const [infoStep, setInfoStep] = useState(0);
  const [profileStep, setProfileStep] = useState(0); // 0=sell 1=buyer 2=challenge

  const [sells, setSells]         = useState([]);
  const [buyer, setBuyer]         = useState(null);
  const [challenges, setChallenges] = useState([]);

  // ── Tipo navigation ────────────────────────────────────────────────────
  const handleTipoNext = (value) => {
    setTipo(value);
    setPhase("sector");
  };

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
      onComplete({ sells, buyer, challenges, tipo, sector, empresa });
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

  // ── Render: tipo ──────────────────────────────────────────────────────
  if (phase === "tipo") {
    const TIPO_OPTIONS = [
      { id: "particular", emoji: "👤", label: "Por mi cuenta",           sub: "Freelance, autónomo o vendedor individual" },
      { id: "empresa",    emoji: "🏢", label: "Represento a una empresa", sub: "Equipo comercial, startup o pyme" },
    ];
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-card" style={{ textAlign: "center" }}>
          <div className="onboarding-emoji">🎯</div>
          <h2 className="onboarding-title">¿Cómo practicas las ventas?</h2>
          <p className="onboarding-description">Elige cómo mejor te describes. Lo usaremos para personalizar tu entrenamiento.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", margin: "28px 0" }}>
            {TIPO_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => handleTipoNext(opt.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "18px 20px",
                  borderRadius: "12px",
                  border: "2px solid #334155",
                  background: "#0f172a",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  width: "100%",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.background = "#0f172a"; }}
              >
                <span style={{ fontSize: "32px" }}>{opt.emoji}</span>
                <div>
                  <div style={{ color: "#f1f5f9", fontWeight: "700", fontSize: "16px" }}>{opt.label}</div>
                  <div style={{ color: "#64748b", fontSize: "12px", marginTop: "3px" }}>{opt.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: sector ────────────────────────────────────────────────────
  if (phase === "sector") {
    const SECTOR_OPTIONS = [
      { id: "seguros",       emoji: "🛡️", label: "Seguros" },
      { id: "inmobiliario",  emoji: "🏠", label: "Inmobiliario" },
      { id: "infoproductos", emoji: "🎓", label: "Infoproductos" },
      { id: "kit-digital",   emoji: "💻", label: "Kit Digital" },
      { id: "otros",         emoji: "✨", label: "Otros" },
    ];

    if (tipo === "particular") {
      return (
        <div className="onboarding-overlay">
          <div className="onboarding-card" style={{ textAlign: "center" }}>
            <div className="onboarding-emoji">🎯</div>
            <h2 className="onboarding-title">¿En qué sector vendes?</h2>
            <p className="onboarding-description">Lo usaremos para personalizar tus simulaciones.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", margin: "24px 0" }}>
              {SECTOR_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (onlyTipo) {
                      onComplete({ tipo, sector: opt.id, empresa: "" });
                    } else {
                      setSector(opt.id);
                      setPhase("info");
                    }
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "16px 18px", borderRadius: "12px",
                    border: "2px solid #334155", background: "#0f172a",
                    cursor: "pointer", textAlign: "left", width: "100%",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.background = "#0f172a"; }}
                >
                  <span style={{ fontSize: "28px" }}>{opt.emoji}</span>
                  <span style={{ color: "#f1f5f9", fontWeight: "600", fontSize: "15px" }}>{opt.label}</span>
                </button>
              ))}
            </div>
            <button className="btn-skip" onClick={() => setPhase("tipo")} style={{ width: "100%" }}>← Atrás</button>
          </div>
        </div>
      );
    }

    // tipo === "empresa"
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-card" style={{ textAlign: "center" }}>
          <div className="onboarding-emoji">🏢</div>
          <h2 className="onboarding-title">Cuéntanos sobre tu empresa</h2>
          <p className="onboarding-description">Lo usaremos para adaptar los escenarios de práctica.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", margin: "24px 0", textAlign: "left" }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "6px" }}>NOMBRE DE LA EMPRESA</label>
              <input
                type="text"
                placeholder="Ej: Acme Soluciones S.L."
                value={empresa}
                onChange={e => setEmpresa(e.target.value)}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "10px",
                  border: "1px solid #334155", background: "#0f172a",
                  color: "#f1f5f9", fontSize: "15px", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "8px" }}>SECTOR PRINCIPAL</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {SECTOR_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSector(opt.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "12px 16px", borderRadius: "10px",
                      border: `2px solid ${sector === opt.id ? "#6366f1" : "#334155"}`,
                      background: sector === opt.id ? "rgba(99,102,241,0.15)" : "#0f172a",
                      cursor: "pointer", textAlign: "left", width: "100%",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>{opt.emoji}</span>
                    <span style={{ color: "#f1f5f9", fontWeight: "600", fontSize: "14px" }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-skip" onClick={() => setPhase("tipo")} style={{ flex: 1 }}>← Atrás</button>
            <button
              className="btn-next"
              style={{ flex: 2, opacity: (sector && empresa.trim()) ? 1 : 0.4 }}
              disabled={!sector || !empresa.trim()}
              onClick={() => {
                if (onlyTipo) {
                  onComplete({ tipo, sector, empresa });
                } else {
                  setPhase("info");
                }
              }}
            >
              Continuar →
            </button>
          </div>
        </div>
      </div>
    );
  }

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
