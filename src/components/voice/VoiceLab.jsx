import { useMemo, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";

const BrowserSpeechRecognition =
  typeof window !== "undefined"
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

const PRESETS = {
  "closer-b2c": {
    label: "Closer B2C - Objecion de precio",
    salesRole: "closer",
    scenarioContext: {
      buyerPersona:
        "Eres un comprador B2C exigente, comparas opciones rapido y te preocupa pagar de mas sin una garantia clara.",
      context:
        "Llamada de ventas de 10 minutos para decidir si avanzas o no con la compra.",
      objection:
        "Me interesa, pero lo veo caro para lo que ofreceis.",
    },
  },
  "manager-b2b": {
    label: "Sales Manager B2B - Competencia",
    salesRole: "setter",
    scenarioContext: {
      buyerPersona:
        "Eres Sales Manager en una empresa B2B de 70 personas. Eres racional, orientado a ROI y tienes una herramienta competidora en uso.",
      context:
        "Reunion corta de evaluacion para entender si merece una demo de decision.",
      objection:
        "Ya usamos otra solucion. No tengo claro que aportais distinto.",
    },
  },
  "interview-mode": {
    label: "Entrevista comercial - Presion real",
    salesRole: "closer",
    scenarioContext: {
      buyerPersona:
        "Eres hiring manager y evaluás comunicacion bajo presion. Cortas respuestas largas y buscas ejemplos concretos.",
      context:
        "Entrevista final de 15 minutos para un rol comercial.",
      objection:
        "Tu CV no prueba cierres complejos. Convenceme en 60 segundos.",
    },
  },
};

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function VoiceLab({ onClose, salesRole = "setter" }) {
  const [presetId, setPresetId] = useState("closer-b2c");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");
  const [error, setError] = useState("");
  const [lastAudioDataUrl, setLastAudioDataUrl] = useState("");

  const recorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const preset = useMemo(() => PRESETS[presetId], [presetId]);

  const [conversationHistory, setConversationHistory] = useState(() => [
    { role: "user", content: "[INICIO DE SIMULACION DE VOZ]" },
    {
      role: "assistant",
      content: JSON.stringify({
        clientMessage: PRESETS["closer-b2c"].scenarioContext.objection,
        feedback: "",
        matchType: "nomatch",
        scoreImpact: 0,
        technique: "",
        isEndNode: false,
        endType: null,
      }),
    },
  ]);

  const resetSession = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setMessages([{ sender: "client", text: preset.scenarioContext.objection }]);
    setFeedback("");
    setLastTranscript("");
    setTurnCount(0);
    setError("");
    setLastAudioDataUrl("");
    setConversationHistory([
      { role: "user", content: "[INICIO DE SIMULACION DE VOZ]" },
      {
        role: "assistant",
        content: JSON.stringify({
          clientMessage: preset.scenarioContext.objection,
          feedback: "",
          matchType: "nomatch",
          scoreImpact: 0,
          technique: "",
          isEndNode: false,
          endType: null,
        }),
      },
    ]);
  };

  const processTextTurn = async (userText) => {
    const normalizedText = String(userText || "").trim();
    if (!normalizedText) {
      throw new Error("No se detecto texto de voz. Repite mas despacio o mas cerca del microfono.");
    }

    setLastTranscript(normalizedText);
    setMessages((prev) => [...prev, { sender: "user", text: normalizedText }]);

    const newHistory = [...conversationHistory, { role: "user", content: normalizedText }];
    const roleForRequest = preset?.salesRole || salesRole;

    const { data: aiData, error: aiError } = await supabase.functions.invoke("chat-ai", {
      body: {
        conversationHistory: newHistory,
        scenarioContext: preset.scenarioContext,
        salesRole: roleForRequest,
        turnCount: turnCount + 1,
      },
    });

    if (aiError) throw new Error(aiError.message || "Error en chat-ai");
    if (!aiData?.clientMessage) throw new Error("chat-ai no devolvio clientMessage");

    setFeedback(aiData.feedback || "");
    setMessages((prev) => [...prev, { sender: "client", text: aiData.clientMessage }]);
    setConversationHistory([...newHistory, { role: "assistant", content: JSON.stringify(aiData) }]);
    setTurnCount((prev) => prev + 1);

    const { data: ttsData, error: ttsError } = await supabase.functions.invoke("text-to-speech", {
      body: {
        text: aiData.clientMessage,
        voiceId: "EXAVITQu4vr4xnSDxMaL",
        modelId: "eleven_multilingual_v2",
      },
    });

    if (ttsError) throw new Error(ttsError.message || "Error en text-to-speech");
    if (!ttsData?.audioBase64) throw new Error("No llego audio desde text-to-speech");

    const mimeType = ttsData.mimeType || "audio/mpeg";
    const dataUrl = `data:${mimeType};base64,${ttsData.audioBase64}`;
    setLastAudioDataUrl(dataUrl);

    const player = new Audio(dataUrl);
    player.play().catch(() => {
      // Si el navegador bloquea autoplay, queda disponible el reproductor manual.
    });
  };

  const startRecording = async () => {
    setError("");
    setLastAudioDataUrl("");

    if (BrowserSpeechRecognition) {
      try {
        const recognition = new BrowserSpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = "es-ES";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = async (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript || "";
          setIsProcessing(true);
          setError("");
          try {
            await processTextTurn(transcript);
          } catch (err) {
            setError(String(err?.message || err));
          } finally {
            setIsProcessing(false);
          }
        };

        recognition.onerror = (event) => {
          setError(`Error de reconocimiento de voz: ${String(event?.error || "desconocido")}`);
        };

        recognition.onend = () => {
          setIsRecording(false);
          recognitionRef.current = null;
        };

        recognition.start();
        setIsRecording(true);
        return;
      } catch (err) {
        setError(`No se pudo iniciar el reconocimiento de voz del navegador: ${String(err?.message || err)}`);
        return;
      }
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no soporta grabacion de audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError(`No se pudo iniciar el microfono: ${String(err?.message || err)}`);
    }
  };

  const stopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setIsRecording(false);

    const audioBlob = await new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        resolve(blob);
      };
      recorder.stop();
    });

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    await processAudioTurn(audioBlob);
  };

  const processAudioTurn = async (audioBlob) => {
    setIsProcessing(true);
    setError("");

    try {
      const audioBase64 = await blobToBase64(audioBlob);

      const { data: sttData, error: sttError } = await supabase.functions.invoke("speech-to-text", {
        body: {
          audioBase64,
          mimeType: audioBlob.type || "audio/webm",
          language: "es",
        },
      });

      if (sttError) throw new Error(sttError.message || "Error en speech-to-text");
      if (!sttData?.text) throw new Error("No se pudo transcribir el audio");

      const userText = String(sttData.text).trim();
      await processTextTurn(userText);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setIsProcessing(false);
    }
  };

  const canReset = !isRecording && !isProcessing;

  return (
    <div className="voice-lab-overlay">
      <div className="voice-lab-modal">
        <div className="voice-lab-header">
          <h3>Voice Lab Hiperrealista</h3>
          <button className="voice-lab-close" onClick={onClose}>Cerrar</button>
        </div>

        <p className="voice-lab-subtitle">
          Prueba de llamada real: hablas, se transcribe (navegador o fallback), la IA objeta y te responde con voz.
        </p>

        <div className="voice-lab-controls">
          <label>
            Escenario
            <select
              value={presetId}
              onChange={(e) => {
                setPresetId(e.target.value);
              }}
              disabled={isRecording || isProcessing}
            >
              {Object.entries(PRESETS).map(([id, item]) => (
                <option key={id} value={id}>{item.label}</option>
              ))}
            </select>
          </label>

          <div className="voice-lab-buttons">
            <button onClick={startRecording} disabled={isRecording || isProcessing}>
              {isProcessing ? "Procesando..." : BrowserSpeechRecognition ? "Hablar respuesta" : "Grabar respuesta"}
            </button>
            <button onClick={stopRecording} disabled={!isRecording || isProcessing}>
              Detener
            </button>
            <button onClick={resetSession} disabled={!canReset}>
              Reiniciar
            </button>
          </div>
        </div>

        {error ? <div className="voice-lab-error">{error}</div> : null}

        <div className="voice-lab-meta">
          <span>Turnos: {turnCount}</span>
          <span>Estado microfono: {isRecording ? "grabando" : "listo"}</span>
          <span>Modo STT: {BrowserSpeechRecognition ? "navegador (sin API extra)" : "edge function"}</span>
        </div>

        <div className="voice-lab-chat">
          {messages.length === 0 ? (
            <p className="voice-lab-empty">
              Pulsa "Reiniciar" para cargar objecion inicial o empieza grabando una respuesta.
            </p>
          ) : (
            messages.map((message, index) => (
              <div key={`${message.sender}-${index}`} className={`voice-msg voice-msg-${message.sender}`}>
                <strong>{message.sender === "user" ? "Tu" : "Cliente"}:</strong> {message.text}
              </div>
            ))
          )}
        </div>

        {lastTranscript ? (
          <div className="voice-lab-transcript">
            <strong>Tu ultima transcripcion:</strong> {lastTranscript}
          </div>
        ) : null}

        {feedback ? (
          <div className="voice-lab-feedback">
            <strong>Feedback tecnico:</strong> {feedback}
          </div>
        ) : null}

        {lastAudioDataUrl ? (
          <div className="voice-lab-audio">
            <audio controls src={lastAudioDataUrl} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
