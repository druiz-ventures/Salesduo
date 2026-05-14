import BrandIcon from "./BrandIcon";

const defaultHighlights = [];

export default function ProductLanding({
  eyebrow,
  title,
  subtitle,
  description,
  icon = "target",
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  metrics = [],
  highlights = defaultHighlights,
}) {
  return (
    <main style={styles.page}>
      <section style={styles.heroCard}>
        <div style={styles.topRow}>
          <div style={styles.brandPill}>
            <BrandIcon icon={icon} size={1.1} />
            <span>{eyebrow}</span>
          </div>
          <div style={styles.badge}>Demo separada</div>
        </div>

        <div style={styles.heroGrid}>
          <div>
            <h1 style={styles.title}>{title}</h1>
            <p style={styles.subtitle}>{subtitle}</p>
            <p style={styles.description}>{description}</p>

            <div style={styles.ctaRow}>
              <a href={primaryHref} style={styles.primaryButton}>{primaryLabel}</a>
              <a href={secondaryHref} style={styles.secondaryButton}>{secondaryLabel}</a>
            </div>
          </div>

          <aside style={styles.sidePanel}>
            {metrics.map((metric) => (
              <div key={metric.label} style={styles.metricCard}>
                <div style={styles.metricLabel}>{metric.label}</div>
                <div style={styles.metricValue}>{metric.value}</div>
                <div style={styles.metricHint}>{metric.hint}</div>
              </div>
            ))}
          </aside>
        </div>

        <div style={styles.highlightGrid}>
          {highlights.map((item) => (
            <article key={item.title} style={styles.highlightCard}>
              <div style={styles.highlightIcon}><BrandIcon icon={item.icon} size={0.9} /></div>
              <div>
                <h3 style={styles.highlightTitle}>{item.title}</h3>
                <p style={styles.highlightText}>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(0, 197, 255, 0.16), transparent 30%), radial-gradient(circle at 80% 0%, rgba(0, 255, 196, 0.12), transparent 24%), linear-gradient(180deg, #05070d 0%, #060b14 100%)",
    color: "#e8f2ff",
    padding: "28px",
    boxSizing: "border-box",
  },
  heroCard: {
    width: "min(1180px, 100%)",
    margin: "0 auto",
    border: "1px solid rgba(120, 180, 255, 0.18)",
    borderRadius: "28px",
    background: "linear-gradient(180deg, rgba(12, 18, 28, 0.94), rgba(7, 12, 20, 0.96))",
    boxShadow: "0 40px 100px rgba(0, 0, 0, 0.45)",
    padding: "28px",
    backdropFilter: "blur(20px)",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "28px",
    flexWrap: "wrap",
  },
  brandPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    borderRadius: "999px",
    border: "1px solid rgba(120, 180, 255, 0.18)",
    background: "rgba(255,255,255,0.03)",
    color: "#cfeaff",
    fontWeight: 700,
    letterSpacing: "0.01em",
  },
  badge: {
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(0, 197, 255, 0.12)",
    color: "#8adfff",
    border: "1px solid rgba(0, 197, 255, 0.2)",
    fontWeight: 700,
    fontSize: "13px",
  },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.9fr)",
    gap: "28px",
    alignItems: "start",
  },
  title: {
    margin: 0,
    fontSize: "clamp(40px, 6vw, 72px)",
    lineHeight: 1,
    letterSpacing: "-0.04em",
    color: "#f3f8ff",
    fontWeight: 800,
  },
  subtitle: {
    margin: "16px 0 0",
    fontSize: "clamp(18px, 2.2vw, 28px)",
    lineHeight: 1.25,
    color: "#a8bed8",
    maxWidth: "16ch",
    fontWeight: 600,
  },
  description: {
    margin: "18px 0 0",
    fontSize: "17px",
    lineHeight: 1.7,
    color: "#8ca4c4",
    maxWidth: "60ch",
  },
  ctaRow: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
    flexWrap: "wrap",
  },
  primaryButton: {
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 18px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #00c5ff, #00d59a)",
    color: "#03111d",
    fontWeight: 800,
    boxShadow: "0 18px 45px rgba(0, 197, 255, 0.28)",
  },
  secondaryButton: {
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 18px",
    borderRadius: "14px",
    border: "1px solid rgba(140, 164, 196, 0.22)",
    color: "#dfe8f5",
    background: "rgba(255,255,255,0.03)",
    fontWeight: 700,
  },
  sidePanel: {
    display: "grid",
    gap: "14px",
  },
  metricCard: {
    borderRadius: "20px",
    padding: "18px",
    border: "1px solid rgba(120, 180, 255, 0.14)",
    background: "rgba(255,255,255,0.03)",
  },
  metricLabel: { color: "#8aa4c3", fontSize: "13px", marginBottom: "8px", fontWeight: 700 },
  metricValue: { color: "#f5fbff", fontSize: "26px", fontWeight: 800, letterSpacing: "-0.03em" },
  metricHint: { color: "#9cb2cc", fontSize: "13px", marginTop: "6px", lineHeight: 1.5 },
  highlightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "14px",
    marginTop: "28px",
  },
  highlightCard: {
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
    borderRadius: "20px",
    padding: "18px",
    border: "1px solid rgba(120, 180, 255, 0.14)",
    background: "rgba(255,255,255,0.02)",
  },
  highlightIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    display: "grid",
    placeItems: "center",
    background: "rgba(0, 197, 255, 0.1)",
    border: "1px solid rgba(0, 197, 255, 0.16)",
    flexShrink: 0,
  },
  highlightTitle: { margin: 0, fontSize: "16px", color: "#f5fbff" },
  highlightText: { margin: "6px 0 0", color: "#97acc5", lineHeight: 1.6, fontSize: "14px" },
};