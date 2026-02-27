import { useState } from "react";
import "../App.css";

export default function TheoryScreen({ lesson, onComplete, onBack }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = lesson.theory.slides;
  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;
  const progress = ((currentSlide + 1) / slides.length) * 100;

  return (
    <div className="theory-container">
      {/* Header */}
      <div className="theory-header">
        <button className="theory-back-btn" onClick={onBack}>
          ← Volver
        </button>
        <span className="theory-lesson-title">{lesson.title}</span>
        <span className="theory-counter">
          {currentSlide + 1} / {slides.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="theory-progress-track">
        <div
          className="theory-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Slide */}
      <div className="theory-slide" key={currentSlide}>
        <div className="theory-emoji">{slide.emoji}</div>
        <h2 className="theory-title">{slide.title}</h2>
        <p className="theory-body">{slide.body}</p>

        <div className="theory-highlight-box">
          <span className="theory-highlight-icon">💡</span>
          <p className="theory-highlight-text">{slide.highlight}</p>
        </div>

        {slide.technique && (
          <div className="theory-technique-tag">
            🎓 {slide.technique}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="theory-nav">
        {currentSlide > 0 && (
          <button
            className="theory-btn-prev"
            onClick={() => setCurrentSlide(currentSlide - 1)}
          >
            ← Anterior
          </button>
        )}

        {!isLast ? (
          <button
            className="theory-btn-next"
            onClick={() => setCurrentSlide(currentSlide + 1)}
          >
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
            className={`theory-dot ${i === currentSlide ? "active" : ""} ${
              i < currentSlide ? "done" : ""
            }`}
            onClick={() => i <= currentSlide && setCurrentSlide(i)}
          />
        ))}
      </div>
    </div>
  );
}
