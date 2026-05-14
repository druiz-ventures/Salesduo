import App from "./App.jsx";
import VoiceOnly from "./components/VoiceOnly";
import CloserVoiceOnly from "./components/CloserVoiceOnly";
import ProductLanding from "./components/ProductLanding";
import DemoCallMVP from "./components/DemoCallMVP";

const truthy = (value) => ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());

const sdrLanding = {
  eyebrow: "SalesDuo SDR",
  title: "Landing para SDRs",
  subtitle: "Califica leads por mensaje, no por llamada.",
  description:
    "Una experiencia pensada para SDRs que trabajan con mensajes escritos, descubren contexto y avanzan leads sin meter ruido en la conversación.",
  icon: "target",
  primaryLabel: "Abrir demo SDR",
  primaryHref: "?product=sdr&demo=1",
  secondaryLabel: "Ver closer voice",
  secondaryHref: "?product=closer",
  metrics: [
    { label: "Formato", value: "Mensajes", hint: "Ideal para Instagram, DM y calificación inicial." },
    { label: "Objetivo", value: "Filtrar", hint: "Detecta si hay fit antes de pasar al equipo comercial." },
  ],
  highlights: [
    { icon: "speech", title: "Guía escrita", text: "Flujos cortos, secuenciales y orientados a calificar o descartar rápido." },
    { icon: "chart", title: "Lead scoring", text: "Sube o baja la probabilidad según las respuestas y el interés." },
    { icon: "shield", title: "Menos fricción", text: "La demo enseña cómo responder sin cerrar todavía." },
  ],
};

const closerLanding = {
  eyebrow: "SalesDuo Closer",
  title: "Landing para Closers",
  subtitle: "Cierra por voz en una llamada realista.",
  description:
    "Pensada para closers y executives que quieren practicar discovery, manejo de objeciones y cierre por voz, sin escribir nada.",
  icon: "handshake",
  primaryLabel: "Abrir demo Closer",
  primaryHref: "?product=closer&demo=1",
  secondaryLabel: "Ver SDR writing",
  secondaryHref: "?product=sdr",
  metrics: [
    { label: "Formato", value: "Voz", hint: "Ida y vuelta hablada, como una videollamada comercial." },
    { label: "Objetivo", value: "Cerrar", hint: "Avanza hasta la cita, la propuesta o el sí final." },
  ],
  highlights: [
    { icon: "phone", title: "Conversación viva", text: "Sin texto de entrada: escuchas, respondes y el cliente replica por voz." },
    { icon: "shield", title: "Objeciones reales", text: "Castiga cierres prematuros y premia preguntas abiertas." },
    { icon: "trophy", title: "Cierre guiado", text: "La llamada termina en victoria, resistencia o freno." },
  ],
};

export default function AppRouter() {
  if (typeof window === "undefined") {
    return <App />;
  }

  const params = new URLSearchParams(window.location.search);
  const product = (params.get("product") || params.get("app") || params.get("suite") || "").toLowerCase();
  const demo = truthy(params.get("demo"));
  const voiceDemo = truthy(params.get("voice_demo"));
  const closerDemo = truthy(params.get("closer_demo"));

  if (product === "mvp" || truthy(params.get("mvp"))) {
    return <DemoCallMVP />;
  }

  if (product === "sdr") {
    if (demo || voiceDemo) return <VoiceOnly />;
    return <ProductLanding {...sdrLanding} />;
  }

  if (product === "closer") {
    if (demo || closerDemo) return <CloserVoiceOnly />;
    return <ProductLanding {...closerLanding} />;
  }

  if (voiceDemo) return <VoiceOnly />;
  if (closerDemo) return <CloserVoiceOnly />;

  return <App />;
}