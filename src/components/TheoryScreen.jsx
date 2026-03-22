import { useState } from "react";
import "../App.css";

const ROLE_PLAYBOOK = {
  setter: {
    title: "Modo SDR / Setter",
    goal: "Objetivo: calificar bien y conseguir siguiente reunión, no cerrar en la primera interacción.",
    bullets: [
      "SPIN + preguntas abiertas para descubrir dolor real antes de pitch.",
      "BANT/MEDDICC-lite para calificar (dolor, urgencia, decisión, fit).",
      "Challenger suave: aportar perspectiva sin sonar agresivo.",
      "Cierre de setter: agenda concreta (día/hora) y siguiente paso claro.",
    ],
    accent: "#06b6d4",
  },
  closer: {
    title: "Modo AE / Closer",
    goal: "Objetivo: avanzar la oportunidad a decisión y compromiso concreto.",
    bullets: [
      "Sandler: dolor + implicación + coste de no actuar.",
      "Objeciones con preguntas de precisión (no defensa automática).",
      "Challenger orientado a ROI: reencuadra y cuantifica valor.",
      "Cierre de closer: define próximo hito comercial con owner y fecha.",
    ],
    accent: "#22c55e",
  },
};

export default function TheoryScreen({ lesson, salesRole = "setter", onComplete, onBack }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = lesson.theory.slides;
  const slide = slides[currentSlide];
  const role = ROLE_PLAYBOOK[salesRole] || ROLE_PLAYBOOK.setter;
  const isLast = currentSlide === slides.length - 1;
  const progress = ((currentSlide + 1) / slides.length) * 100;

  return (
    <div className="theory-container">
      {/* Header */}
      <div className="theory-header">
        <button className="theory-back-btn" onClick={onBack}>← Volver</button>
        <span className="theory-lesson-title">{lesson.title}</span>
        <span className="theory-counter">{currentSlide + 1} / {slides.length}</span>
      </div>

      {/* Progress bar */}
      <div className="theory-progress-track">
        <div className="theory-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Slide */}
      <div className="theory-slide" key={currentSlide}>
        <div style={{
          border: `1px solid ${role.accent}55`,
          background: `${role.accent}12`,
          borderRadius: "12px",
          padding: "12px 14px",
          marginBottom: "14px",
          textAlign: "left",
        }}>
          <div style={{ color: role.accent, fontSize: "12px", fontWeight: "800", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {role.title}
          </div>
          <p style={{ color: "#cbd5e1", fontSize: "13px", margin: "0 0 8px" }}>{role.goal}</p>
          <ul style={{ margin: 0, paddingLeft: "18px", color: "#94a3b8", fontSize: "12px", lineHeight: 1.45 }}>
            {role.bullets.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>

        <div className="theory-emoji">{slide.emoji}</div>
        <h2 className="theory-title">{slide.title}</h2>
        <p className="theory-body">{slide.body}</p>

        {slide.highlight && (
          <div className="theory-highlight-box">
            <span className="theory-highlight-icon">💡</span>
            <p className="theory-highlight-text">{slide.highlight}</p>
          </div>
        )}

        {slide.technique && (
          <div className="theory-technique-tag">🎓 {slide.technique}</div>
        )}

        {slide.examples && slide.examples.length > 0 && (
          <div className="theory-examples">
            {slide.examples.map((ex, i) => (
              <div
                key={i}
                className={`theory-example ${ex.type === "correct" ? "example-correct" : "example-wrong"}`}
              >
                <span className="example-icon">
                  {ex.type === "correct" ? "✅" : "❌"}
                </span>
                <div className="example-content">
                  {ex.label && <span className="example-label">{ex.label}</span>}
                  <span className="example-text">"{ex.text}"</span>
                  {ex.reason && <span className="example-reason">{ex.reason}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="theory-nav">
        {currentSlide > 0 && (
          <button className="theory-btn-prev" onClick={() => setCurrentSlide(currentSlide - 1)}>
            ← Anterior
          </button>
        )}
        {!isLast ? (
          <button className="theory-btn-next" onClick={() => setCurrentSlide(currentSlide + 1)}>
            Siguiente →
          </button>
        ) : (
          <button className="theory-btn-practice" onClick={onComplete}>
            🎯 Practicar ahora
          </button>
        )}
      </div>

      {/* Dots */}
      <div className="theory-dots">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`theory-dot ${i === currentSlide ? "active" : ""} ${i < currentSlide ? "done" : ""}`}
            onClick={() => i <= currentSlide && setCurrentSlide(i)}
          />
        ))}
      </div>
    </div>
  );
}
