import { useState, useEffect } from "react";
import "./App.css";
import Onboarding from "./components/Onboarding";
import LessonSelector from "./components/LessonSelector";
import ChatSimulator from "./components/ChatSimulator";
import Dashboard from "./components/Dashboard";

import objecionPrecio from "./data/conversations/objecion-precio.json";
import objecionTiempo from "./data/conversations/objecion-tiempo.json";
import objecionCompetencia from "./data/conversations/objecion-competencia.json";

const conversationsMap = {
  "objecion-precio": objecionPrecio,
  "objecion-tiempo": objecionTiempo,
  "objecion-competencia": objecionCompetencia,
};

function App() {
  const [currentScreen, setCurrentScreen] = useState("loading");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [totalXP, setTotalXP] = useState(0);
  const [badges, setBadges] = useState([]);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("salesduo-progress");
    if (saved) {
      const data = JSON.parse(saved);
      setCompletedLessons(data.completedLessons || []);
      setTotalXP(data.totalXP || 0);
      setBadges(data.badges || []);
      setCurrentScreen("menu");
    } else {
      setCurrentScreen("onboarding");
    }
  }, []);

  const saveProgress = (newCompleted, newXP, newBadges) => {
    const data = {
      completedLessons: newCompleted,
      totalXP: newXP,
      badges: newBadges,
    };
    localStorage.setItem("salesduo-progress", JSON.stringify(data));
  };

  const handleOnboardingComplete = () => {
    setCurrentScreen("menu");
  };

  const handleSelectLesson = (lesson) => {
    const conversation = conversationsMap[lesson.conversationId];
    if (conversation) {
      setSelectedConversation(conversation);
      setCurrentScreen("chat");
    }
  };

  const handleFinishLesson = (results) => {
    const newXP = totalXP + results.xpEarned;
    const newCompleted = [
      ...new Set([...completedLessons, selectedConversation.id]),
    ];
    let newBadges = [...badges];

    // Badge de la lección
    if (results.badgeUnlocked) {
      newBadges = [...new Set([...newBadges, results.badgeUnlocked])];
    }

    // Badge "primera venta"
    if (results.endType === "success" && !badges.includes("first-win")) {
      newBadges = [...new Set([...newBadges, "first-win"])];
    }

    // Badge "puntuación perfecta"
    if (results.score >= 150 && !badges.includes("perfect-score")) {
      newBadges = [...new Set([...newBadges, "perfect-score"])];
    }

    setTotalXP(newXP);
    setCompletedLessons(newCompleted);
    setBadges(newBadges);
    saveProgress(newCompleted, newXP, newBadges);

    setCurrentScreen("menu");
    setSelectedConversation(null);
  };

  if (currentScreen === "loading") {
    return null;
  }

  if (currentScreen === "onboarding") {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div>
      <div className="topbar">
        <span className="topbar-logo">SalesDuo</span>
        <div className="topbar-stats">
          <span className="topbar-stat">
            ⭐ <strong>{totalXP}</strong> XP
          </span>
          <span className="topbar-stat">
            🏅 <strong>{badges.length}</strong> badges
          </span>
          <span className="topbar-stat">
            ✅ <strong>{completedLessons.length}</strong>
          </span>
          <button
            className="btn-dashboard"
            onClick={() => setShowDashboard(true)}
          >
            📊 Mi Progreso
          </button>
        </div>
      </div>

      {showDashboard && (
        <Dashboard
          totalXP={totalXP}
          completedLessons={completedLessons}
          badges={badges}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {currentScreen === "chat" && selectedConversation ? (
        <ChatSimulator
          key={selectedConversation.id + Date.now()}
          conversationData={selectedConversation}
          onFinish={handleFinishLesson}
        />
      ) : (
        <LessonSelector
          onSelectLesson={handleSelectLesson}
          completedLessons={completedLessons}
        />
      )}
    </div>
  );
}

export default App;