import lessons from "../data/lessons.json";

export default function LessonSelector({ onSelectLesson, completedLessons }) {
  return (
    <div className="lesson-selector">
      <h1>🎯 SalesDuo</h1>
      <p className="subtitle">
        Entrena tus habilidades de venta con clientes simulados
      </p>

      {lessons.map((lesson, index) => {
        const isCompleted = completedLessons.includes(lesson.id);
        const isLocked =
          lesson.isLocked &&
          index > 0 &&
          !completedLessons.includes(lessons[index - 1].id);

        const cardClass = `lesson-card ${isLocked ? "locked" : ""} ${
          isCompleted ? "completed" : ""
        }`;

        return (
          <div
            key={lesson.id}
            className={cardClass}
            onClick={() => !isLocked && onSelectLesson(lesson)}
          >
            <div className="lesson-card-header">
              <div>
                <h3>
                  {isLocked ? "🔒" : isCompleted ? "✅" : "📖"} {lesson.title}
                </h3>
                <p>{lesson.description}</p>
              </div>
              <div>
                <span
                  className={`lesson-badge ${
                    lesson.difficulty === "beginner"
                      ? "badge-beginner"
                      : lesson.difficulty === "intermediate"
                      ? "badge-intermediate"
                      : "badge-hard"
                  }`}
                >
                  {lesson.difficulty === "beginner"
                    ? "🟢 Fácil"
                    : lesson.difficulty === "intermediate"
                    ? "🟡 Medio"
                    : "🔴 Difícil"}
                </span>
                <p className="lesson-xp">+{lesson.xpReward} XP</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}