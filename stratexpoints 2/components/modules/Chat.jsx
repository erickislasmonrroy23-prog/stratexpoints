// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Asistente Chat IA
// ══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, SectionHeader, Avatar, Spinner, T,
} from "../ui/index.jsx";
import { color, calc, fmt, aiService } from "../../utils/helpers.js";

// ── QUICK PROMPTS ─────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon:"🏥", text:"¿Cuál es el estado general de los OKRs?" },
  { icon:"📊", text:"¿Qué KPIs están en zona roja?" },
  { icon:"🚀", text:"¿Qué iniciativas están en riesgo de no completarse?" },
  { icon:"💡", text:"Dame 3 recomendaciones para mejorar el avance" },
  { icon:"📅", text:"¿Qué vence en los próximos 30 días?" },
  { icon:"🎯", text:"¿Cómo está el progreso del BSC por perspectiva?" },
  { icon:"💰", text:"¿Cómo está la ejecución presupuestal?" },
  { icon:"🔮", text:"¿Qué KPIs no alcanzarán su meta este período?" },
];

// ── SYSTEM PROMPT ─────────────────────────────────────────────
const buildSystemPrompt = (ctx) => `Eres StratexAI, el asistente estratégico inteligente de ${ctx.org}.
Eres experto en gestión estratégica hospitalaria, BSC, OKRs, KPIs e iniciativas.

CONTEXTO ACTUAL DE LA ORGANIZACIÓN:
- Período: ${ctx.period}
- Avance OKR global: ${ctx.okrAvg}%
- KPIs totales: ${ctx.totalKPIs} (${ctx.greenKPIs} verde, ${ctx.yellowKPIs} amarillo, ${ctx.redKPIs} rojo)
- Iniciativas activas: ${ctx.activeInits}
- Iniciativas vencidas: ${ctx.overdueInits}

OKRs PRINCIPALES:
${ctx.okrList}

KPIs CRÍTICOS (rojo):
${ctx.criticalKPIs}

INSTRUCCIONES:
- Responde en español, de forma concisa y ejecutiva
- Usa datos específicos del contexto cuando sea relevante
- Si no tienes datos suficientes, dilo claramente
- Usa emojis con moderación para claridad
- Formato: párrafos cortos o listas cuando sea apropiado
- Máximo 300 palabras por respuesta salvo que se pida más detalle`;

// ── MESSAGE BUBBLE ────────────────────────────────────────────
const MessageBubble = memo(({ message }) => {
  const isUser = message.role === "user";
  const isLoading = message.loading;

  return (
    <div style={{
      display:        "flex",
      gap:            10,
      flexDirection:  isUser ? "row-reverse" : "row",
      alignItems:     "flex-start",
      marginBottom:   14,
      animation:      "fadeIn .2s ease",
    }}>
      {/* Avatar */}
      {isUser ? (
        <Avatar name="Usuario" size={32}/>
      ) : (
        <div style={{ width:32, height:32, borderRadius:"50%",
          background:`linear-gradient(135deg,${T.teal},${T.navy})`,
          display:"flex", alignItems:"center", justifyContent:"center",
          flexShrink:0, fontSize:16 }}>
          🤖
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth:     "75%",
        padding:      "10px 14px",
        borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        background:   isUser
          ? `linear-gradient(135deg,${T.teal},${T.navyL})`
          : T.white,
        color:        isUser ? "#fff" : T.navy,
        fontSize:     12.5,
        lineHeight:   1.6,
        boxShadow:    "0 2px 8px rgba(0,0,0,.08)",
        border:       isUser ? "none" : `1px solid ${T.bdr}`,
      }}>
        {isLoading ? (
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <Spinner size={14} dark={false}/>
            <span style={{ fontSize:12, color:T.tL }}>
              StratexAI está pensando…
            </span>
          </div>
        ) : (
          <div style={{ whiteSpace:"pre-wrap" }}>
            {message.content}
          </div>
        )}

        {/* Timestamp */}
        {!isLoading && message.timestamp && (
          <div style={{ fontSize:9.5, marginTop:5,
            color:isUser ? "rgba(255,255,255,.5)" : T.tL,
            textAlign:"right" }}>
            {new Date(message.timestamp).toLocaleTimeString("es-MX",
              { hour:"2-digit", minute:"2-digit" })}
          </div>
        )}
      </div>
    </div>
  );
});

