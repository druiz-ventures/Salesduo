import "../App.css";
import allBadges from "../data/badges.json";

export default function Dashboard({ totalXP, completedLessons, badges, onClose }) {
  const level = Math.floor(totalXP / 100) + 1;
  const xpForNextLevel = 100 - (totalXP % 100);
  const progressPercent = (totalXP % 100);

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