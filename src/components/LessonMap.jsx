import { useState } from "react";
import lessons from "../data/lessons.json";

const CHALLENGE_LESSON_MAP = {
  "precio":      "objecion-precio",
  "objeciones":  "objecion-precio",
  "tiempo":      "objecion-tiempo",
  "competencia": "objecion-competencia",
  "cierre":      "objecion-precio",
  "confianza":   "objecion-precio",
};

function getRecommendedLesson(profile) {
  if (!profile || !profile.challenges || profile.challenges.length === 0) return null;
  for (const challenge of profile.challenges) {
    const id = CHALLENGE_LESSON_MAP[challenge];
    if (id) return id;
  }
  return null;
}

export default function LessonMap({ onSelectLesson, completedLessons, theoriesRead, userProfile, demoMode }) {
  const [expandedLesson, setExpandedLesson] = useState(null);
  const recommendedId = getRecommendedLesson(userProfile);

  const isLessonLocked = (lesson, index) => {
    if (demoMode) return false;
    if (!lesson.isLocked) return false;
    if (index === 0) return false;
    return !completedLessons.includes(lessons[index - 1].id);
  };

  const isTheoryDone = (id) => theoriesRead.includes(id);
  const isPracticeDone = (id) => completedLessons.includes(id);

  return (
    <div className="lesson-map-wrapper">
      <div className="lesson-map-header">
        <h1 className="lesson-map-title">🎯 Duosales</h1>

        {/* Personalized greeting */}
        {userProfile && (
          <div className="lesson-map-profile-bar">
            {userProfile.challenges && userProfile.challenges.length > 0 && (
              <span className="profile-bar-text">
                Tu mayor reto: <strong>{userProfile.challenges.map(c => ({
                  objeciones: "manejar objeciones",
                  precio: "el argumento del precio",
                  tiempo: "crear urgencia",
                  competencia: "diferenciarte",
                  cierre: "cerrar",
                  confianza: "ganar confianza",
                }[c] || c)).join(", ")}</strong>
              </span>
            )}
            {recommendedId && !completedLessons.includes(recommendedId) && (
              <span className="profile-bar-rec">
                ⬇️ Empieza por aquí
              </span>
            )}
          </div>
        )}

        {!userProfile && (
          <p className="lesson-map-subtitle">
            Aprende la técnica. Luego practica con el cliente.
          </p>
        )}
      </div>

      <div className="lesson-map-path">
        {lessons.map((lesson, index) => {
          const locked = isLessonLocked(lesson, index);
          const theoryDone = isTheoryDone(lesson.id);
          const practiceDone = isPracticeDone(lesson.id);
          const fullyDone = theoryDone && practiceDone;
          const isExpanded = expandedLesson === lesson.id;
          const isRecommended = lesson.id === recommendedId && !fullyDone;

          const nodeStatus = fullyDone ? "done"
            : locked ? "locked"
            : theoryDone ? "theory-done"
            : "available";

          return (
            <div key={lesson.id} className="map-lesson-block">
              {index > 0 && (
                <div className={`map-connector ${locked ? "locked" : ""}`} />
              )}

              {isRecommended && !isExpanded && (
                <div className="map-recommended-badge">⭐ Recomendado para ti</div>
              )}

              <div
                className={`map-node ${nodeStatus} ${isExpanded ? "expanded" : ""} ${isRecommended ? "recommended" : ""}`}
                onClick={() => !locked && setExpandedLesson(isExpanded ? null : lesson.id)}
              >
                <div className="map-node-icon">
                  {locked ? "🔒" : fullyDone ? "✅" : theoryDone ? "🎯" : "📖"}
                </div>
                <div className="map-node-info">
                  <span className="map-node-title">{lesson.title}</span>
                  <span className="map-node-desc">{lesson.description}</span>
                </div>
                <div className="map-node-right">
                  <span className={`map-badge-diff ${
                    lesson.difficulty === "beginner" ? "diff-easy"
                    : lesson.difficulty === "intermediate" ? "diff-mid"
                    : "diff-hard"
                  }`}>
                    {lesson.difficulty === "beginner" ? "🟢 Fácil"
                    : lesson.difficulty === "intermediate" ? "🟡 Medio"
                    : "🔴 Difícil"}
                  </span>
                  <span className="map-node-xp">+{lesson.xpReward} XP</span>
                  {!locked && (
                    <span className="map-node-chevron">{isExpanded ? "▲" : "▼"}</span>
                  )}
                </div>
              </div>

              {isExpanded && !locked && (
                <div className="map-substeps">
                  {/* Teoría */}
                  <div
                    className={`map-substep ${theoryDone ? "substep-done" : "substep-available"}`}
                    onClick={() => onSelectLesson(lesson, "theory")}
                  >
                    <div className="substep-icon">{theoryDone ? "✅" : "📚"}</div>
                    <div className="substep-content">
                      <span className="substep-label">Paso 1 · Teoría</span>
                      <span className="substep-name">{lesson.theory.title}</span>
                      <span className="substep-meta">{lesson.theory.slides.length} conceptos · con ejemplos</span>
                    </div>
                    <div className="substep-action">
                      <span className={theoryDone ? "substep-repeat" : "substep-start"}>
                        {theoryDone ? "Repasar →" : "Empezar →"}
                      </span>
                    </div>
                  </div>

                  {/* Práctica */}
                  <div
                    className={`map-substep ${
                      !theoryDone ? "substep-locked"
                      : practiceDone ? "substep-done"
                      : "substep-available"
                    }`}
                    onClick={() => theoryDone && onSelectLesson(lesson, "practice")}
                  >
                    <div className="substep-icon">
                      {!theoryDone ? "🔒" : practiceDone ? "✅" : "🎯"}
                    </div>
                    <div className="substep-content">
                      <span className="substep-label">Paso 2 · Práctica</span>
                      <span className="substep-name">Simulación con cliente real</span>
                      <span className="substep-meta">
                        {!theoryDone ? "Completa la teoría primero"
                        : `+${lesson.xpReward} XP al completar`}
                      </span>
                    </div>
                    {theoryDone && (
                      <div className="substep-action">
                        <span className={practiceDone ? "substep-repeat" : "substep-start"}>
                          {practiceDone ? "Repetir →" : "Practicar →"}
                        </span>
                      </div>
                    )}
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