// ── SUGGESTED PROMPTS ─────────────────────────────────────────
const SuggestedPrompts = memo(({ onSelect }) => (
  <div>
    <div style={{ fontSize:10.5, fontWeight:800, color:T.tL,
      letterSpacing:".08em", marginBottom:10, textAlign:"center" }}>
      PREGUNTAS SUGERIDAS
    </div>
    <div style={{ display:"flex", flexWrap:"wrap", gap:7,
      justifyContent:"center" }}>
      {QUICK_PROMPTS.map((p, i) => (
        <button key={i} onClick={() => onSelect(p.text)}
          style={{
            padding:    "6px 13px",
            borderRadius:20,
            fontSize:   11.5,
            fontWeight: 600,
            border:     `1.5px solid ${T.bdr}`,
            background: T.white,
            color:      T.tM,
            cursor:     "pointer",
            transition: "all .15s",
            display:    "flex",
            alignItems: "center",
            gap:        5,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = T.teal;
            e.currentTarget.style.color       = T.teal;
            e.currentTarget.style.background  = `${T.teal}08`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = T.bdr;
            e.currentTarget.style.color       = T.tM;
            e.currentTarget.style.background  = T.white;
          }}>
          <span>{p.icon}</span>
          <span>{p.text}</span>
        </button>
      ))}
    </div>
  </div>
));

