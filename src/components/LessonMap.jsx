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

const PRACTICE_TRACKS = [
  { id: "all", label: "Todos", emoji: "🌐" },
  { id: "seguros", label: "Seguros", emoji: "🛡️" },
  { id: "infoproductos", label: "InfoProductos", emoji: "🎓" },
  { id: "software", label: "Software", emoji: "💻" },
  { id: "entrevistas", label: "Entrevistas", emoji: "🧑‍💼" },
];

function getRecommendedLesson(profile) {
  if (!profile || !profile.challenges || profile.challenges.length === 0) return null;
  for (const challenge of profile.challenges) {
    const id = CHALLENGE_LESSON_MAP[challenge];
    if (id) return id;
  }
  return null;
}

function getRecommendedTrack(profile, profileSector) {
  if (profileSector === "seguros") return "seguros";
  if (profileSector === "infoproductos") return "infoproductos";
  if (profileSector === "kit-digital") return "software";
  if (profileSector === "inmobiliario") return "software";

  if (profile?.sells?.includes("formacion")) return "infoproductos";
  if (profile?.sells?.includes("saas")) return "software";
  if (profile?.challenges?.includes("confianza")) return "entrevistas";

  return null;
}

export default function LessonMap({ onSelectLesson, completedLessons, theoriesRead, userProfile, profileSector, demoMode }) {
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [selectedTrack, setSelectedTrack] = useState("all");
  const recommendedId = getRecommendedLesson(userProfile);
  const recommendedTrack = getRecommendedTrack(userProfile, profileSector);
  const filteredLessons = lessons.filter((lesson) => {
    if (selectedTrack === "all") return true;
    return lesson.track === selectedTrack;
  });

  const isLessonLocked = (lesson, index, lessonList) => {
    if (demoMode) return false;
    if (!lesson.isLocked) return false;
    if (index === 0) return false;
    return !completedLessons.includes(lessonList[index - 1].id);
  };

  const isTheoryDone = (id) => theoriesRead.includes(id);
  const isPracticeDone = (id) => completedLessons.includes(id);

  return (
    <div className="lesson-map-wrapper">
      <div className="lesson-map-header">
        <h1 className="lesson-map-title">🎯 salesDuo</h1>

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
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
          {PRACTICE_TRACKS.map((track) => (
            <button
              key={track.id}
              onClick={() => {
                setSelectedTrack(track.id);
                setExpandedLesson(null);
              }}
              style={{
                border: selectedTrack === track.id ? "1px solid var(--brand)" : "1px solid var(--border)",
                background: selectedTrack === track.id
                  ? "rgba(0,212,255,0.08)"
                  : recommendedTrack === track.id ? "rgba(0,230,118,0.08)" : "var(--surface)",
                color: selectedTrack === track.id
                  ? "var(--white)"
                  : recommendedTrack === track.id ? "var(--green)" : "var(--gray)",
                borderRadius: "999px",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {track.emoji} {track.label}{recommendedTrack === track.id ? " · Recomendado" : ""}
            </button>
          ))}
        </div>

        {filteredLessons.map((lesson, index) => {
          const locked = isLessonLocked(lesson, index, filteredLessons);
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
                      practiceDone ? "substep-done" : "substep-available"
                    }`}
                    onClick={() => onSelectLesson(lesson, "practice")}
                  >
                    <div className="substep-icon">
                      {practiceDone ? "✅" : "🎯"}
                    </div>
                    <div className="substep-content">
                      <span className="substep-label">Paso 2 · Práctica</span>
                      <span className="substep-name">Simulación con cliente real</span>
                      <span className="substep-meta">
                        {!theoryDone
                          ? "💡 Recomendado: haz la teoría antes"
                          : `+${lesson.xpReward} XP al completar`}
                      </span>
                    </div>
                    <div className="substep-action">
                      <span className={practiceDone ? "substep-repeat" : "substep-start"}>
                        {practiceDone ? "Repetir →" : "Practicar →"}
                      </span>
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
