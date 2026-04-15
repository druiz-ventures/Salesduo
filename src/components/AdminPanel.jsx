import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const ADMIN_EMAIL = "crd713ncb@gmail.com";

const TRACK_LABELS = {
  core: "Core",
  seguros: "Seguros",
  infoproductos: "InfoProductos",
  software: "Software",
  entrevistas: "Entrevistas",
};

const TRACK_COLORS = {
  core: "var(--brand)",
  seguros: "var(--green)",
  infoproductos: "var(--brand)",
  software: "var(--brand2)",
  entrevistas: "var(--brand2)",
};

const EMPTY_SCENARIO_FORM = {
  company_name: "",
  scenario_name: "",
  track: "software",
  difficulty: "beginner",
  buyer_persona: "",
  context: "",
  objection: "",
  deal_value: "",
  commission_rate: "",
};

function statusFromThreshold(value, good, warn) {
  if (value >= good) return { label: "Verde", color: "var(--green)" };
  if (value >= warn) return { label: "Ambar", color: "var(--brand)" };
  return { label: "Rojo", color: "var(--red)" };
}

function trackFromConversationId(conversationId = "") {
  if (conversationId.startsWith("seguros")) return "seguros";
  if (conversationId.startsWith("infoproductos")) return "infoproductos";
  if (conversationId.startsWith("kit-digital") || conversationId.startsWith("telecomunicaciones") || conversationId.startsWith("b2b")) return "software";
  if (conversationId.startsWith("entrevista")) return "entrevistas";
  return "core";
}