// ── MAIN CHAT ─────────────────────────────────────────────────
const Chat = memo(({ onNavigate }) => {
  const { kpis, okrs, initiatives, organization } = useApp();

  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [showClear, setShowClear] = useState(false);
  const bottomRef = useRef();
  const inputRef  = useRef();

  // Build context for system prompt
  const ctx = {
    org:         organization?.name || "Hospital Punta Médica",
    period:      organization?.period || "Q1-Q2 2025",
    okrAvg:      calc.avgProgress(okrs),
    totalKPIs:   kpis.length,
    greenKPIs:   kpis.filter(k=>k.trafficLight==="green").length,
    yellowKPIs:  kpis.filter(k=>k.trafficLight==="yellow").length,
    redKPIs:     kpis.filter(k=>k.trafficLight==="red").length,
    activeInits: initiatives.filter(i=>i.status==="in_progress").length,
    overdueInits:initiatives.filter(i=>
      calc.daysRemaining(i.endDate)<0&&i.status!=="completed").length,
    okrList:     okrs.map(o=>`${o.code}: ${o.objective} (${o.progress}%)`).join("\n"),
    criticalKPIs:kpis.filter(k=>k.trafficLight==="red")
      .map(k=>`${k.name}: ${k.value}${k.unit}`).join("\n") || "Ninguno",
  };

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  // Welcome message
  useEffect(() => {
    setMessages([{
      id:        "welcome",
      role:      "assistant",
      content:   `¡Hola! Soy StratexAI 🤖, tu asistente estratégico para ${ctx.org}.\n\nTengo acceso al contexto actual de tu plataforma:\n• ${okrs.length} OKRs activos (${ctx.okrAvg}% avance global)\n• ${kpis.length} KPIs monitoreados (${ctx.redKPIs} en zona roja)\n• ${initiatives.filter(i=>i.status==="in_progress").length} iniciativas en progreso\n\n¿En qué puedo ayudarte hoy?`,
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  const sendMessage = useCallback(async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;

    setInput("");
    const userMsg = {
      id:        Date.now().toString(),
      role:      "user",
      content:   userText,
      timestamp: new Date().toISOString(),
    };

    const loadingMsg = {
      id:      "loading",
      role:    "assistant",
      loading: true,
    };

    setMessages(p => [...p, userMsg, loadingMsg]);
    setLoading(true);

    try {
      // Build conversation history for API
      const history = messages
        .filter(m => !m.loading && m.id !== "welcome")
        .map(m => ({ role:m.role, content:m.content }));

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({
          model:      "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system:     buildSystemPrompt(ctx),
          messages:   [
            ...history,
            { role:"user", content:userText },
          ],
        }),
      });

      const data = await response.json();
      const assistantText = data.content?.[0]?.text
        || "Lo siento, no pude procesar tu consulta.";

      setMessages(p => [
        ...p.filter(m => m.id !== "loading"),
        {
          id:        Date.now().toString() + "_a",
          role:      "assistant",
          content:   assistantText,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages(p => [
        ...p.filter(m => m.id !== "loading"),
        {
          id:      Date.now().toString() + "_err",
          role:    "assistant",
          content: "⚠️ No pude conectarme con la IA. Verifica que VITE_ANTHROPIC_KEY esté configurada en tu archivo .env.local",
          timestamp:new Date().toISOString(),
        },
      ]);
    }
    setLoading(false);
    inputRef.current?.focus();
  }, [input, loading, messages, ctx]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id:        "welcome-new",
      role:      "assistant",
      content:   "Chat reiniciado. ¿En qué puedo ayudarte? 🤖",
      timestamp: new Date().toISOString(),
    }]);
    setShowClear(false);
  };

  return (
    <div className="sp-page" style={{ height:"calc(100vh - 120px)",
      display:"flex", flexDirection:"column" }}>
      <SectionHeader
        title="💬 Asistente Estratégico"
        subtitle="StratexAI · Consultas en lenguaje natural sobre tu plataforma"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="ghost" onClick={() => setShowClear(true)}>
              🗑️ Limpiar
            </Btn>
            <Btn variant="secondary" onClick={() => onNavigate("ai")}>
              🤖 IA Estratégica
            </Btn>
          </div>
        }
      />

      {/* Chat area */}
      <Card sx={{ flex:1, display:"flex", flexDirection:"column",
        overflow:"hidden", minHeight:0 }}>

        {/* Context banner */}
        <div style={{ padding:"8px 16px", background:`${T.navy}08`,
          borderBottom:`1px solid ${T.bdr}`,
          display:"flex", gap:12, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:10, fontWeight:800, color:T.tL,
            letterSpacing:".06em" }}>CONTEXTO:</span>
          {[
            { l:`${ctx.okrAvg}% OKR`, c:color.progressBar(ctx.okrAvg) },
            { l:`${ctx.redKPIs} KPIs rojos`, c:T.red                   },
            { l:`${ctx.activeInits} activas`, c:T.teal                  },
          ].map((b, i) => (
            <span key={i} style={{ fontSize:10, fontWeight:700,
              padding:"2px 8px", borderRadius:20,
              background:`${b.c}15`, color:b.c }}>
              {b.l}
            </span>
          ))}
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 18px",
          minHeight:0 }}>
          {messages.length <= 1 && (
            <div style={{ marginBottom:24, marginTop:8 }}>
              <SuggestedPrompts onSelect={sendMessage}/>
            </div>
          )}
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg}/>
          ))}
          <div ref={bottomRef}/>
        </div>

        {/* Input area */}
        <div style={{ padding:"12px 16px",
          borderTop:`1px solid ${T.bdr}`,
          background:T.white }}>
          {/* Quick prompts shortcut */}
          {messages.length > 1 && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap",
              marginBottom:10 }}>
              {QUICK_PROMPTS.slice(0, 4).map((p, i) => (
                <button key={i} onClick={() => sendMessage(p.text)}
                  disabled={loading}
                  style={{ padding:"3px 9px", borderRadius:20, fontSize:10.5,
                    border:`1px solid ${T.bdr}`, background:T.bg,
                    color:T.tM, cursor:"pointer", transition:"all .12s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.teal}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.bdr}>
                  {p.icon} {p.text.substring(0, 28)}…
                </button>
              ))}
            </div>
          )}

          <div style={{ display:"flex", gap:9, alignItems:"flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta sobre OKRs, KPIs, iniciativas o cualquier aspecto estratégico… (Enter para enviar)"
              disabled={loading}
              style={{
                flex:         1,
                padding:      "10px 13px",
                borderRadius: 12,
                border:       `1.5px solid ${T.bdr}`,
                fontSize:     12.5,
                color:        T.navy,
                background:   T.white,
                resize:       "none",
                minHeight:    44,
                maxHeight:    120,
                outline:      "none",
                fontFamily:   "var(--font-body)",
                lineHeight:   1.5,
                transition:   "border-color .15s",
              }}
              onFocus={e => e.target.style.borderColor = T.teal}
              onBlur={e  => e.target.style.borderColor = T.bdr}
            />
            <Btn variant="primary" onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              sx={{ height:44, minWidth:44, borderRadius:12,
                background:`linear-gradient(135deg,${T.teal},${T.navy})` }}>
              {loading ? <Spinner size={14}/> : "↑"}
            </Btn>
          </div>
          <div style={{ fontSize:10, color:T.tL, marginTop:6,
            textAlign:"center" }}>
            StratexAI · Powered by Claude · Enter para enviar · Shift+Enter para nueva línea
          </div>
        </div>
      </Card>

      {/* Clear confirm */}
      {showClear && (
        <div style={{ position:"fixed", inset:0,
          background:"rgba(0,0,0,.4)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:9999 }}>
          <Card sx={{ padding:"20px 24px", maxWidth:360, width:"90%" }}>
            <div style={{ fontSize:14, fontWeight:800, color:T.navy,
              marginBottom:8 }}>
              ¿Limpiar conversación?
            </div>
            <div style={{ fontSize:12, color:T.tM, marginBottom:16 }}>
              Se perderá el historial del chat actual.
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <Btn variant="ghost" onClick={() => setShowClear(false)}>
                Cancelar
              </Btn>
              <Btn variant="danger" onClick={clearChat}>
                Limpiar
              </Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
});

export default Chat;
