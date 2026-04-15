import { useState, useEffect } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import AuthScreen from "./components/AuthScreen";
import Onboarding from "./components/Onboarding";
import LessonMap from "./components/LessonMap";
import TheoryScreen from "./components/TheoryScreen";
import ChatSimulator from "./components/ChatSimulator";
import ChatSimulatorMVP from "./components/ChatSimulatorMVP";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";
import ValidationFeedback from "./components/ValidationFeedback";

const conversationModules = import.meta.glob("./data/conversations/*.json", { eager: true });
const conversationsMap = Object.values(conversationModules).reduce((acc, mod) => {
  const conversation = mod.default || mod;
  if (conversation?.id) acc[conversation.id] = conversation;
  return acc;
}, {});

const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "true";

// ─── Guardar progreso en Supabase ─────────────────────────────────────────────
async function saveProgressToCloud(userId, data) {
  await supabase
    .from("user_progress")
    .upsert({ user_id: userId, ...data, updated_at: new Date().toISOString() });
}

// ─── Guardar perfil de usuario (solo si no existe) ──────────────────────────
async function upsertProfile(user) {
  const { id, email, user_metadata } = user;
  await supabase.from("profiles").upsert(
    {
      id,
      email,
      full_name: user_metadata?.full_name || user_metadata?.name || "",
      avatar_url: user_metadata?.avatar_url || user_metadata?.picture || "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id", ignoreDuplicates: false }
  );
}

// ─── Guardar sesión completada ─────────────────────────────────────────────────
async function saveSession(userId, { sector, conversationId, objecionesSuperadas, endType, score }) {
  await supabase.from("sessions").insert({
    user_id: userId,
    sector: sector || "general",
    conversation_id: conversationId,
    objeciones_superadas: objecionesSuperadas,
    end_type: endType,
    score,
    fecha: new Date().toISOString(),
  });
}

// ─── Cargar stats de sesiones ───────────────────────────────────────────────
async function loadSessionStats(userId) {
  const { data } = await supabase
    .from("sessions")
    .select("fecha")
    .eq("user_id", userId)
    .order("fecha", { ascending: false });
  if (!data || data.length === 0) return { total: 0, racha: 0, weekly: 0 };

  const total = data.length;

  // Sesiones de la semana actual (lunes-domingo)
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0=lunes ... 6=domingo
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - day);
  const weekly = data.filter((s) => new Date(s.fecha) >= monday).length;

  // Calcular racha de días consecutivos
  const dias = [...new Set(data.map(s => s.fecha.slice(0, 10)))].sort().reverse();
  const hoy = new Date().toISOString().slice(0, 10);
  let racha = 0;
  let cursor = new Date(hoy);
  for (const dia of dias) {
    const diaDate = new Date(dia);
    const diff = Math.round((cursor - diaDate) / 86400000);
    if (diff > 1) break;
    racha++;
    cursor = diaDate;
  }
  return { total, racha, weekly };
}

