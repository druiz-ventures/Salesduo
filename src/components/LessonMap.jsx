import { useState } from "react";
import lessons from "../data/lessons.json";

export default function LessonMap({ onSelectLesson, completedLessons, theoriesRead }) {
  const [expandedLesson, setExpandedLesson] = useState(null);

  const isLessonLocked = (lesson, index) => {
    if (!lesson.isLocked) return false;
    if (index === 0) return false;
    return !completedLessons.includes(lessons[index - 1].id);
  };

  const isTheoryDone = (lessonId) => theoriesRead.includes(lessonId);
  const isPracticeDone = (lessonId) => completedLessons.includes(lessonId);

  return (
    <div className="lesson-map-wrapper">
      <div className="lesson-map-header">
        <h1 className="lesson-map-title">🎯 Duosales</h1>
        <p className="lesson-map-subtitle">
          Aprende la técnica. Luego practica con el cliente.
        </p>
      </div>

      <div className="lesson-map-path">
        {lessons.map((lesson, index) => {
          const locked = isLessonLocked(lesson, index);
          const theoryDone = isTheoryDone(lesson.id);
          const practiceDone = isPracticeDone(lesson.id);
          const fullyDone = theoryDone && practiceDone;
          const isExpanded = expandedLesson === lesson.id;

          const nodeStatus = fullyDone
            ? "done"
            : locked
            ? "locked"
            : theoryDone
            ? "theory-done"
            : "available";

          return (
            <div key={lesson.id} className="map-lesson-block">
              {/* Connector line (not for first) */}
              {index > 0 && (
                <div className={`map-connector ${locked ? "locked" : ""}`} />
              )}

              {/* Main node */}
              <div
                className={`map-node ${nodeStatus} ${isExpanded ? "expanded" : ""}`}
                onClick={() => !locked && setExpandedLesson(
                  isExpanded ? null : lesson.id
                )}
              >
                <div className="map-node-icon">
                  {locked ? "🔒" : fullyDone ? "✅" : theoryDone ? "🎯" : "📖"}
                </div>
                <div className="map-node-info">
                  <span className="map-node-title">{lesson.title}</span>
                  <span className="map-node-desc">{lesson.description}</span>
                </div>
                <div className="map-node-right">
                  <span
                    className={`map-badge-diff ${
                      lesson.difficulty === "beginner"
                        ? "diff-easy"
                        : lesson.difficulty === "intermediate"
                        ? "diff-mid"
                        : "diff-hard"
                    }`}
                  >
                    {lesson.difficulty === "beginner"
                      ? "🟢 Fácil"
                      : lesson.difficulty === "intermediate"
                      ? "🟡 Medio"
                      : "🔴 Difícil"}
                  </span>
                  <span className="map-node-xp">+{lesson.xpReward} XP</span>
                  {!locked && (
                    <span className="map-node-chevron">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded sub-steps */}
              {isExpanded && !locked && (
                <div className="map-substeps">
                  {/* Step 1: Theory */}
                  <div
                    className={`map-substep ${theoryDone ? "substep-done" : "substep-available"}`}
                    onClick={() => onSelectLesson(lesson, "theory")}
                  >
                    <div className="substep-icon">
                      {theoryDone ? "✅" : "📚"}
                    </div>
                    <div className="substep-content">
                      <span className="substep-label">
                        Paso 1 · Teoría
                      </span>
                      <span className="substep-name">
                        {lesson.theory.title}
                      </span>
                      <span className="substep-meta">
                        {lesson.theory.slides.length} conceptos clave
                      </span>
                    </div>
                    <div className="substep-action">
                      {theoryDone ? (
                        <span className="substep-repeat">Repasar →</span>
                      ) : (
                        <span className="substep-start">Empezar →</span>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Practice */}
                  <div
                    className={`map-substep ${
                      !theoryDone
                        ? "substep-locked"
                        : practiceDone
                        ? "substep-done"
                        : "substep-available"
                    }`}
                    onClick={() =>
                      theoryDone && onSelectLesson(lesson, "practice")
                    }
                  >
                    <div className="substep-icon">
                      {!theoryDone ? "🔒" : practiceDone ? "✅" : "🎯"}
                    </div>
                    <div className="substep-content">
                      <span className="substep-label">
                        Paso 2 · Práctica
                      </span>
                      <span className="substep-name">
                        Simulación con cliente real
                      </span>
                      <span className="substep-meta">
                        {!theoryDone
                          ? "Completa la teoría primero"
                          : `+${lesson.xpReward} XP al completar`}
                      </span>
                    </div>
                    <div className="substep-action">
                      {theoryDone && (
                        <span className={practiceDone ? "substep-repeat" : "substep-start"}>
                          {practiceDone ? "Repetir →" : "Practicar →"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
