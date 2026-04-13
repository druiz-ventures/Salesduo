import { useState, useEffect, useRef } from "react";
import ValidationFeedback from "./ValidationFeedback";
import { supabase } from "../supabaseClient";

// ── Escenarios por conversationId ─────────────────────────────────────────────
const SCENARIOS = {
  // ── Escenarios originales ──────────────────────────────────────────────────
  "objecion-precio": {
    buyerPersona: `Eres Carlos Méndez, Director de Operaciones de una empresa de logística de 80 personas. 
Llevas 12 años en el sector, eres analítico y desconfías de los vendedores que van directo al precio. 
Tu mayor problema ahora mismo es la rotación de tu equipo comercial (pierdes 2-3 comerciales al año) 
y la curva de aprendizaje de 6-9 meses que eso supone. Pero no lo dices a menos que te pregunten bien.`,
    context: "Llamada de prospección. El vendedor acaba de presentar SalesDuo brevemente.",
    objection: "Me parece interesante pero es bastante caro para lo que ofrecéis.",
    dealValue: 18000,
    commissionRate: 10,
  },
  "objecion-tiempo": {
    buyerPersona: `Eres Laura Vidal, Head of Sales de una empresa SaaS B2B de 45 personas. 
Estás en plena campaña de Q2, con el equipo a tope. Eres directa y valoras mucho el tiempo. 
Tu dolor real: dos de tus mejores comerciales llevan 3 meses sin llegar a quota y no sabes si es 
el proceso o la práctica. Pero estás demasiado ocupada para investigarlo ahora.`,
    context: "El vendedor te ha contactado por LinkedIn y has aceptado una llamada de 15 minutos.",
    objection: "Mira, ahora mismo no tenemos tiempo para implementar nada nuevo. Quizás en Q3.",
    dealValue: 12000,
    commissionRate: 10,
  },
  "objecion-competencia": {
    buyerPersona: `Eres Marcos Ruiz, CEO de una agencia de ventas outsourcing con 30 comerciales. 
Ya usas Gong para análisis de llamadas y tienes un proceso de onboarding con role-plays manuales. 
Eres escéptico sobre si una herramienta de IA puede replicar la calidad de un role-play con un manager senior. 
Tu dolor: los role-plays manuales consumen 4 horas de manager time por comercial nuevo.`,
    context: "Demo agendada. El vendedor ha hecho la presentación inicial.",
    objection: "Ya tenemos Gong y hacemos role-plays internos. No veo qué nos aportáis vosotros.",
    dealValue: 24000,
    commissionRate: 10,
  },

  // ── SEGUROS ───────────────────────────────────────────────────────────────
  "seguros-facil": {
    buyerPersona: `Eres Antonio Herrera, administrativo de 41 años con mujer y dos hijos de 8 y 12 años. 
Trabajas en una empresa pública en Valencia, tienes hipoteca y un coche de 4 años. 
Eres responsable con el dinero pero nunca has entendido bien los seguros — los ves como algo que 
"paga y reza para no necesitar". Tu dolor real oculto: tu padre murió sin seguro de vida y tu madre 
tuvo que vender el piso. Ese miedo lo tienes pero no lo verbalizas fácilmente. 
Eres cordial pero te aburres cuando el vendedor habla de coberturas técnicas.`,
    context: "Llamada entrante. Has pedido información por la web hace dos días.",
    objection: "Sí, estoy mirando opciones pero ahora mismo no sé si es el momento, con la hipoteca y todo…",
    dealValue: 3200,
    commissionRate: 15,
  },
  "seguros-dificil": {
    buyerPersona: `Eres Roberto Fuentes, empresario de 52 años, dueño de una empresa de distribución 
alimentaria con 22 empleados en Zaragoza. Tienes seguro de vida, seguro de empresa y de flota desde hace 
8 años con Mapfre y estás "satisfecho" — aunque en realidad llevas 3 años sin revisar las coberturas 
y tienes un gap importante en responsabilidad civil que desconoces. 
Eres directo, impaciente y te irritas cuando sientes que te llaman para venderte algo. 
Hablas rápido y tiendes a cortar al vendedor antes de que termine las frases.`,
    context: "Llamada de prospección fría. Llevas 20 segundos hablando.",
    objection: "Mira, ya tengo todo cubierto con Mapfre desde hace años y estoy contento. Además ahora mismo no tengo tiempo, estoy en plena campaña de verano. ¿Qué me puedes ofrecer tú que no tenga ya?",
    dealValue: 9600,
    commissionRate: 15,
  },

  // ── INMOBILIARIO ──────────────────────────────────────────────────────────
  "inmobiliario-facil": {
    buyerPersona: `Eres Sofía Martín, 29 años, trabaja en marketing digital en Madrid. 
Tu pareja Miguel y tú lleváis 6 meses buscando piso para comprar — es vuestra primera vez y os 
sentís perdidos con hipotecas, notarías y gastos de comunidad. 
Tenéis ahorrado el 20% de entrada pero os da miedo endeudarse tanto. 
Tu dolor real oculto: tu alquiler sube un 15% en marzo y necesitáis decidir antes, pero la presión 
os hace cometer errores de precipitación. Eres abierta y preguntas mucho, pero te bloqueas 
cuando escuchas cifras grandes.`,
    context: "Visita a un piso de obra nueva. El agente acaba de enseñaros el salón.",
    objection: "Nos gusta mucho pero… son 285.000 euros. No sé si podemos permitírnoslo realmente.",
    dealValue: 285000,
    commissionRate: 3,
  },
  "inmobiliario-dificil": {
    buyerPersona: `Eres Javier Olmedo, 48 años, odontólogo con clínica propia en Barcelona. 
Has comprado y vendido 4 propiedades en los últimos 10 años — dos para alquilar, dos para reformar 
y vender. Conoces bien el sector: sabes lo que valen las zonas, negocias los honorarios y no 
te dejas llevar por los argumentos emocionales. 
Tu dolor real oculto: llevas 7 meses buscando y has perdido 2 oportunidades por ir demasiado lento 
en la negociación. Tu mujer está perdiendo la paciencia. Eres frío, comparas todo y tienes otra 
agencia que te ha enseñado 3 opciones similares esta semana.`,
    context: "Segunda visita al piso. Ya tienes los datos del registro y tasación propia.",
    objection: "Vuestra comisión es del 3% y Tecnocasa me cobra el 2,5%. Además he visto un piso en la misma calle por 40.000 menos. Convénceme de por qué debería cerrar con vosotros.",
    dealValue: 420000,
    commissionRate: 3,
  },

  // ── KIT DIGITAL / SOFTWARE PYME ───────────────────────────────────────────
  "kit-digital-facil": {
    buyerPersona: `Eres Manuela Torres, 44 años, peluquera autónoma con local propio en Sevilla. 
Llevas gestionando citas con papel y WhatsApp desde hace 11 años. Tienes Instagram pero lo lleva 
tu sobrina cuando puede. Sabes que "deberías digitalizarte" pero no sabes por dónde empezar 
y le tienes un poco de miedo a los ordenadores. 
Tu dolor real oculto: pierdes unas 8-10 citas al mes por no tener sistema de recordatorios 
y dos clientas fijas se fueron a otra peluquería con app de reservas. Eres amable y quieres 
ayuda real, pero te agobias cuando el vendedor habla de CRM, APIs o dashboards.`,
    context: "Reunión presencial en tu local. El asesor ha venido por recomendación de otra peluquera.",
    objection: "Me interesa pero es que yo de esto no entiendo nada, ¿y si lo monto y luego no sé usarlo?",
    dealValue: 6000,
    commissionRate: 12,
  },
  "kit-digital-dificil": {
    buyerPersona: `Eres Fernando Castillo, 51 años, gerente de una empresa de fontanería industrial 
con 18 empleados en Bilbao. Hace dos años contrataste un CRM que costó 12.000 euros, lo implantó 
una consultora y a los 4 meses nadie lo usaba — los comerciales volvieron al Excel. 
Esa experiencia te dejó escéptico y algo avergonzado delante de tu socio. 
Tu dolor real oculto: tu competidor principal acaba de ganar un contrato grande porque tenía 
presupuestos online y tú tardas 3 días en sacar uno. Pero no lo dices porque admitirlo duele. 
Eres directo, interrumpes y cuando algo te suena a "consultoría" saltas inmediatamente.`,
    context: "Videollamada de 30 minutos. Llevas 5 minutos escuchando la presentación.",
    objection: "Ya intenté esto una vez, me costó una pasta y fue un desastre total. ¿Por qué iba a ser diferente esta vez? Además ahora no es buen momento, tenemos mucho trabajo.",
    dealValue: 15000,
    commissionRate: 12,
  },

  // ── INFOPRODUCTOS / FORMACIÓN ONLINE ─────────────────────────────────────
  "infoproductos-facil": {
    buyerPersona: `Eres Patricia Núñez, 34 años, técnica de laboratorio farmacéutico en Madrid. 
Llevas 8 años en el mismo puesto y sientes que has llegado a tu techo. Has estado viendo contenido 
sobre UX Design y crees que podrías reinventarte, pero no tienes claro si eres capaz de 
aprender algo tan diferente a tu edad. 
Tu dolor real oculto: tu empresa acaba de anunciar un ERE y quieres tener una salida antes 
de que te afecte, aunque externamente dices que "quieres crecer". 
Eres reflexiva, te haces muchas preguntas y necesitas sentir que el vendedor te entiende 
antes de abrirte a hablar de dinero.`,
    context: "Videollamada de admisión. Acabas de ver un webinar gratuito del curso.",
    objection: "Me ha gustado mucho el webinar, pero 1.800 euros es mucho dinero para mí ahora mismo…",
    dealValue: 1800,
    commissionRate: 20,
  },
  "infoproductos-dificil": {
    buyerPersona: `Eres Rodrigo Vega, 39 años, consultor independiente de Barcelona. 
Hace 2 años compraste un curso de marketing digital de 2.400 euros que prometía "clientes 
recurrentes en 90 días" — no funcionó, el soporte era malo y pediste reembolso sin éxito. 
Desde entonces eres muy escéptico con la formación online y especialmente con los vendedores 
que usan urgencia, testimonios y "plazas limitadas". 
Tu dolor real oculto: tu negocio lleva 18 meses estancado en los mismos 3.000€/mes 
y sabes que necesitas cambiar algo, pero el orgullo no te deja admitirlo fácilmente. 
Eres irónico, pones a prueba al vendedor con preguntas técnicas y detectas al vuelo 
cualquier argumento de venta genérico.`,
    context: "Llamada de ventas tras solicitar información por la web.",
    objection: "Ya compré un curso parecido y fue tirar el dinero. ¿Qué garantía me das de que esto es diferente? Porque promesas ya he escuchado muchas.",
    dealValue: 2400,
    commissionRate: 20,
  },

  // ── TELECOMUNICACIONES ────────────────────────────────────────────────────
  "telecomunicaciones-facil": {
    buyerPersona: `Eres Carmen Iglesias, 55 años, jubilada anticipada que vive en Málaga. 
Llevas 9 años con Movistar pagando 89€/mes por fibra + móvil. No sabes muy bien qué tienes 
contratado ni si es caro o barato — lo llevas en automático desde que lo contrató tu marido. 
Tu dolor real oculto: el mes pasado tuviste 3 cortes de fibra en una semana y perdiste una 
videollamada importante con tus hijos que viven en Alemania. Eso te molestó mucho. 
Eres amable pero desconfiada con las llamadas comerciales — ya te han intentado colar 
permanencias camufladas dos veces.`,
    context: "Llamada de captación. La empresa tiene una oferta de portabilidad.",
    objection: "No sé, es que con estos cambios siempre hay letra pequeña y luego te cobran de más. ¿Y si me quedo sin internet unos días durante el cambio?",
    dealValue: 1200,
    commissionRate: 8,
  },
  "telecomunicaciones-dificil": {
    buyerPersona: `Eres Álvaro Serrano, 43 años, responsable de IT y sistemas de una empresa 
de ingeniería con 65 empleados en Valencia. Gestionas contratos con Orange Business desde hace 
4 años: fibra simétrica 600MB, 40 líneas móviles y centralita virtual. El contrato vence en 
8 meses pero ya estás negociando la renovación con Orange y tienes una reunión con Vodafone 
la semana que viene. Eres metódico, compras por TCO (coste total) y necesitas SLA garantizados 
por escrito. Tu dolor real oculto: el soporte técnico de Orange tardó 11 horas en resolver 
una caída el mes pasado y tu CEO te presionó por ello — buscas un proveedor con mejor SLA 
pero no quieres que parezca que cambias por un mal servicio tuyo.`,
    context: "Reunión presencial. El comercial ha traído propuesta técnica y económica.",
    objection: "Vuestros precios son competitivos pero llevamos años con Orange y un cambio de esta envergadura tiene un coste oculto enorme en tiempo de migración. Además, ¿cómo me garantizáis que el SLA de 4 horas que prometéis lo vais a cumplir de verdad?",
    dealValue: 28000,
    commissionRate: 8,
  },

  // ── VENTAS B2B GENÉRICO ───────────────────────────────────────────────────
  "b2b-facil": {
    buyerPersona: `Eres Isabel Domínguez, 46 años, directora de una asesoría fiscal con 9 empleados 
en Granada. El negocio va bien pero llevas 3 años trabajando con los mismos procesos y herramientas. 
Tu mayor problema es que dos de tus gestores senior se jubilan el año que viene y necesitas 
documentar y transferir su conocimiento antes de que se vayan. 
Tu dolor real oculto: tienes miedo de que sin ellos la calidad baje y pierdas clientes 
que llevas 15 años fidelizando. Pero delante del vendedor prefieres hablar de "optimizar procesos". 
Eres pragmática, preguntas por referencias de clientes similares y necesitas ver ROI concreto 
antes de comprometerte con nada.`,
    context: "Primera reunión presencial. El vendedor ha venido por recomendación de un cliente tuyo.",
    objection: "Me interesa lo que contáis pero somos una empresa pequeña, no sé si tenemos presupuesto para esto ahora mismo. ¿Cuánto costaría más o menos?",
    dealValue: 8500,
    commissionRate: 12,
  },
  "b2b-dificil": {
    buyerPersona: `Eres Miguel Ángel Pardo, 50 años, director de compras de un grupo de distribución 
con 340 empleados y sede en Madrid. Gestionas entre 80 y 120 proveedores activos. 
Cualquier nueva incorporación pasa por tu departamento, evaluación técnica, comité de dirección 
y aprobación financiera — el proceso mínimo dura 4 meses. 
Tu dolor real oculto: tu CEO te ha dicho en privado que necesitáis reducir costes operativos 
un 12% este año o habrá consecuencias, y llevas 6 semanas sin encontrar la palanca adecuada. 
Eres frío, formal y usas el proceso burocrático como escudo para no comprometerte. 
Hablas en tercera persona ("la empresa necesita", "el comité valorará") y nunca dices sí en 
una primera reunión por principio.`,
    context: "Reunión de 45 minutos en sus oficinas. Es la primera toma de contacto.",
    objection: "Lo que presentáis tiene sentido sobre el papel, pero aquí cualquier decisión de esta envergadura requiere pasar por varios departamentos y nuestros tiempos no son los vuestros. Además tenemos un proveedor actual con el que llevamos 6 años y cambiar genera fricción interna. No es el mejor momento.",
    dealValue: 55000,
    commissionRate: 8,
  },

  // ── ENTREVISTA / VENTA PERSONAL ─────────────────────────────────────────
  "entrevista-facil": {
    buyerPersona: `Eres Laura Gómez, recruiter en una empresa SaaS de 90 personas. 
Buscas a un perfil comercial que sepa prospectar y cerrar, pero sobre todo que tenga estructura 
y sepa comunicar valor con claridad. Eres cercana, pero exigente con ejemplos reales. 
Tu duda principal: si este candidato realmente vende o solo sabe hablar bien en entrevistas.`,
    context: "Entrevista inicial de 20 minutos para un rol de Account Executive.",
    objection: "Cuéntame brevemente por qué deberíamos contratarte para ventas y no a otro candidato.",
    dealValue: 24000,
    commissionRate: 10,
  },
  "entrevista-dificil": {
    buyerPersona: `Eres Marta Ruiz, Hiring Manager de un equipo de ventas B2B. 
Has entrevistado a más de 60 candidatos este año y detectas rápido respuestas vacías. 
Eres directa, vas al grano y presionas con objeciones reales del puesto. 
Tu foco está en resultados medibles, resiliencia y capacidad para vender bajo presión.`,
    context: "Entrevista final con manager. Caso real del puesto y preguntas de estrés.",
    objection: "Tu CV no demuestra cierres enterprise complejos. ¿Qué evidencia real tienes de que puedes vender en este nivel?",
    dealValue: 36000,
    commissionRate: 10,
  },
};



