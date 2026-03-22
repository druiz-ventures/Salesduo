import "../App.css";
import allBadges from "../data/badges.json";

export default function Dashboard({ totalXP, completedLessons, badges, sessionStats = { total: 0, racha: 0 }, onClose }) {
  const level = Math.floor(totalXP / 100) + 1;
  const xpForNextLevel = 100 - (totalXP % 100);
  const progressPercent = (totalXP % 100);
  const weeklyGoal = 3;
  const currentWeekSessions = sessionStats.weekly ?? 0;
  const weeklyProgress = Math.min(100, Math.round((currentWeekSessions / weeklyGoal) * 100));

  return (
    <div className="dashboard-overlay">
      <div className="dashboard-card">
        <button className="dashboard-close" onClick={onClose}>
          ✕
        </button>

        <h2 className="dashboard-title">📊 Tu Progreso</h2>

        {/* Level & XP */}
        <div className="dashboard-level-section">
          <div className="dashboard-level-circle">
            <span className="dashboard-level-number">{level}</span>
            <span className="dashboard-level-label">NIVEL</span>
          </div>
          <div className="dashboard-level-info">
            <p className="dashboard-xp-total">⭐ {totalXP} XP totales</p>
            <div className="dashboard-progress-bar">
              <div
                className="dashboard-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="dashboard-xp-next">
              {xpForNextLevel} XP para nivel {level + 1}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="dashboard-stats">
          <div className="dashboard-stat-box">
            <span className="dashboard-stat-number">{completedLessons.length}</span>
            <span className="dashboard-stat-label">Lecciones completadas</span>
          </div>
          <div className="dashboard-stat-box">
            <span className="dashboard-stat-number">{badges.length}</span>
            <span className="dashboard-stat-label">Badges obtenidos</span>
          </div>
          <div className="dashboard-stat-box">
            <span className="dashboard-stat-number">
              {completedLessons.length > 0
                ? Math.round(totalXP / completedLessons.length)
                : 0}
            </span>
            <span className="dashboard-stat-label">XP medio por lección</span>
          </div>
        </div>

        {/* Sesiones & Racha */}
        <div className="dashboard-stats" style={{ marginTop: "12px" }}>
          <div className="dashboard-stat-box" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <span className="dashboard-stat-number">🎯 {sessionStats.total}</span>
            <span className="dashboard-stat-label">Sesiones totales</span>
          </div>
          <div className="dashboard-stat-box" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)" }}>
            <span className="dashboard-stat-number">🔥 {sessionStats.racha}</span>
            <span className="dashboard-stat-label">Días seguidos</span>
          </div>
        </div>

        <div style={{
          marginTop: "14px",
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "12px",
          padding: "12px 14px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ color: "#c7d2fe", fontSize: "13px", fontWeight: 700 }}>🎯 Reto semanal</span>
            <span style={{ color: "#a5b4fc", fontSize: "12px" }}>{currentWeekSessions}/{weeklyGoal} sesiones</span>
          </div>
          <div style={{ height: "8px", background: "#0f172a", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ width: `${weeklyProgress}%`, height: "100%", background: "#6366f1" }} />
          </div>
          <p style={{ color: "#94a3b8", fontSize: "11px", margin: "8px 0 0" }}>
            Completa 3 sesiones por semana para acelerar aprendizaje y retención.
          </p>
        </div>

        {/* Badges */}
        <h3 className="dashboard-badges-title">🏅 Badges</h3>
        <div className="dashboard-badges-grid">
          {allBadges.map((badge) => {
            const isUnlocked = badges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`dashboard-badge ${isUnlocked ? "unlocked" : "locked"}`}
              >
                <span className="dashboard-badge-icon">
                  {isUnlocked ? badge.icon : "🔒"}
                </span>
                <span className="dashboard-badge-name">{badge.name}</span>
                <span className="dashboard-badge-desc">
                  {isUnlocked ? badge.description : "???"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}