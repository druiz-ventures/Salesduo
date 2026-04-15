import { useState } from "react";
import { supabase } from "../supabaseClient";

const getOAuthRedirectTo = () => {
  const configuredUrl = (import.meta.env.VITE_PUBLIC_SITE_URL || "").trim();
  if (configuredUrl) {
    return configuredUrl;
  }
  return window.location.origin;
};

export default function AuthScreen() {
  const [mode, setMode] = useState("login");        // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleGoogleLogin = async () => {
    setError(""); setSuccess("");
    setLoading(true);
    const redirectTo = getOAuthRedirectTo();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (err) {
      setError("No se pudo conectar con Google. Inténtalo de nuevo.");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email.trim() || !password.trim()) {
      setError("Rellena el email y la contraseña.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    if (mode === "register") {
      const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
      if (err) {
        setError(err.message === "User already registered"
          ? "Este email ya está registrado. Inicia sesión."
          : "Error al crear la cuenta. Inténtalo de nuevo.");
      } else {
        setSuccess("✅ Cuenta creada. Revisa tu email para confirmar el registro.");
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) {
        setError("Email o contraseña incorrectos.");
      }
    }
    setLoading(false);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.logo}>🎯</div>
        <h1 style={styles.title}>SalesDuo</h1>
        <p style={styles.subtitle}>Entrena tus habilidades de venta con IA</p>

        {/* Tab toggle */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === "login" ? styles.tabActive : {}) }}
            onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
          >Iniciar sesión</button>
          <button
            style={{ ...styles.tab, ...(mode === "register" ? styles.tabActive : {}) }}
            onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
          >Crear cuenta</button>
        </div>

        {/* Google */}
        <button
          style={{ ...styles.googleBtn, opacity: loading ? 0.7 : 1 }}
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          {loading ? "Redirigiendo..." : "Continuar con Google"}
        </button>

        {/* Divider */}
        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>o con email</span>
          <div style={styles.dividerLine} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} style={styles.form}>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
            disabled={loading}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Contraseña (mín. 6 caracteres)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            disabled={loading}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
          />
          <button
            type="submit"
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? "Cargando..." : mode === "register" ? "Crear cuenta" : "Entrar"}
          </button>
        </form>

        {error   && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.successMsg}>{success}</p>}

        <p style={styles.legal}>
          Al entrar aceptas los términos de uso y la política de privacidad.
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, rgba(0, 145, 255, 0.08), transparent 30%), radial-gradient(circle at bottom right, rgba(0, 212, 255, 0.08), transparent 28%), var(--bg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  card: {
    background: "rgba(12, 16, 24, 0.92)",
    border: "1px solid var(--border)",
    borderRadius: "24px",
    padding: "40px 34px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 30px 90px rgba(0,0,0,0.45)",
    textAlign: "center",
    backdropFilter: "blur(24px)",
  },
  logo: { fontSize: "48px", marginBottom: "10px" },
  title: { color: "var(--white)", fontSize: "34px", fontWeight: "800", margin: "0 0 4px", fontFamily: "var(--font-display)", letterSpacing: "-0.03em" },
  subtitle: { color: "var(--gray)", fontSize: "14px", margin: "0 0 24px" },
  tabs: {
    display: "flex",
    background: "var(--surface2)",
    borderRadius: "14px",
    padding: "4px",
    marginBottom: "20px",
    gap: "4px",
  },
  tab: {
    flex: 1,
    padding: "9px",
    borderRadius: "7px",
    border: "none",
    background: "transparent",
    color: "var(--gray2)",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.15s ease-in-out",
  },
  tabActive: {
    background: "linear-gradient(135deg, var(--brand), var(--brand2))",
    color: "var(--white)",
    boxShadow: "0 8px 24px rgba(0, 212, 255, 0.24)",
  },
  googleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "12px 20px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--white)",
    color: "var(--bg)",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
    marginBottom: "16px",
    boxSizing: "border-box",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  dividerLine: { flex: 1, height: "1px", background: "var(--border)" },
  dividerText: { color: "var(--gray2)", fontSize: "12px", whiteSpace: "nowrap" },
  form: { display: "flex", flexDirection: "column", gap: "10px" },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    color: "var(--white)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  submitBtn: {
    width: "100%",
    padding: "13px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, var(--brand), var(--brand2))",
    color: "var(--white)",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
    marginTop: "2px",
    boxShadow: "0 0 20px var(--glow)",
  },
  error: { color: "var(--red)", fontSize: "13px", margin: "12px 0 0" },
  successMsg: { color: "var(--green)", fontSize: "13px", margin: "12px 0 0" },
  legal: { color: "var(--gray2)", fontSize: "11px", marginTop: "20px" },
};