export default function AdminPanel({ userEmail, onClose, theme = "dark" }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const [scenarioForm, setScenarioForm] = useState(EMPTY_SCENARIO_FORM);
  const [scenarioSaving, setScenarioSaving] = useState(false);
  const [scenarioMsg, setScenarioMsg] = useState("");
  const [scenarioErr, setScenarioErr] = useState("");

  useEffect(() => {
    if (userEmail !== ADMIN_EMAIL) return;
    loadMetrics();
  }, [userEmail]);

  const loadMetrics = async () => {
    setLoading(true);

    const [
      profilesRes,
      sessionsRes,
      feedbackRes,
      customScenariosRes,
    ] = await Promise.all([
      supabase.from("profiles").select("tipo, sector, id, email"),
      supabase.from("sessions").select("end_type, conversation_id, score"),
      supabase.from("validation_feedback").select("repetirias, pagarias, precio_ideal_rango, nps, uso_equipo, mejoria, created_at, user_id"),
      supabase
        .from("company_scenarios")
        .select("id, company_name, scenario_name, track, difficulty, deal_value, commission_rate, created_at")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const profiles = profilesRes.data ?? [];
    const sessions = sessionsRes.data ?? [];
    const feedback = feedbackRes.data ?? [];
    const customScenarios = customScenariosRes.data ?? [];

    const emailByUserId = profiles.reduce((acc, p) => {
      if (p.id) acc[p.id] = p.email || "sin email";
      return acc;
    }, {});

    const totalUsuarios = profiles.length;
    const porTipo = profiles.reduce((acc, p) => {
      const t = p.tipo || "sin definir";
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    const porSector = profiles.reduce((acc, p) => {
      const s = p.sector || "sin definir";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const totalSesiones = sessions.length;
    const success = sessions.filter((s) => s.end_type === "success").length;
    const failure = sessions.filter((s) => s.end_type === "failure").length;
    const pctSuccess = totalSesiones > 0 ? Math.round((success / totalSesiones) * 100) : 0;
    const pctFailure = totalSesiones > 0 ? Math.round((failure / totalSesiones) * 100) : 0;

    const trackAccumulator = sessions.reduce((acc, s) => {
      const track = trackFromConversationId(s.conversation_id);
      if (!acc[track]) acc[track] = { total: 0, success: 0, failure: 0, scoreSum: 0 };
      acc[track].total += 1;
      if (s.end_type === "success") acc[track].success += 1;
      if (s.end_type === "failure") acc[track].failure += 1;
      acc[track].scoreSum += s.score || 0;
      return acc;
    }, {});

    const rankingTracks = Object.entries(trackAccumulator)
      .map(([track, stats]) => {
        const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
        const avgScore = stats.total > 0 ? Math.round(stats.scoreSum / stats.total) : 0;
        return {
          track,
          label: TRACK_LABELS[track] || track,
          color: TRACK_COLORS[track] || "var(--gray)",
          ...stats,
          successRate,
          avgScore,
        };
      })
      .sort((a, b) => b.successRate - a.successRate || b.total - a.total);

    const totalFeedback = feedback.length;
    const repetirian = feedback.filter((f) => f.repetirias === true).length;
    const pagarian = feedback.reduce((acc, f) => {
      const v = f.pagarias || "sin respuesta";
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {});
    const precioIdeal = feedback.reduce((acc, f) => {
      const v = f.precio_ideal_rango || "sin respuesta";
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {});
    const usoProducto = feedback.reduce((acc, f) => {
      const v = f.uso_equipo || "sin respuesta";
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {});
    const npsValues = feedback.filter((f) => Number.isInteger(f.nps)).map((f) => f.nps);
    const npsPromoters = npsValues.filter((v) => v >= 9).length;
    const npsDetractors = npsValues.filter((v) => v <= 6).length;
    const npsScore = npsValues.length > 0
      ? Math.round(((npsPromoters / npsValues.length) - (npsDetractors / npsValues.length)) * 100)
      : 0;

    const comentarios = feedback
      .filter((f) => f.mejoria && f.mejoria.trim() !== "")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((f) => ({ ...f, email: emailByUserId[f.user_id] || "desconocido" }));

    setMetrics({
      totalUsuarios,
      porTipo,
      porSector,
      totalSesiones,
      success,
      failure,
      pctSuccess,
      pctFailure,
      rankingTracks,
      totalFeedback,
      repetirian,
      pagarian,
      precioIdeal,
      usoProducto,
      npsScore,
      npsTotal: npsValues.length,
      comentarios,
      customScenarios,
      customScenariosError: customScenariosRes.error?.message || "",
    });

    setLoading(false);
  };

  const handleScenarioChange = (key, value) => {
    setScenarioForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateScenario = async (e) => {
    e.preventDefault();
    setScenarioMsg("");
    setScenarioErr("");

    if (!scenarioForm.company_name.trim() || !scenarioForm.scenario_name.trim() || !scenarioForm.buyer_persona.trim() || !scenarioForm.context.trim() || !scenarioForm.objection.trim()) {
      setScenarioErr("Completa empresa, nombre del escenario, buyer persona, contexto y objeción.");
      return;
    }

    setScenarioSaving(true);

    const payload = {
      company_name: scenarioForm.company_name.trim(),
      scenario_name: scenarioForm.scenario_name.trim(),
      track: scenarioForm.track,
      difficulty: scenarioForm.difficulty,
      buyer_persona: scenarioForm.buyer_persona.trim(),
      context: scenarioForm.context.trim(),
      objection: scenarioForm.objection.trim(),
      deal_value: scenarioForm.deal_value ? Number(scenarioForm.deal_value) : null,
      commission_rate: scenarioForm.commission_rate ? Number(scenarioForm.commission_rate) : null,
      created_by_email: userEmail,
    };

    const { error } = await supabase.from("company_scenarios").insert(payload);

    if (error) {
      const tableHint = error.message?.includes("relation")
        ? "Crea la tabla company_scenarios en Supabase para activar este módulo."
        : "";
      setScenarioErr(`No se pudo guardar el escenario. ${error.message} ${tableHint}`.trim());
      setScenarioSaving(false);
      return;
    }

    setScenarioMsg("✅ Escenario guardado. Ya puedes usarlo para personalizar pilotos por empresa.");
    setScenarioForm((prev) => ({
      ...EMPTY_SCENARIO_FORM,
      company_name: prev.company_name,
      track: prev.track,
      difficulty: prev.difficulty,
    }));
    setScenarioSaving(false);
    loadMetrics();
  };

  if (userEmail !== ADMIN_EMAIL) return null;

  const C = {
    panelBg: "rgba(6, 8, 16, 0.96)",
    cardBg: "var(--surface2)",
    border: "var(--border)",
    text: "var(--white)",
    textMuted: "var(--gray)",
    textSoft: "var(--gray2)",
  };

  const card = (label, value, sub, color = "var(--brand)") => (
    <div style={{
      background: C.cardBg,
      borderRadius: "12px",
      padding: "20px 24px",
      border: `1px solid ${color}33`,
      minWidth: "160px",
      flex: "1 1 160px",
    }}>
      <div style={{ color: C.textSoft, fontSize: "12px", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ color, fontSize: "40px", fontWeight: "800", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: C.textSoft, fontSize: "12px", marginTop: "6px" }}>{sub}</div>}
    </div>
  );

  const distCard = (title, data, color = "var(--brand)") => {
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    return (
      <div style={{
        background: C.cardBg,
        borderRadius: "12px",
        padding: "20px 24px",
        border: `1px solid ${color}33`,
        flex: "1 1 220px",
      }}>
        <div style={{ color: C.textSoft, fontSize: "12px", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
        {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
          const widthPct = total > 0 ? Math.round((v / total) * 100) : 0;
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ flex: 1, color: C.textMuted, fontSize: "13px", textTransform: "capitalize" }}>{k}</div>
              <div style={{
                width: `${Math.max(widthPct, v > 0 ? 4 : 0)}%`,
                minWidth: v > 0 ? "4px" : "0px",
                maxWidth: "120px",
                height: "6px",
                background: color,
                borderRadius: "3px",
                opacity: 0.8,
              }} />
              <div style={{ color: C.text, fontSize: "14px", fontWeight: "700", width: "28px", textAlign: "right" }}>{v}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{
        background: C.panelBg,
        borderRadius: "16px",
        border: `1px solid ${C.border}`,
        width: "100%",
        maxWidth: "980px",
        maxHeight: "92vh",
        overflowY: "auto",
        padding: "32px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
          <div>
            <h2 style={{ color: C.text, margin: 0, fontSize: "22px", fontWeight: "800" }}>🛡️ Admin Panel</h2>
            <p style={{ color: C.textSoft, margin: "4px 0 0", fontSize: "13px" }}>Métricas en tiempo real · SalesDuo</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button onClick={loadMetrics} style={{
              background: C.cardBg, border: `1px solid ${C.border}`, color: C.textMuted,
              borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "13px",
            }}>↻ Actualizar</button>
            <button onClick={onClose} style={{
              background: "transparent", border: `1px solid ${C.border}`, color: C.textSoft,
              borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "13px",
            }}>✕ Cerrar</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--brand)", fontSize: "16px" }}>
            Cargando métricas...
          </div>
        ) : (
          <>
            {(() => {
              const repeatRate = metrics.totalFeedback > 0
                ? Math.round((metrics.repetirian / metrics.totalFeedback) * 100)
                : 0;
              const willingToPay = metrics.totalFeedback > 0
                ? Math.round(((metrics.pagarian.si || 0) / metrics.totalFeedback) * 100)
                : 0;
              const teamIntent = metrics.totalFeedback > 0
                ? Math.round((((metrics.usoProducto.equipo || 0) + (metrics.usoProducto.ambos || 0)) / metrics.totalFeedback) * 100)
                : 0;
              const retentionSignal = metrics.totalUsuarios > 0
                ? Math.round((metrics.totalSesiones / metrics.totalUsuarios) * 10) / 10
                : 0;
              const productSuccessRate = metrics.pctSuccess;

              const investorKpis = [
                {
                  title: "PMF inicial",
                  value: `${repeatRate}%`,
                  sub: "Repetirian manana",
                  status: statusFromThreshold(repeatRate, 55, 35),
                },
                {
                  title: "Intencion pago",
                  value: `${willingToPay}%`,
                  sub: "Responden Si a pagar",
                  status: statusFromThreshold(willingToPay, 35, 20),
                },
                {
                  title: "NPS",
                  value: metrics.npsScore,
                  sub: `${metrics.npsTotal} respuestas`,
                  status: statusFromThreshold(metrics.npsScore, 30, 0),
                },
                {
                  title: "Retencion uso",
                  value: `${retentionSignal}x`,
                  sub: "Sesiones por usuario",
                  status: statusFromThreshold(retentionSignal, 2, 1.2),
                },
                {
                  title: "SenaI B2B",
                  value: `${teamIntent}%`,
                  sub: "Equipo o ambos",
                  status: statusFromThreshold(teamIntent, 40, 25),
                },
                {
                  title: "Eficacia entreno",
                  value: `${productSuccessRate}%`,
                  sub: "Sesiones en success",
                  status: statusFromThreshold(productSuccessRate, 45, 30),
                },
              ];

              return (
                <>
                  <div style={{ color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
                    Investor KPI Board
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
                    {investorKpis.map((kpi) => (
                      <div key={kpi.title} style={{
                        background: "var(--surface2)",
                        borderRadius: "12px",
                        border: `1px solid ${kpi.status.color}55`,
                        padding: "14px 16px",
                        minWidth: "150px",
                        flex: "1 1 150px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ color: "var(--gray)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{kpi.title}</span>
                          <span style={{ color: kpi.status.color, fontSize: "11px", fontWeight: "700" }}>{kpi.status.label}</span>
                        </div>
                        <div style={{ color: "var(--white)", fontSize: "28px", fontWeight: "900", lineHeight: 1 }}>{kpi.value}</div>
                        <div style={{ color: "var(--gray2)", fontSize: "11px", marginTop: "6px" }}>{kpi.sub}</div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            <div style={{ color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              Usuarios
            </div>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "24px" }}>
              {card("Total usuarios", metrics.totalUsuarios, "Google + Email", "var(--brand)")}
              {distCard("Por tipo", metrics.porTipo, "var(--brand)")}
              {distCard("Por sector", metrics.porSector, "var(--brand2)")}
            </div>

            <div style={{ color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              Sesiones de entrenamiento
            </div>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "16px" }}>
              {card("Total sesiones", metrics.totalSesiones, "Entrenamientos completados", "var(--brand)")}
              {card("Éxitos", metrics.success, `${metrics.pctSuccess}% del total`, "var(--green)")}
              {card("Fracasos", metrics.failure, `${metrics.pctFailure}% del total`, "var(--red)")}
            </div>

            <div style={{
              background: "var(--surface2)", borderRadius: "12px", padding: "18px 20px",
              border: "1px solid var(--border)", marginBottom: "24px",
            }}>
              <div style={{ color: "var(--gray2)", fontSize: "12px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Ranking por track (tasa de éxito)
              </div>
              {metrics.rankingTracks.length === 0 ? (
                <div style={{ color: "var(--gray)", fontSize: "13px" }}>Aún no hay sesiones para calcular ranking.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {metrics.rankingTracks.map((r, idx) => (
                    <div key={r.track} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "20px", color: "var(--gray)", fontSize: "12px" }}>#{idx + 1}</div>
                      <div style={{ width: "120px", color: "var(--white)", fontSize: "13px", fontWeight: "700" }}>{r.label}</div>
                      <div style={{
                        flex: 1, height: "8px", borderRadius: "999px", overflow: "hidden", background: "var(--bg)",
                      }}>
                        <div style={{ width: `${r.successRate}%`, height: "100%", background: r.color }} />
                      </div>
                      <div style={{ width: "70px", color: r.color, fontSize: "13px", fontWeight: "800", textAlign: "right" }}>{r.successRate}%</div>
                      <div style={{ width: "90px", color: "var(--gray)", fontSize: "12px", textAlign: "right" }}>{r.total} sesiones</div>
                      <div style={{ width: "80px", color: "var(--gray2)", fontSize: "12px", textAlign: "right" }}>avg {r.avgScore}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ color: "var(--gray2)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              Validación de producto
            </div>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginBottom: "24px" }}>
              {card("Respuestas feedback", metrics.totalFeedback, "Formularios enviados", "var(--brand)")}
              {card("Repetirían", metrics.repetirian, `de ${metrics.totalFeedback} encuestados`, "var(--green)")}
              {card("NPS", metrics.npsScore, `${metrics.npsTotal} respuestas`, metrics.npsScore >= 30 ? "var(--green)" : metrics.npsScore >= 0 ? "var(--brand)" : "var(--red)")}
              {distCard("¿Pagarían?", {
                "Sí": metrics.pagarian.si || 0,
                "Quizás": metrics.pagarian.quizas || 0,
                "No": metrics.pagarian.no || 0,
              }, "var(--brand)")}
              {distCard("Precio ideal mensual", {
                "0€": metrics.precioIdeal["0"] || 0,
                "10-29€": metrics.precioIdeal["10-29"] || 0,
                "30-59€": metrics.precioIdeal["30-59"] || 0,
                "60-99€": metrics.precioIdeal["60-99"] || 0,
                "100€+": metrics.precioIdeal["100+"] || 0,
              }, "var(--brand2)")}
              {distCard("Uso del producto", {
                "Individual": metrics.usoProducto.individual || 0,
                "Equipo": metrics.usoProducto.equipo || 0,
                "Ambos": metrics.usoProducto.ambos || 0,
              }, "var(--brand)")}
            </div>

              <div style={{ color: "var(--gray2)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              Comentarios de mejora ({metrics.comentarios.length})
            </div>
            {metrics.comentarios.length === 0 ? (
              <div style={{ color: "var(--gray)", fontSize: "13px", padding: "16px", background: "var(--surface2)", borderRadius: "10px", textAlign: "center", marginBottom: "28px", border: "1px solid var(--border)" }}>
                Ningún usuario ha dejado comentario todavía.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
                {metrics.comentarios.map((c, i) => (
                  <div key={i} style={{
                    background: "var(--surface2)", borderRadius: "10px", padding: "14px 18px",
                    border: "1px solid var(--border)", display: "flex", gap: "14px", alignItems: "flex-start",
                  }}>
                    <span style={{ fontSize: "18px", flexShrink: 0 }}>💬</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ color: "var(--brand)", fontSize: "12px", fontWeight: "600" }}>{c.email}</span>
                      </div>
                      <p style={{ color: "var(--white)", fontSize: "14px", margin: "0 0 6px", lineHeight: 1.5 }}>
                        "{c.mejoria}"
                      </p>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <span style={{ color: c.repetirias ? "var(--green)" : "var(--red)", fontSize: "11px" }}>
                          {c.repetirias ? "✅ Repetiría" : "❌ No repetiría"}
                        </span>
                        {c.pagarias && (
                          <span style={{ color: "var(--gray)", fontSize: "11px" }}>
                            💳 Pagaría: {c.pagarias}
                          </span>
                        )}
                        {c.created_at && (
                          <span style={{ color: "var(--gray2)", fontSize: "11px", marginLeft: "auto" }}>
                            {new Date(c.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              Generador de escenarios por empresa
            </div>
            <form onSubmit={handleCreateScenario} style={{
              background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "18px", marginBottom: "14px",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
            }}>
              <input value={scenarioForm.company_name} onChange={(e) => handleScenarioChange("company_name", e.target.value)} placeholder="Empresa (ej. Acme Logistics)" style={inputStyle} />
              <input value={scenarioForm.scenario_name} onChange={(e) => handleScenarioChange("scenario_name", e.target.value)} placeholder="Nombre escenario (ej. Renovación anual)" style={inputStyle} />

              <select value={scenarioForm.track} onChange={(e) => handleScenarioChange("track", e.target.value)} style={inputStyle}>
                <option value="software">Software</option>
                <option value="seguros">Seguros</option>
                <option value="infoproductos">InfoProductos</option>
                <option value="entrevistas">Entrevistas</option>
                <option value="core">Core</option>
              </select>

              <select value={scenarioForm.difficulty} onChange={(e) => handleScenarioChange("difficulty", e.target.value)} style={inputStyle}>
                <option value="beginner">Fácil</option>
                <option value="intermediate">Medio</option>
                <option value="advanced">Difícil</option>
              </select>

              <textarea value={scenarioForm.buyer_persona} onChange={(e) => handleScenarioChange("buyer_persona", e.target.value)} placeholder="Buyer persona" style={{ ...inputStyle, minHeight: "80px", gridColumn: "1 / span 2" }} />
              <textarea value={scenarioForm.context} onChange={(e) => handleScenarioChange("context", e.target.value)} placeholder="Contexto de conversación" style={{ ...inputStyle, minHeight: "70px", gridColumn: "1 / span 2" }} />
              <textarea value={scenarioForm.objection} onChange={(e) => handleScenarioChange("objection", e.target.value)} placeholder="Objeción inicial" style={{ ...inputStyle, minHeight: "70px", gridColumn: "1 / span 2" }} />

              <input type="number" value={scenarioForm.deal_value} onChange={(e) => handleScenarioChange("deal_value", e.target.value)} placeholder="Valor de venta (€)" style={inputStyle} />
              <input type="number" value={scenarioForm.commission_rate} onChange={(e) => handleScenarioChange("commission_rate", e.target.value)} placeholder="Comisión (%)" style={inputStyle} />

              <div style={{ gridColumn: "1 / span 2", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                <div>
                  {scenarioErr && <div style={{ color: "var(--red)", fontSize: "12px" }}>{scenarioErr}</div>}
                  {scenarioMsg && <div style={{ color: "var(--green)", fontSize: "12px" }}>{scenarioMsg}</div>}
                </div>
                <button type="submit" disabled={scenarioSaving} style={{
                  background: "linear-gradient(135deg, var(--brand), var(--brand2))", border: "none", color: "var(--white)", borderRadius: "8px", padding: "9px 14px", fontSize: "13px", fontWeight: "700", cursor: "pointer",
                }}>
                  {scenarioSaving ? "Guardando..." : "Guardar escenario"}
                </button>
              </div>
            </form>

            {metrics.customScenariosError ? (
              <div style={{ color: "var(--brand)", fontSize: "12px", marginBottom: "10px" }}>
                ⚠️ No se pudo leer company_scenarios: {metrics.customScenariosError}
              </div>
            ) : null}

            <div style={{
              background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px",
            }}>
              <div style={{ color: "var(--gray)", fontSize: "12px", marginBottom: "10px" }}>Últimos escenarios guardados ({metrics.customScenarios.length})</div>
              {metrics.customScenarios.length === 0 ? (
                <div style={{ color: "var(--gray)", fontSize: "12px" }}>Todavía no hay escenarios personalizados.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {metrics.customScenarios.map((s) => (
                    <div key={s.id} style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "12px" }}>
                      <span style={{ color: TRACK_COLORS[s.track] || "var(--gray)", width: "92px" }}>{TRACK_LABELS[s.track] || s.track}</span>
                      <span style={{ color: "var(--white)", flex: 1 }}>{s.company_name} · {s.scenario_name}</span>
                      <span style={{ color: "var(--gray)" }}>{s.difficulty || "-"}</span>
                      <span style={{ color: "var(--gray)" }}>{s.deal_value ? `${s.deal_value}€` : "-"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--white)",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "13px",
  boxSizing: "border-box",
};
