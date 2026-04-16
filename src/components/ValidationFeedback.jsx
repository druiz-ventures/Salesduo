import { useState } from "react";
import { supabase } from "../supabaseClient";
import BrandIcon from "./BrandIcon";

export default function ValidationFeedback({ userId, conversationId, scoreFinal, endType, onComplete }) {
  const [repetirias, setRepetirias] = useState(null);   // true | false | null
  const [pagarias, setPagarias]     = useState(null);   // 'si' | 'no' | 'quizas' | null
  const [precioIdealRango, setPrecioIdealRango] = useState(null); // string | null
  const [nps, setNps] = useState(null); // 0..10 | null
  const [usoEquipo, setUsoEquipo] = useState(null); // 'individual' | 'equipo' | 'ambos' | null
  const [mejoria, setMejoria]       = useState("");
  const [saving, setSaving]         = useState(false);

  const handleSend = async () => {
    setSaving(true);
    const payload = {
      user_id:         userId,
      conversation_id: conversationId,
      repetirias:      repetirias,
      pagarias:        pagarias,
      precio_ideal_rango: precioIdealRango,
      nps,
      uso_equipo: usoEquipo,
      mejoria:         mejoria.trim() || null,
      score_final:     scoreFinal,
      end_type:        endType,
    };

    const { error } = await supabase.from("validation_feedback").insert(payload);

    // Compatibilidad MVP: si faltan columnas nuevas, guarda al menos los campos base
    if (error) {
      await supabase.from("validation_feedback").insert({
        user_id: userId,
        conversation_id: conversationId,
        repetirias,
        pagarias,
        mejoria: mejoria.trim() || null,
        score_final: scoreFinal,
        end_type: endType,
      });
    }

    setSaving(false);
    onComplete();
  };

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <h3 style={s.title}><BrandIcon icon="trophy" size={1} /> Valora esta sesión</h3>
        <p style={s.sub}>Tu opinión nos ayuda a mejorar el entrenamiento.</p>

        {/* Pregunta 1 */}
        <div style={s.question}>
          <p style={s.questionText}>¿Repetirías este entrenamiento mañana?</p>
          <div style={s.btnRow}>
            {[{ label: "Sí", value: true }, { label: "No", value: false }].map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => setRepetirias(opt.value)}
                style={{ ...s.optBtn, ...(repetirias === opt.value ? s.optBtnActive : {}) }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pregunta 2 */}
        <div style={s.question}>
          <p style={s.questionText}>¿Pagarías por acceso completo a todas las lecciones?</p>
          <div style={s.btnRow}>
            {[{ label: "Sí", value: "si" }, { label: "No", value: "no" }, { label: "Quizás", value: "quizas" }].map(opt => (
              <button
                key={opt.value}
                onClick={() => setPagarias(opt.value)}
                style={{ ...s.optBtn, ...(pagarias === opt.value ? s.optBtnActive : {}) }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pregunta 3 */}
        <div style={s.question}>
          <p style={s.questionText}>Si pagaras, ¿qué precio mensual te parecería razonable?</p>
          <div style={s.btnRow}>
            {[
              { label: "0€", value: "0" },
              { label: "10-29€", value: "10-29" },
              { label: "30-59€", value: "30-59" },
              { label: "60-99€", value: "60-99" },
              { label: "100€+", value: "100+" },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setPrecioIdealRango(opt.value)}
                style={{ ...s.optBtn, ...(precioIdealRango === opt.value ? s.optBtnActive : {}) }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pregunta 4 */}
        <div style={s.question}>
          <p style={s.questionText}>¿Lo usarías para ti o para entrenar a un equipo?</p>
          <div style={s.btnRow}>
            {[
              { label: "Solo yo", value: "individual" },
              { label: "Solo equipo", value: "equipo" },
              { label: "Ambos", value: "ambos" },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setUsoEquipo(opt.value)}
                style={{ ...s.optBtn, ...(usoEquipo === opt.value ? s.optBtnActive : {}) }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pregunta 5 */}
        <div style={s.question}>
          <p style={s.questionText}>Del 0 al 10, ¿cuánto recomendarías SalesDuo a un colega?</p>
          <div style={s.btnRow}>
            {Array.from({ length: 11 }, (_, i) => i).map(value => (
              <button
                key={value}
                onClick={() => setNps(value)}
                style={{
                  ...s.npsBtn,
                  ...(nps === value ? s.optBtnActive : {}),
                }}
              >
                {value}
              </button>
            ))}
          </div>
          <p style={s.npsHint}>0 = nada probable · 10 = lo recomendaría seguro</p>
        </div>

        {/* Pregunta 6 */}
        <div style={s.question}>
          <p style={s.questionText}>¿Qué mejorarías? <span style={{ color: "var(--gray2)" }}>(opcional)</span></p>
          <textarea
            style={s.textarea}
            placeholder="Escribe aquí tu sugerencia..."
            value={mejoria}
            onChange={e => setMejoria(e.target.value)}
            rows={3}
          />
        </div>

        {/* Botones */}
        <div style={s.actions}>
          <button style={s.skipBtn} onClick={onComplete} disabled={saving}>
            Saltar
          </button>
          <button
            style={{ ...s.sendBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleSend}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Enviar y continuar →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(6, 8, 16, 0.86)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: "20px",
    backdropFilter: "blur(24px)",
  },
  card: {
    background: "rgba(12, 16, 24, 0.96)",
    border: "1px solid var(--border)",
    borderRadius: "24px",
    padding: "36px 30px",
    width: "100%",
    maxWidth: "460px",
    boxShadow: "0 30px 90px rgba(0,0,0,0.5)",
  },
  title: { color: "var(--white)", fontSize: "24px", fontWeight: "800", margin: "0 0 6px", fontFamily: "var(--font-display)", letterSpacing: "-0.03em" },
  sub:   { color: "var(--gray2)", fontSize: "13px", margin: "0 0 24px" },
  question: { marginBottom: "22px" },
  questionText: { color: "var(--white)", fontSize: "14px", fontWeight: "600", margin: "0 0 10px" },
  btnRow: { display: "flex", gap: "10px", flexWrap: "wrap" },
  optBtn: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    color: "var(--gray)",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.15s ease-in-out",
  },
  npsBtn: {
    minWidth: "38px",
    padding: "10px 0",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    color: "var(--gray)",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
  },
  optBtnActive: {
    background: "linear-gradient(135deg, var(--brand), var(--brand2))",
    borderColor: "var(--brand)",
    color: "var(--white)",
  },
  npsHint: { color: "var(--gray2)", fontSize: "11px", margin: "8px 0 0" },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--surface2)",
    color: "var(--white)",
    fontSize: "14px",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  },
  actions: { display: "flex", gap: "10px", marginTop: "8px" },
  skipBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--gray2)",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
  },
  sendBtn: {
    flex: 2,
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, var(--brand), var(--brand2))",
    color: "var(--white)",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 0 20px var(--glow)",
  },
};
