import { useEffect, useState } from "react";
import lessons from "../data/lessons.json";
import BrandIcon from "./BrandIcon";

const CHALLENGE_LESSON_MAP = {
  "precio":      "objecion-precio",
  "objeciones":  "objecion-precio",
  "tiempo":      "objecion-tiempo",
  "competencia": "objecion-competencia",
  "cierre":      "objecion-precio",
  "confianza":   "objecion-precio",
};

const PRACTICE_TRACKS = [
  { id: "all", label: "Todos", icon: "globe" },
  { id: "seguros", label: "Seguros", icon: "shield" },
  { id: "infoproductos", label: "InfoProductos", icon: "cap" },
  { id: "software", label: "Software", icon: "laptop" },
  { id: "entrevistas", label: "Entrevistas", icon: "building" },
];

const DIFFICULTY_META = {
  beginner: { icon: "target", label: "Fácil", className: "diff-easy" },
  intermediate: { icon: "chart", label: "Medio", className: "diff-mid" },
  hard: { icon: "shield", label: "Difícil", className: "diff-hard" },
};

const MOBILE_QUERY = "(max-width: 768px)";

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
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });
  const recommendedId = getRecommendedLesson(userProfile);
  const recommendedTrack = getRecommendedTrack(userProfile, profileSector);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;

    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const handleChange = (event) => setIsMobile(event.matches);

    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

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
      <div className="lesson-map-header" style={{ marginBottom: isMobile ? "28px" : undefined }}>
        <h1 className="lesson-map-title">salesDuo</h1>

        {/* Personalized greeting */}
        {userProfile && (
          <div className="lesson-map-profile-bar" style={{ width: "100%" }}>
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
                <BrandIcon icon="target" size={0.85} /> Empieza por aquí
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

      <div className="lesson-map-path" style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "16px",
            width: "100%",
          }}
        >
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
                padding: isMobile ? "8px 10px" : "8px 12px",
                fontSize: isMobile ? "11px" : "12px",
                fontWeight: "600",
                cursor: "pointer",
                flex: isMobile ? "1 1 calc(50% - 10px)" : "0 0 auto",
                minWidth: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                whiteSpace: "normal",
              }}
            >
              <BrandIcon icon={track.icon} size={0.95} /> {track.label}{recommendedTrack === track.id ? " · Recomendado" : ""}
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
                <div className="map-recommended-badge"><BrandIcon icon="trophy" size={0.95} /> Recomendado para ti</div>
              )}

              <div
                className={`map-node ${nodeStatus} ${isExpanded ? "expanded" : ""} ${isRecommended ? "recommended" : ""}`}
                style={{
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "flex-start" : "center",
                  gap: isMobile ? "10px" : "14px",
                  padding: isMobile ? "16px" : undefined,
                }}
                onClick={() => !locked && setExpandedLesson(isExpanded ? null : lesson.id)}
              >
                <div className="map-node-icon">
                  <BrandIcon icon={locked ? "shield" : fullyDone ? "trophy" : theoryDone ? "target" : "book"} size={1.15} />
                </div>
                <div className="map-node-info" style={{ width: isMobile ? "100%" : undefined }}>
                  <span className="map-node-title">{lesson.title}</span>
                  <span
                    className="map-node-desc"
                    style={{
                      whiteSpace: isMobile ? "normal" : undefined,
                      overflow: isMobile ? "visible" : undefined,
                      textOverflow: isMobile ? "initial" : undefined,
                    }}
                  >
                    {lesson.description}
                  </span>
                </div>
                <div
                  className="map-node-right"
                  style={{
                    width: isMobile ? "100%" : undefined,
                    flexDirection: isMobile ? "row" : undefined,
                    alignItems: isMobile ? "center" : undefined,
                    justifyContent: isMobile ? "space-between" : undefined,
                    flexWrap: isMobile ? "wrap" : undefined,
                    gap: isMobile ? "8px" : undefined,
                  }}
                >
                  <span className={`map-badge-diff ${DIFFICULTY_META[lesson.difficulty]?.className || "diff-mid"}`}>
                    <BrandIcon icon={DIFFICULTY_META[lesson.difficulty]?.icon || "chart"} size={0.9} />
                    {DIFFICULTY_META[lesson.difficulty]?.label || "Medio"}
                  </span>
                  <span className="map-node-xp">+{lesson.xpReward} XP</span>
                  {!locked && (
                    <span className="map-node-chevron">{isExpanded ? "▲" : "▼"}</span>
                  )}
                </div>
              </div>

              {isExpanded && !locked && (
                <div className="map-substeps" style={{ width: "100%" }}>
                  {/* Teoría */}
                  <div
                    className={`map-substep ${theoryDone ? "substep-done" : "substep-available"}`}
                    style={{
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "flex-start" : "center",
                      gap: isMobile ? "10px" : "14px",
                      padding: isMobile ? "12px 16px" : undefined,
                    }}
                    onClick={() => onSelectLesson(lesson, "theory")}
                  >
                    <div className="substep-icon"><BrandIcon icon={theoryDone ? "trophy" : "book"} size={1} /></div>
                    <div className="substep-content" style={{ width: isMobile ? "100%" : undefined }}>
                      <span className="substep-label">Paso 1 · Teoría</span>
                      <span className="substep-name">{lesson.theory.title}</span>
                      <span className="substep-meta">{lesson.theory.slides.length} conceptos · con ejemplos</span>
                    </div>
                    <div className="substep-action" style={{ width: isMobile ? "100%" : undefined, display: isMobile ? "flex" : undefined, justifyContent: isMobile ? "flex-end" : undefined }}>
                      <span className={theoryDone ? "substep-repeat" : "substep-start"}>
                        <BrandIcon icon={theoryDone ? "book" : "target"} size={0.85} /> {theoryDone ? "Repasar →" : "Empezar →"}
                      </span>
                    </div>
                  </div>

                  {/* Práctica */}
                  <div
                    className={`map-substep ${
                      practiceDone ? "substep-done" : "substep-available"
                    }`}
                    style={{
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "flex-start" : "center",
                      gap: isMobile ? "10px" : "14px",
                      padding: isMobile ? "12px 16px" : undefined,
                    }}
                    onClick={() => onSelectLesson(lesson, "practice")}
                  >
                    <div className="substep-icon">
                      <BrandIcon icon={practiceDone ? "trophy" : "target"} size={1} />
                    </div>
                    <div className="substep-content" style={{ width: isMobile ? "100%" : undefined }}>
                      <span className="substep-label">Paso 2 · Práctica</span>
                      <span className="substep-name">Simulación con cliente real</span>
                      <span className="substep-meta">
                        {!theoryDone
                          ? "Recomendado: haz la teoría antes"
                          : `+${lesson.xpReward} XP al completar`}
                      </span>
                    </div>
                    <div className="substep-action" style={{ width: isMobile ? "100%" : undefined, display: isMobile ? "flex" : undefined, justifyContent: isMobile ? "flex-end" : undefined }}>
                      <span className={practiceDone ? "substep-repeat" : "substep-start"}>
                        <BrandIcon icon={practiceDone ? "trophy" : "target"} size={0.85} /> {practiceDone ? "Repetir →" : "Practicar →"}
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
