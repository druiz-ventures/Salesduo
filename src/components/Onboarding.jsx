import { useState } from "react";
import "../App.css";

const steps = [
  {
    emoji: "🎯",
    title: "Bienvenido a SalesDuo",
    description:
      "La app que convierte a cualquier persona en un vendedor de élite. Entrena con clientes simulados por IA.",
    highlight: "Usado por +500 equipos de ventas",
  },
  {
    emoji: "🤖",
    title: "Clientes IA que reaccionan a lo que dices",
    description:
      "Escribe lo que quieras. El cliente responde de forma realista según tu técnica de venta. Sin guiones, sin respuestas predefinidas.",
    highlight: "Texto libre, no multiple choice",
  },
  {
    emoji: "📈",
    title: "Aprende de tus errores",
    description:
      "Cada respuesta suma o resta puntos. Recibes hints en tiempo real y desbloqueas badges conforme mejoras. Gamificación pura.",
    highlight: "Sistema de XP + Badges + Rankings",
  },
  {
    emoji: "🚀",
    title: "¿Listo para tu primera venta?",
    description:
      "Tu primer cliente te espera. Dice que tu producto es demasiado caro. ¿Sabrás manejar la objeción?",
    highlight: "Empezar ahora →",
  },
];

export default function Onboarding({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        {/* Progress dots */}
        <div className="onboarding-dots">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`onboarding-dot ${i === currentStep ? "active" : ""} ${
                i < currentStep ? "done" : ""
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="onboarding-emoji">{step.emoji}</div>
        <h2 className="onboarding-title">{step.title}</h2>
        <p className="onboarding-description">{step.description}</p>
        <div className="onboarding-highlight">{step.highlight}</div>

        {/* Buttons */}
        <div className="onboarding-buttons">
          {!isLast && (
            <button className="btn-skip" onClick={handleSkip}>
              Saltar
            </button>
          )}
          <button className="btn-next" onClick={handleNext}>
            {isLast ? "🚀 Empezar" : "Siguiente →"}
          </button>
        </div>
      </div>
    </div>
  );
}