export default function ChatSimulator({ conversationData, salesRole = "setter", onFinish, onAbort, userId }) {
  const scenario = SCENARIOS[conversationData.id] || SCENARIOS["objecion-precio"];

  const [messages, setMessages] = useState([
    { sender: "client", text: scenario.objection },
    { sender: "hint", text: "💡 " + (conversationData.nodes?.[conversationData.initialNode]?.hint || "Responde a la objeción del cliente.") },
  ]);
  const [claudeHistory, setClaudeHistory] = useState([
    { role: "user", content: `[INICIO DE SIMULACIÓN] El vendedor inicia la conversación.` },
    { role: "assistant", content: JSON.stringify({
      clientMessage: scenario.objection,
      feedback: "",
      matchType: "nomatch",
      scoreImpact: 0,
      technique: "",
      isEndNode: false,
      endType: null,
    })},
  ]);

  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [ended, setEnded] = useState(false);
  const [endType, setEndType] = useState(null);
  const [showValidation, setShowValidation] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || ended || isTyping) return;

    const userText = input.trim();
    setInput("");
    setIsTyping(true);

    // Añadir mensaje del usuario al chat
    setMessages(prev => [...prev, { sender: "user", text: userText }]);

    // Actualizar historial para Claude
    const newHistory = [
      ...claudeHistory,
      { role: "user", content: userText },
    ];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const { data: aiResponse, error: fnError } = await supabase.functions.invoke("chat-ai", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: {
          conversationHistory: newHistory,
          scenarioContext: scenario,
          salesRole,
          turnCount: turnCount + 1,
        },
      });

      if (fnError) throw fnError;
      if (!aiResponse?.clientMessage) throw new Error("La IA no devolvió respuesta válida");
      const newScore = score + (aiResponse.scoreImpact || 0);

      // Actualizar historial Claude con la respuesta
      setClaudeHistory([
        ...newHistory,
        { role: "assistant", content: JSON.stringify(aiResponse) },
      ]);

      setScore(newScore);
      setTurnCount(t => t + 1);
      setIsTyping(false);

      // Mostrar feedback + respuesta del cliente
      const followUp = [];

      if (aiResponse.feedback) {
        followUp.push({
          sender: "feedback",
          text: aiResponse.feedback,
          technique: aiResponse.technique || "Técnica detectada",
          quality: aiResponse.matchType || "nomatch",
          scoreImpact: aiResponse.scoreImpact || 0,
        });
      }

      followUp.push({ sender: "client", text: aiResponse.clientMessage });

      if (!aiResponse.isEndNode) {
        followUp.push({ sender: "hint", text: "💡 Sigue la conversación — adapta tu respuesta a lo que acaba de decir." });
      }

      setMessages(prev => [...prev, ...followUp]);

      if (aiResponse.isEndNode) {
        setEndType(aiResponse.endType);
        setEnded(true);
      } else {
        setTimeout(() => inputRef.current?.focus(), 100);
      }

    } catch (err) {
      setIsTyping(false);
      let backendDetail = "";
      if (!backendDetail && err?.message) {
        backendDetail = String(err.message);
      }
      if (!backendDetail && err?.name) {
        backendDetail = String(err.name);
      }
      if (err?.context && typeof err.context.json === "function") {
        try {
          const body = await err.context.json();
          backendDetail = body?.error ? String(body.error) : "";
        } catch {
          backendDetail = "";
        }
      }

      const rawMessage = `${String(err?.message || "")} ${backendDetail}`.toLowerCase();
      const isAuthError = rawMessage.includes("token") || rawMessage.includes("no autorizado") || rawMessage.includes("401") || rawMessage.includes("jwt");
      const errorText = isAuthError
        ? "⚠️ Tu sesión ha caducado. Cierra sesión y vuelve a entrar para continuar."
        : "⚠️ Error conectando con la IA. Revisa tu conexión.";

      console.error("chat-ai invoke error:", err, backendDetail);
      setMessages(prev => [...prev, {
        sender: "system",
        text: backendDetail ? `${errorText} (${backendDetail})` : errorText,
      }]);
    }
  };

  const handleFinish = () => {
    const xpEarned = endType === "success" ? 100 : 40;
    if (onFinish) onFinish({ score, xpEarned, endType: endType || "failure", badgeUnlocked: endType === "success" ? "first-win" : null });
  };

  const handleValidationComplete = () => {
    handleFinish();
  };

  const handleAbortTraining = () => {
    const confirmAbort = window.confirm("¿Seguro que quieres abandonar este entrenamiento?");
    if (!confirmAbort) return;
    if (onAbort) {
      onAbort();
      return;
    }
    if (onFinish) {
      onFinish({ score, xpEarned: 0, endType: "abandoned", badgeUnlocked: null });
    }
  };

  const qualityColors = { positive: "#22c55e", negative: "#ef4444", nomatch: "#f59e0b" };

  const isInterviewScenario = conversationData.id?.startsWith("entrevista");
  const dealValue = scenario.dealValue || 0;
  const commissionRate = scenario.commissionRate || 10;
  const commission = Math.round(dealValue * commissionRate / 100);
  const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k" : n;

  const endResults = {
    success: { title: "🎉 ¡Deal avanzado!", message: "Conseguiste que el cliente quiera seguir la conversación. Eso es lo que cuenta.", xpEarned: 100 },
    failure: { title: "📉 El cliente se fue", message: "No pasa nada — cada simulación fallida es práctica real. Revisa el feedback y repite.", xpEarned: 40 },
  };
  const result = endResults[endType] || endResults.failure;

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>🤖 {conversationData.clientName || "Cliente simulado"}</h2>
        <span className="chat-score">🏆 {score} pts</span>
      </div>
      <p className="chat-role">{conversationData.clientRole || scenario.context}</p>
      <p className="chat-context">{scenario.context}</p>
      {!conversationData.id?.startsWith("entrevista") && (
        <p className="chat-context" style={{ color: salesRole === "setter" ? "#06b6d4" : "#22c55e", marginTop: "-6px" }}>
          {salesRole === "setter"
            ? "Modo SDR/Setter: objetivo = calificar y agendar siguiente reunión"
            : "Modo AE/Closer: objetivo = avanzar al cierre con compromiso concreto"}
        </p>
      )}

      {/* Stake bar */}
      {dealValue > 0 && !isInterviewScenario && (
        <div style={{
          display: "flex", gap: "10px", margin: "0 0 12px",
          background: "#0f172a", borderRadius: "10px", padding: "10px 14px",
          border: "1px solid #1e293b", flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "16px" }}>💰</span>
            <span style={{ color: "#64748b", fontSize: "12px" }}>Venta:</span>
            <span style={{ color: "#f1f5f9", fontWeight: "700", fontSize: "14px" }}>{fmt(dealValue)}€</span>
          </div>
          <div style={{ width: "1px", background: "#1e293b" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "16px" }}>💸</span>
            <span style={{ color: "#64748b", fontSize: "12px" }}>Tu comisión ({commissionRate}%):</span>
            <span style={{ color: "#22c55e", fontWeight: "800", fontSize: "15px" }}>{fmt(commission)}€</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <span style={{ color: "#475569", fontSize: "11px" }}>si cierras esta venta</span>
          </div>
        </div>
      )}

      <div className="chat-messages" ref={chatRef}>
        {messages.map((msg, i) => {
          if (msg.sender === "feedback") {
            return (
              <div key={i} className="message feedback-row">
                <div className="feedback-bubble" style={{ borderLeftColor: qualityColors[msg.quality] || "#94a3b8" }}>
                  <span className="feedback-text">{msg.text}</span>
                  <div className="feedback-meta">
                    <span className="feedback-technique">{msg.technique}</span>
                    <span className="feedback-score-delta" style={{ color: msg.scoreImpact >= 0 ? "#22c55e" : "#ef4444" }}>
                      {msg.scoreImpact >= 0 ? "+" : ""}{msg.scoreImpact} pts
                    </span>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={i} className={`message ${msg.sender}`}>
              <div className="message-bubble">{msg.text}</div>
            </div>
          );
        })}

        {isTyping && (
          <div className="message client">
            <div className="message-bubble typing-indicator"><span /><span /><span /></div>
          </div>
        )}
      </div>

      {!ended ? (
        <>
          <div className="chat-input-area">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Escribe tu respuesta de ventas..."
              className="chat-input"
              disabled={isTyping}
              autoComplete="off"
            />
            <button onClick={handleSend} className="btn-send" disabled={isTyping}>
              {isTyping ? "..." : "Enviar"}
            </button>
        </div>
          <div style={{ padding: "0 16px 16px" }}>
            <button
              onClick={handleAbortTraining}
              className="btn-back"
              style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8" }}
            >
              ← Abandonar entrenamiento
            </button>
          </div>
        </>
      ) : (
        <div className={`result-card ${endType}`}>
          <h3>{result.title}</h3>
          <p>{result.message}</p>
          {dealValue > 0 && !isInterviewScenario && (
            <div style={{
              background: endType === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${endType === "success" ? "#22c55e44" : "#ef444444"}`,
              borderRadius: "12px", padding: "14px 18px", margin: "12px 0",
              textAlign: "center",
            }}>
              {endType === "success" ? (
                <>
                  <div style={{ color: "#22c55e", fontSize: "13px", marginBottom: "4px" }}>🎉 Comisión ganada</div>
                  <div style={{ color: "#22c55e", fontSize: "36px", fontWeight: "900", lineHeight: 1 }}>+{commission.toLocaleString("es-ES")}€</div>
                  <div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>sobre una venta de {dealValue.toLocaleString("es-ES")}€</div>
                </>
              ) : (
                <>
                  <div style={{ color: "#ef4444", fontSize: "13px", marginBottom: "4px" }}>📉 Comisión perdida</div>
                  <div style={{ color: "#ef4444", fontSize: "36px", fontWeight: "900", lineHeight: 1 }}>-{commission.toLocaleString("es-ES")}€</div>
                  <div style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>no cerrarás esta venta de {dealValue.toLocaleString("es-ES")}€</div>
                </>
              )}
            </div>
          )}
          <p className="result-xp">+{result.xpEarned} XP &nbsp;|&nbsp; Puntuación final: {score}</p>
          <button
            onClick={() => setShowValidation(true)}
            className="btn-back"
            style={{ background: "#6366f1", marginBottom: "10px" }}
          >
            ⭐ Valorar esta sesión
          </button>
          <button onClick={handleFinish} className="btn-back" style={{ background: "transparent", border: "1px solid #334155", color: "#64748b" }}>
            Ahora no → Volver al menú
          </button>
        </div>
      )}

      {showValidation && (
        <ValidationFeedback
          userId={userId}
          conversationId={conversationData.id}
          scoreFinal={score}
          endType={endType || "failure"}
          onComplete={handleValidationComplete}
        />
      )}
    </div>
  );
}
