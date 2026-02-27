import { useState, useEffect } from "react";
import "./App.css";
import Onboarding from "./components/Onboarding";
import LessonMap from "./components/LessonMap";
import TheoryScreen from "./components/TheoryScreen";
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

const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "true";

function App() {
  const [currentScreen, setCurrentScreen] = useState("loading");
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [theoriesRead, setTheoriesRead] = useState([]);
  const [totalXP, setTotalXP] = useState(0);
  const [badges, setBadges] = useState([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("duosales-progress");
    if (saved) {
      const data = JSON.parse(saved);
      setCompletedLessons(data.completedLessons || []);
      setTheoriesRead(data.theoriesRead || []);
      setTotalXP(data.totalXP || 0);
      setBadges(data.badges || []);
      setUserProfile(data.profile || null);
      setCurrentScreen("menu");
    } else {
      setCurrentScreen("onboarding");
    }
  }, []);

  const saveProgress = (newCompleted, newTheories, newXP, newBadges, profile) => {
    localStorage.setItem("duosales-progress", JSON.stringify({
      completedLessons: newCompleted,
      theoriesRead: newTheories,
      totalXP: newXP,
      badges: newBadges,
      profile: profile !== undefined ? profile : userProfile,
    }));
  };

  const handleOnboardingComplete = (profile) => {
    setUserProfile(profile);
    saveProgress([], [], 0, [], profile);
    setCurrentScreen("menu");
  };

  const handleSelectLesson = (lesson, mode) => {
    setSelectedLesson(lesson);
    if (mode === "theory") {
      setCurrentScreen("theory");
    } else {
      const conversation = conversationsMap[lesson.conversationId];
      if (conversation) {
        setSelectedConversation(conversation);
        setCurrentScreen("chat");
      }
    }
  };

  const handleTheoryComplete = () => {
    const newTheories = [...new Set([...theoriesRead, selectedLesson.id])];
    setTheoriesRead(newTheories);
    saveProgress(completedLessons, newTheories, totalXP, badges);
    const conversation = conversationsMap[selectedLesson.conversationId];
    if (conversation) {
      setSelectedConversation(conversation);
      setCurrentScreen("chat");
    }
  };

  const handleFinishLesson = (results) => {
    const newXP = totalXP + results.xpEarned;
    const newCompleted = [...new Set([...completedLessons, selectedConversation.id])];
    let newBadges = [...badges];
    if (results.badgeUnlocked) newBadges = [...new Set([...newBadges, results.badgeUnlocked])];
    if (results.endType === "success" && !badges.includes("first-win")) newBadges = [...new Set([...newBadges, "first-win"])];
    if (results.score >= 150 && !badges.includes("perfect-score")) newBadges = [...new Set([...newBadges, "perfect-score"])];
    setTotalXP(newXP);
    setCompletedLessons(newCompleted);
    setBadges(newBadges);
    saveProgress(newCompleted, theoriesRead, newXP, newBadges);
    setCurrentScreen("menu");
    setSelectedConversation(null);
    setSelectedLesson(null);
  };

  if (currentScreen === "loading") return null;

  if (currentScreen === "onboarding") {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (currentScreen === "theory" && selectedLesson) {
    return (
      <TheoryScreen
        lesson={selectedLesson}
        onComplete={handleTheoryComplete}
        onBack={() => setCurrentScreen("menu")}
      />
    );
  }

  return (
    <div>
      {isDemoMode && (
        <div className="demo-banner">
          🎬 Modo demo — todas las lecciones desbloqueadas
        </div>
      )}
      <div className="topbar">
        <span className="topbar-logo">Duosales</span>
        <div className="topbar-stats">
          <span className="topbar-stat">⭐ <strong>{totalXP}</strong> XP</span>
          <span className="topbar-stat">🏅 <strong>{badges.length}</strong></span>
          <span className="topbar-stat">✅ <strong>{completedLessons.length}</strong></span>
          <button className="btn-dashboard" onClick={() => setShowDashboard(true)}>
            📊 Progreso
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
        <LessonMap
          onSelectLesson={handleSelectLesson}
          completedLessons={completedLessons}
          theoriesRead={theoriesRead}
          userProfile={userProfile}
          demoMode={isDemoMode}
        />
      )}
    </div>
  );
}

export default App;