// ─── Cargar progreso desde Supabase ─────────────────────────────────────────
async function loadProgressFromCloud(userId) {
  const { data } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

function App() {
  const resolvedTheme = "dark";
  const [salesRole, setSalesRole] = useState(() => localStorage.getItem("sales-role") || "setter");
  const [authUser, setAuthUser] = useState(null);           // usuario Supabase
  const [authLoading, setAuthLoading] = useState(true);     // cargando sesión
  const [currentScreen, setCurrentScreen] = useState("loading");
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [theoriesRead, setTheoriesRead] = useState([]);
  const [totalXP, setTotalXP] = useState(0);
  const [badges, setBadges] = useState([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileTipo, setProfileTipo] = useState(null);
  const [profileSector, setProfileSector] = useState(null);
  const [sessionStats, setSessionStats] = useState({ total: 0, racha: 0 });
  const [showAdmin, setShowAdmin] = useState(false);
  const [showQuickValidation, setShowQuickValidation] = useState(false);

  useEffect(() => {
    // MVP: tema fijo oscuro para mantener consistencia visual.
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme-mode", "dark");
  }, []);

  const handleSalesRoleChange = (nextRole) => {
    setSalesRole(nextRole);
    localStorage.setItem("sales-role", nextRole);
  };

  // ── Detectar sesión activa al cargar ───────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    let authTimeoutId;

    // Fallback para evitar spinner infinito si Auth no responde
    authTimeoutId = window.setTimeout(() => {
      if (!isMounted) return;
      setAuthLoading(false);
      setCurrentScreen("auth");
    }, 8000);

    const bootstrapAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          console.error("Error cargando sesión:", error);
          setAuthLoading(false);
          setCurrentScreen("auth");
          return;
        }

        if (session?.user) {
          setAuthUser(session.user);
          await loadUserProgress(session.user.id);
        } else {
          setAuthLoading(false);
          setCurrentScreen("auth");
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Fallo inesperado en bootstrap de auth:", error);
        setAuthLoading(false);
        setCurrentScreen("auth");
      } finally {
        if (authTimeoutId) {
          window.clearTimeout(authTimeoutId);
        }
      }
    };

    bootstrapAuth();

    // Escuchar cambios de sesión (login/logout + redirect OAuth)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setAuthUser(session.user);
        // SIGNED_IN cubre el retorno del redirect de Google OAuth
        if (event === "SIGNED_IN") {
          upsertProfile(session.user);
          loadUserProgress(session.user.id);
        }
      } else {
        setAuthUser(null);
        setCurrentScreen("auth");
      }
    });

    return () => {
      isMounted = false;
      if (authTimeoutId) {
        window.clearTimeout(authTimeoutId);
      }
      listener.subscription.unsubscribe();
    };
  }, []);

  // ── Cargar progreso del usuario ────────────────────────────────────────────
  const loadUserProgress = async (userId) => {
    // Cargar tipo/sector desde profiles
    const { data: profileData } = await supabase
      .from("profiles")
      .select("tipo, sector")
      .eq("id", userId)
      .single();
    const tipo = profileData?.tipo || null;
    const sector = profileData?.sector || null;
    setProfileTipo(tipo);
    setProfileSector(sector);

    const data = await loadProgressFromCloud(userId);
    const stats = await loadSessionStats(userId);
    setSessionStats(stats);
    if (data) {
      setCompletedLessons(data.completed_lessons || []);
      setTheoriesRead(data.theories_read || []);
      setTotalXP(data.total_xp || 0);
      setBadges(data.badges || []);
      setUserProfile(data.profile || null);
      // Si tiene perfil pero falta tipo → solo preguntar tipo
      setCurrentScreen(data.profile && !tipo ? "onboarding" : data.profile ? "menu" : "onboarding");
    } else {
      setCurrentScreen("onboarding");
    }
    setAuthLoading(false);
  };

  // ── Guardar progreso ───────────────────────────────────────────────────────
  const saveProgress = async (newCompleted, newTheories, newXP, newBadges, profile) => {
    if (!authUser) return;
    const resolvedProfile = profile !== undefined ? profile : userProfile;
    await saveProgressToCloud(authUser.id, {
      completed_lessons: newCompleted,
      theories_read: newTheories,
      total_xp: newXP,
      badges: newBadges,
      profile: resolvedProfile,
    });
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAuth = (user) => {
    setAuthUser(user);
    loadUserProgress(user.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCompletedLessons([]);
    setTheoriesRead([]);
    setTotalXP(0);
    setBadges([]);
    setUserProfile(null);
    setProfileSector(null);
    setCurrentScreen("auth");
  };

  const handleOnboardingComplete = async (profile) => {
    const { tipo, sector, empresa, ...restProfile } = profile;
    // Guardar tipo, sector y empresa en profiles
    if (authUser) {
      const updates = {};
      if (tipo)    updates.tipo    = tipo;
      if (sector)  updates.sector  = sector;
      if (empresa) updates.empresa = empresa;
      if (Object.keys(updates).length > 0) {
        await supabase.from("profiles").update(updates).eq("id", authUser.id);
      }
      if (tipo)    setProfileTipo(tipo);
      if (sector)  setProfileSector(sector);
    }
    // Si ya tenía perfil (solo faltaba tipo/sector), conservarlo
    const finalProfile = Object.keys(restProfile).length > 0 ? restProfile : userProfile;
    setUserProfile(finalProfile);
    if (Object.keys(restProfile).length > 0) {
      await saveProgress([], [], 0, [], finalProfile);
    }
    setCurrentScreen("menu");
  };

  const handleGoHome = () => {
    if (!authUser) {
      setCurrentScreen("auth");
      return;
    }
    setShowDashboard(false);
    setShowAdmin(false);
    setShowQuickValidation(false);
    setSelectedConversation(null);
    setSelectedLesson(null);
    setCurrentScreen("menu");
  };

  const handleAbortTraining = () => {
    setSelectedConversation(null);
    setSelectedLesson(null);
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

  const handleTheoryComplete = async () => {
    const newTheories = [...new Set([...theoriesRead, selectedLesson.id])];
    setTheoriesRead(newTheories);
    await saveProgress(completedLessons, newTheories, totalXP, badges);
    const conversation = conversationsMap[selectedLesson.conversationId];
    if (conversation) {
      setSelectedConversation(conversation);
      setCurrentScreen("chat");
    }
  };

  const handleFinishLesson = async (results) => {
    const newXP = totalXP + results.xpEarned;
    const newCompleted = [...new Set([...completedLessons, selectedConversation.id])];
    let newBadges = [...badges];
    if (results.badgeUnlocked) newBadges = [...new Set([...newBadges, results.badgeUnlocked])];
    if (results.endType === "success" && !badges.includes("first-win"))
      newBadges = [...new Set([...newBadges, "first-win"])];
    if (results.score >= 150 && !badges.includes("perfect-score"))
      newBadges = [...new Set([...newBadges, "perfect-score"])];

    setTotalXP(newXP);
    setCompletedLessons(newCompleted);
    setBadges(newBadges);
    await saveProgress(newCompleted, theoriesRead, newXP, newBadges);
    // Guardar sesión en tabla sessions
    if (authUser) {
      await saveSession(authUser.id, {
        sector: userProfile?.sells?.[0] || "general",
        conversationId: selectedConversation?.id,
        objecionesSuperadas: results.endType === "success" ? 1 : 0,
        endType: results.endType,
        score: results.score,
      });
      const stats = await loadSessionStats(authUser.id);
      setSessionStats(stats);
    }
    setCurrentScreen("menu");
    setSelectedConversation(null);
    setSelectedLesson(null);
  };

  // ── Renders ────────────────────────────────────────────────────────────────
  if (authLoading || currentScreen === "loading") {
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex",
        alignItems:"center", justifyContent:"center" }}>
        <p style={{ color:"var(--brand)", fontSize:"20px" }}>🎯 Cargando SalesDuo...</p>
      </div>
    );
  }

  if (currentScreen === "auth") {
    return <AuthScreen />;
  }

  if (currentScreen === "onboarding") {
    return <Onboarding onComplete={handleOnboardingComplete} hasTipo={!!profileTipo} onlyTipo={!!userProfile && !profileTipo} />;
  }

  if (currentScreen === "theory" && selectedLesson) {
    return (
      <TheoryScreen
        lesson={selectedLesson}
        salesRole={salesRole}
        onComplete={handleTheoryComplete}
        onBack={() => setCurrentScreen("menu")}
      />
    );
  }

  return (
    <div>
      {isDemoMode && (
        <div className="demo-banner">🎬 Modo demo — todas las lecciones desbloqueadas</div>
      )}

      <div className="topbar">
        <span className="topbar-logo" onClick={handleGoHome} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleGoHome()}>
          salesDuo
        </span>
        <div className="topbar-stats">
          <span className="topbar-stat">⭐ <strong>{totalXP}</strong> XP</span>
          <span className="topbar-stat">🏅 <strong>{badges.length}</strong></span>
          <span className="topbar-stat">✅ <strong>{completedLessons.length}</strong></span>
          <button className="btn-dashboard" onClick={() => setShowDashboard(true)}>
            📊 Progreso
          </button>
          <button className="btn-dashboard" onClick={() => setShowQuickValidation(true)}>
            ✅ Validar
          </button>
          {authUser?.email === "crd713ncb@gmail.com" && (
            <button
              onClick={() => setShowAdmin(true)}
              style={{ background:"var(--surface2)", border:"1px solid var(--brand)",
                color:"var(--brand)", borderRadius:"8px", padding:"6px 12px",
                cursor:"pointer", fontSize:"12px" }}
            >
              🛡️ Admin
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{ background:"transparent", border:"1px solid var(--border)",
              color:"var(--gray)", borderRadius:"8px", padding:"6px 12px",
              cursor:"pointer", fontSize:"12px" }}
          >
            Salir
          </button>
        </div>
      </div>

      {showAdmin && (
        <AdminPanel userEmail={authUser?.email} theme={resolvedTheme} onClose={() => setShowAdmin(false)} />
      )}

      {showDashboard && (
        <Dashboard
          totalXP={totalXP}
          completedLessons={completedLessons}
          badges={badges}
          sessionStats={sessionStats}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {showQuickValidation && (
        <ValidationFeedback
          userId={authUser?.id}
          conversationId={selectedConversation?.id || "manual-validation"}
          scoreFinal={0}
          endType="manual"
          onComplete={() => setShowQuickValidation(false)}
        />
      )}

      {currentScreen === "chat" && selectedConversation ? (
        selectedConversation.nodes && Object.values(selectedConversation.nodes).some(node => node.options) ? (
          <ChatSimulatorMVP
            key={selectedConversation.id + Date.now()}
            conversationData={selectedConversation}
            onFinish={handleFinishLesson}
            onAbort={handleAbortTraining}
            userId={authUser?.id}
          />
        ) : (
          <ChatSimulator
            key={selectedConversation.id + Date.now()}
            conversationData={selectedConversation}
            salesRole={salesRole}
            onFinish={handleFinishLesson}
            onAbort={handleAbortTraining}
            userId={authUser?.id}
          />
        )
      ) : (
        <LessonMap
          onSelectLesson={handleSelectLesson}
          completedLessons={completedLessons}
          theoriesRead={theoriesRead}
          userProfile={userProfile}
          profileSector={profileSector}
          demoMode={isDemoMode}
        />
      )}

    </div>
  );
}

export default App;
