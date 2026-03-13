import { useState, useRef } from "react";

const C={navy:"#0B1F3A",navyL:"#1D3D6B",teal:"#0EA5A0",gold:"#C9A84C",blue:"#1558A8",violet:"#7c3aed",amber:"#92400e",red:"#c0392b",green:"#065f46",bg:"#f0f4f8",bdr:"#dde3ec",txt:"#1a2332",tM:"#4a5568",tL:"#8896a8",white:"#ffffff"};
const cl=(v,a,b)=>Math.min(b,Math.max(a,v));
const MO=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const ST={on_track:{l:"En curso",c:C.green,bg:"#d1fae5",bd:"#6ee7b7",i:"✅"},at_risk:{l:"En riesgo",c:C.amber,bg:"#fef3c7",bd:"#fcd34d",i:"⚠️"},completed:{l:"Completado",c:C.blue,bg:"#dbeafe",bd:"#93c5fd",i:"🏆"},not_started:{l:"Sin iniciar",c:C.tL,bg:"#f1f5f9",bd:"#b8c4d4",i:"⭕"}};

const AI=async(p,sys="Experto estratégico. Solo JSON válido.",mx=1200)=>{
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:mx,system:sys,messages:[{role:"user",content:p}]})});
  const d=await r.json();
  const t=d.content?.find(b=>b.type==="text")?.text||"{}";
  return JSON.parse(t.replace(/```json|```/g,"").trim());
};
const AItext=async(p,sys="Consultor estratégico experto.",mx=1500)=>{
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:mx,system:sys,messages:[{role:"user",content:p}]})});
  const d=await r.json();
  return d.content?.find(b=>b.type==="text")?.text||"";
};

const OKRS_INIT=[
  {id:"o1",code:"OBJ-1",ref:"F2",obj:"Aumentar admisiones de pacientes particulares",own:"Dir. Médica",prog:45,st:"at_risk",
   krs:[{id:"k1",t:"Incrementar admisiones particulares 15%",own:"Gte. Atención Médicos",tgt:15,un:"%",cur:8,st:"at_risk"},
        {id:"k2",t:"Campaña de marketing para particulares",own:"Gte. Comercial",tgt:100,un:"% impl",cur:60,st:"on_track"},
        {id:"k3",t:"Mejorar experiencia de admisión +10% retención",own:"Jefe Admisión",tgt:10,un:"%",cur:5,st:"at_risk"},
        {id:"k4",t:"Sistema evaluación satisfacción paciente",own:"Gte. Calidad",tgt:100,un:"% impl",cur:40,st:"at_risk"}],
   crit:[{l:"Ideal",v:"15%"},{l:"Bueno",v:"10%"},{l:"Regular",v:"5%"},{l:"Bajo",v:"<5%"}]},
  {id:"o2",code:"OBJ-2",ref:"F2",obj:"Aumentar admisiones de pacientes aseguradora",own:"Dir. Comercial",prog:55,st:"on_track",
   krs:[{id:"k5",t:"Incrementar admisiones aseguradora 20%",own:"Gte. Comercial",tgt:20,un:"%",cur:12,st:"on_track"},
        {id:"k6",t:"Convenios con 3 nuevas aseguradoras",own:"Dir. Comercial",tgt:3,un:"convenios",cur:2,st:"on_track"},
        {id:"k7",t:"Reducir tiempo verificación seguros 15%",own:"Jefe Admisión",tgt:15,un:"%",cur:8,st:"on_track"},
        {id:"k8",t:"Sistema seguimiento eficiencia seguros",own:"Gte. Calidad",tgt:100,un:"% impl",cur:30,st:"at_risk"}],
   crit:[{l:"Ideal",v:"20%"},{l:"Bueno",v:"15%"},{l:"Regular",v:"10%"},{l:"Bajo",v:"<10%"}]},
  {id:"o3",code:"OBJ-3",ref:"C1",obj:"Consolidar relación con pacientes y aseguradora",own:"Dir. Médica",prog:38,st:"at_risk",
   krs:[{id:"k9",t:"Aumentar satisfacción pacientes 15%",own:"Gte. Calidad",tgt:15,un:"%",cur:5,st:"at_risk"},
        {id:"k10",t:"2 eventos de formación del personal",own:"Gte. RRHH",tgt:2,un:"eventos",cur:1,st:"on_track"},
        {id:"k11",t:"Sistema seguimiento post-admisión",own:"Jefe Admisión",tgt:100,un:"% impl",cur:20,st:"at_risk"}],
   crit:[{l:"Ideal",v:"+15%"},{l:"Bueno",v:"+10%"},{l:"Regular",v:"+5%"},{l:"Bajo",v:"<5%"}]},
  {id:"o4",code:"OBJ-4",ref:"P8",obj:"Evaluar el crecimiento en las admisiones",own:"Dir. Admon y Finanzas",prog:62,st:"on_track",
   krs:[{id:"k12",t:"Informe trimestral de crecimiento",own:"Dir. Admon",tgt:4,un:"informes",cur:1,st:"on_track"},
        {id:"k13",t:"2 sesiones adicionales de capacitación",own:"Gte. RRHH",tgt:2,un:"sesiones",cur:2,st:"completed"},
        {id:"k14",t:"Evaluar incremento 30% admisiones totales",own:"Dir. Comercial",tgt:30,un:"%",cur:18,st:"on_track"}],
   crit:[{l:"Ideal",v:"30%"},{l:"Bueno",v:"20%"},{l:"Regular",v:"10%"},{l:"Bajo",v:"<10%"}]},
];
const BSC_P=[
  {id:"fin",ico:"💰",l:"Financiera",c:C.green,bg:"#ecfdf5",bd:"#a7f3d0",objs:[{code:"F2",t:"Crecimiento admisiones particulares +15% y aseguradora +20%",kpis:["# admisiones/mes","% crecimiento YoY"],p:"Cliente"},{code:"F5",t:"Cumplir ingresos proyectados año 1",kpis:["Ingresos vs presupuesto","% costos"],p:"Productividad"},{code:"F6",t:"EBITDA positivo en tercer año",kpis:["EBITDA","Margen operativo"],p:"Productividad"},{code:"F1",t:"Implementar BRAINLAB y cirugía robótica",kpis:["ROI BRAINLAB","# cirugías"],p:"Expansión"},{code:"F3",t:"Implementar proyecto de Oncología",kpis:["# pacientes oncología","Ingresos"],p:"Expansión"}]},
  {id:"cli",ico:"🏥",l:"Clientes",c:C.blue,bg:"#eff6ff",bd:"#bfdbfe",objs:[{code:"C1",t:"Altos estándares satisfacción médicos y pacientes",kpis:["NPS pacientes","NPS médicos"],p:"Cliente"},{code:"C3",t:"Servicio premium personalizado",kpis:["Score satisfacción","Tiempo espera"],p:"Cliente"},{code:"C7",t:"Fidelización de médicos y pacientes",kpis:["Retención médicos","Retención pacientes"],p:"Cliente"},{code:"C5",t:"Captar médicos a consultorios y especialidades",kpis:["# médicos","Ocupación"],p:"Expansión"}]},
  {id:"pro",ico:"⚙️",l:"Procesos",c:C.violet,bg:"#faf5ff",bd:"#e9d5ff",objs:[{code:"P1",t:"Sistema hospitalario TI para gestión eficiente",kpis:["Uptime sistema","# incidentes"],p:"Productividad"},{code:"P5",t:"Modelo de calidad NOM y estándares nacionales",kpis:["% cumplimiento NOM","Certificaciones"],p:"Productividad"},{code:"P7",t:"Control interno y gestión de riesgos COSO/ISO",kpis:["# riesgos mitigados","Efectividad"],p:"Productividad"},{code:"P8",t:"Implementar KRIs y KPIs estratégicos",kpis:["# KRIs activos","# KPIs activos"],p:"Productividad"}]},
  {id:"apr",ico:"🌱",l:"Aprendizaje",c:C.red,bg:"#fef2f2",bd:"#fecaca",objs:[{code:"A1",t:"Recursos humanos calificados y actualizados",kpis:["% personal cert.","Horas capac."],p:"Productividad"},{code:"A7",t:"Cultura de Calidad y Seguridad del Paciente",kpis:["# eventos adversos","Score cultura"],p:"Cliente"},{code:"A9",t:"Tecnología médica de punta adquirida",kpis:["# equipos","Disponibilidad"],p:"Expansión"},{code:"A13",t:"Cultura de compañerismo y pertenencia",kpis:["eNPS empleados","Tasa rotación"],p:"Cliente"}]},
];
const BOWL_INIT=[
  {l:"Admisiones particulares +15%",tgt:15,un:"%",base:0,mon:[null,null,8,null,null,null,null,null,null,null,null,null]},
  {l:"Admisiones aseguradora +20%",tgt:20,un:"%",base:0,mon:[null,null,12,null,null,null,null,null,null,null,null,null]},
  {l:"NPS Pacientes ≥85 pts",tgt:85,un:"",base:70,mon:[null,null,72,null,null,null,null,null,null,null,null,null]},
  {l:"Implementación Sistema TI",tgt:100,un:"%",base:20,mon:[null,null,35,null,null,null,null,null,null,null,null,null]},
];
const IM_LIST=["Sistema TI RTR3S","Modelo calidad NOM","Selección y cultura","KRIs y KPIs","Marketing convenios"];
const OA_LIST=["Admisiones +15%","Aseguradora +20%","NPS ≥85","TI 100%"];
const RS_LIST=["Dir. Médica","Dir. Comercial","Dir. Admon","Gte. Calidad"];
const CORR_IM_OA=[["p","s","",""],["p","p","s","s"],["","","p",""],["","s","s","p"],["s","p","","s"]];
const CORR_IM_RS=[["p","","s","s"],["s","p","","s"],["","","p",""],["s","","s","p"],["","p","s",""]];

// ── SHARED UI ─────────────────────────────────────────────
const Bar=({v,h=7,c:oc})=>{const p=cl(Math.round(v),0,100),c=oc||(p>=75?"#10b981":p>=45?"#f59e0b":"#f43f5e");return <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{flex:1,height:h,background:"#e6ecf5",borderRadius:h,overflow:"hidden"}}><div style={{height:"100%",width:p+"%",background:c,borderRadius:h,transition:"width .5s"}}/></div><span style={{fontSize:10,fontWeight:800,color:c,minWidth:28,textAlign:"right"}}>{p}%</span></div>;};
const Chip=({s})=>{const m=ST[s]||ST.not_started;return <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"1px 7px",borderRadius:20,background:m.bg,color:m.c,border:"1px solid "+m.bd,fontSize:9.5,fontWeight:700}}>{m.i} {m.l}</span>;};
const Card=({children,sx={}})=><div style={{background:C.white,borderRadius:12,border:"1px solid "+C.bdr,boxShadow:"0 2px 12px rgba(10,22,40,.06)",...sx}}>{children}</div>;
const Btn=({children,onClick,sx={},variant="primary",disabled})=>{const s={primary:{background:C.teal,color:C.white,border:"none"},secondary:{background:"transparent",color:C.teal,border:"1px solid "+C.teal},dark:{background:C.navy,color:C.white,border:"none"},gold:{background:C.gold,color:C.white,border:"none"}};return <button onClick={onClick} disabled={disabled} style={{padding:"7px 16px",borderRadius:8,fontSize:12,fontWeight:700,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.6:1,transition:"opacity .2s",...(s[variant]||s.primary),...sx}}>{children}</button>;};
const Spinner=()=><span style={{display:"inline-block",width:14,height:14,border:"2px solid rgba(255,255,255,.4)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .8s linear infinite",verticalAlign:"middle"}}/>;
const Modal=({title,children,onClose})=><div style={{position:"fixed",inset:0,background:"rgba(11,31,58,.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}><div style={{background:C.white,borderRadius:16,width:"100%",maxWidth:660,maxHeight:"90vh",overflow:"auto",boxShadow:"0 24px 80px rgba(0,0,0,.3)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid "+C.bdr,position:"sticky",top:0,background:C.white,borderRadius:"16px 16px 0 0"}}><span style={{fontWeight:800,fontSize:14,color:C.navy}}>{title}</span><button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:C.tM,lineHeight:1}}>×</button></div><div style={{padding:20}}>{children}</div></div></div>;

const Logo=({size=26})=><div style={{display:"flex",alignItems:"center",gap:8}}><svg width={size} height={size} viewBox="0 0 32 32" fill="none"><polygon points="16,1 22,7 16,13 10,7" fill={C.teal}/><polygon points="7,11 13,17 7,23 1,17" fill={C.blue}/><polygon points="25,11 31,17 25,23 19,17" fill={C.gold}/><polygon points="16,20 23,27 16,34 9,27" fill={C.navy}/><line x1="16" y1="13" x2="9" y2="15.5" stroke={C.teal} strokeWidth="1.5" opacity=".5"/><line x1="16" y1="13" x2="23" y2="15.5" stroke={C.teal} strokeWidth="1.5" opacity=".5"/><line x1="7" y1="23" x2="12.5" y2="24.5" stroke={C.blue} strokeWidth="1.5" opacity=".5"/><line x1="25" y1="23" x2="19.5" y2="24.5" stroke={C.gold} strokeWidth="1.5" opacity=".5"/></svg><div><div style={{fontSize:size*.52,fontWeight:900,letterSpacing:"-0.5px",color:C.navy,lineHeight:1.1}}><span>Strat</span><span style={{color:C.teal}}>ex</span><span>Points</span></div><div style={{fontSize:size*.24,letterSpacing:"1.5px",color:C.blue,fontWeight:700,lineHeight:1,textTransform:"uppercase"}}>Execution Platform</div></div></div>;

// ── DOCUMENT AI ───────────────────────────────────────────
const DocReader=()=>{
  const [docs,setDocs]=useState([]);
  const [active,setActive]=useState(null);
  const [loading,setLoading]=useState(false);
  const [chat,setChat]=useState([]);
  const [q,setQ]=useState("");
  const fileRef=useRef();
  const readB64=(f)=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
  const readTxt=(f)=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsText(f);});
  const handleFiles=async(e)=>{
    for(const file of [...e.target.files]){
      const ext=file.name.split(".").pop().toLowerCase();
      const isText=["txt","csv","md","json"].includes(ext);
      const content=isText?await readTxt(file):await readB64(file);
      const doc={id:Date.now()+Math.random(),name:file.name,ext,size:file.size,content,isText,summary:"",uploadedAt:new Date().toLocaleTimeString()};
      setDocs(p=>[...p,doc]);
      setLoading(true);
      try{
        const ctx=isText?`Documento:\n${content.substring(0,3500)}`:`Archivo "${file.name}" (${ext}). Analiza su propósito estratégico.`;
        const s=await AItext(`Analiza este documento y extrae: 1) Tipo 2) Objetivos principales 3) KPIs/métricas 4) Responsables 5) Períodos clave.\n${ctx}`,"Analista estratégico hospitalario. Español estructurado.",700);
        setDocs(p=>p.map(d=>d.id===doc.id?{...d,summary:s}:d));
      }catch(e){setDocs(p=>p.map(d=>d.id===doc.id?{...d,summary:"No se pudo analizar automáticamente."}:d));}
      setLoading(false);
    }
  };
  const ask=async()=>{
    if(!q.trim()||!active)return;
    const msg={role:"user",text:q};
    setChat(p=>[...p,msg]);setQ("");setLoading(true);
    const doc=docs.find(d=>d.id===active);
    const ctx=doc.isText?`Documento "${doc.name}":\n${doc.content.substring(0,3000)}`:`Documento: "${doc.name}". Resumen: ${doc.summary}`;
    try{const a=await AItext(`${ctx}\n\nPregunta: ${q}`,"Experto en gestión estratégica hospitalaria. Preciso y citando datos.",1000);setChat(p=>[...p,{role:"assistant",text:a}]);}
    catch(e){setChat(p=>[...p,{role:"assistant",text:"Error al procesar la consulta."}]);}
    setLoading(false);
  };
  const extractKPIs=async()=>{
    if(!active)return;setLoading(true);
    const doc=docs.find(d=>d.id===active);
    const ctx=doc.isText?doc.content.substring(0,3500):doc.summary;
    try{const r=await AItext(`Extrae TODOS los KPIs, métricas e indicadores del siguiente documento. Responde como tabla markdown: | Indicador | Meta | Área | Frecuencia |\n\n${ctx}`,"Experto KPIs hospitalarios. Exhaustivo.",1200);setChat(p=>[...p,{role:"assistant",text:r}]);}catch(e){}
    setLoading(false);
  };
  const diagnose=async()=>{
    if(!active)return;setLoading(true);
    const doc=docs.find(d=>d.id===active);
    const ctx=doc.isText?doc.content.substring(0,3500):doc.summary;
    try{const r=await AItext(`Diagnóstico ejecutivo del documento:\n1. Fortalezas estratégicas\n2. Brechas críticas\n3. Riesgos identificados\n4. Top 3 acciones inmediatas\n5. Score madurez estratégica (0-100)\n\n${ctx}`,"Consultor Master Black Belt. Directo y ejecutivo.",1400);setChat(p=>[...p,{role:"assistant",text:r}]);}catch(e){}
    setLoading(false);
  };
  const fmtSz=(b)=>b>1048576?`${(b/1048576).toFixed(1)} MB`:b>1024?`${(b/1024).toFixed(0)} KB`:`${b} B`;
  const ico=(e)=>({pdf:"📄",xlsx:"📊",pptx:"📑",docx:"📝",csv:"📋",txt:"📃",json:"🔧"}[e]||"📁");
  return <div style={{padding:20}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
      <div><h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.navy}}>🤖 Lector de Documentos IA</h2><p style={{margin:"3px 0 0",fontSize:11.5,color:C.tM}}>Sube cualquier archivo — la IA extrae KPIs, diagnóstica y responde preguntas estratégicas</p></div>
      <Btn onClick={()=>fileRef.current.click()} variant="dark">+ Cargar Documentos</Btn>
      <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.pptx,.docx,.csv,.txt,.md,.json,.png,.jpg" onChange={handleFiles} style={{display:"none"}}/>
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {["PDF","Excel","PowerPoint","Word","CSV","TXT","JSON","Imágenes"].map(f=><span key={f} style={{padding:"3px 10px",borderRadius:20,background:C.teal+"15",color:C.teal,fontSize:10,fontWeight:700,border:"1px solid "+C.teal+"30"}}>{f}</span>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:14,minHeight:460}}>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {docs.length===0?<Card sx={{padding:30,textAlign:"center",border:"2px dashed "+C.bdr}}><div style={{fontSize:36,marginBottom:8}}>📂</div><div style={{fontWeight:700,color:C.tM,fontSize:12}}>Sin documentos</div><div style={{fontSize:11,color:C.tL,marginTop:4}}>Sube archivos para comenzar</div></Card>:
          docs.map(d=><Card key={d.id} sx={{padding:10,cursor:"pointer",border:active===d.id?"2px solid "+C.teal:"1px solid "+C.bdr}} onClick={()=>{setActive(d.id);setChat([]); }}>
            <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{fontSize:20}}>{ico(d.ext)}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:C.navy,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div>
                <div style={{fontSize:10,color:C.tL,marginTop:1}}>{fmtSz(d.size)} · {d.uploadedAt}</div>
                {d.summary&&<div style={{fontSize:10,color:C.green,marginTop:3,fontWeight:600}}>✓ Analizado</div>}
              </div>
              <button onClick={e=>{e.stopPropagation();setDocs(p=>p.filter(x=>x.id!==d.id));if(active===d.id)setActive(null);}} style={{background:"none",border:"none",cursor:"pointer",color:C.tL,fontSize:14}}>×</button>
            </div>
          </Card>)}
      </div>
      <Card sx={{display:"flex",flexDirection:"column"}}>
        {!active?<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,textAlign:"center"}}><div style={{fontSize:44,marginBottom:10}}>💬</div><div style={{fontWeight:700,color:C.tM,fontSize:13}}>Selecciona un documento</div><div style={{fontSize:11.5,color:C.tL,marginTop:5}}>La IA analizará su contenido estratégico</div></div>:<>
          <div style={{padding:"10px 14px",borderBottom:"1px solid "+C.bdr,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:11.5,fontWeight:700,color:C.navy,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{docs.find(d=>d.id===active)?.name}</span>
            <Btn onClick={extractKPIs} variant="secondary" sx={{fontSize:10,padding:"4px 10px"}} disabled={loading}>📊 KPIs</Btn>
            <Btn onClick={diagnose} variant="secondary" sx={{fontSize:10,padding:"4px 10px"}} disabled={loading}>🩺 Diagnóstico</Btn>
          </div>
          {docs.find(d=>d.id===active)?.summary&&chat.length===0&&<div style={{padding:14,background:C.teal+"08",borderBottom:"1px solid "+C.bdr}}><div style={{fontSize:10,fontWeight:700,color:C.teal,marginBottom:5,letterSpacing:".1em"}}>RESUMEN AUTOMÁTICO IA</div><div style={{fontSize:11,color:C.tM,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{docs.find(d=>d.id===active)?.summary}</div></div>}
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10,minHeight:180}}>
            {chat.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"86%",padding:"9px 13px",borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",background:m.role==="user"?C.navy:C.teal+"10",color:m.role==="user"?C.white:C.txt,fontSize:11.5,lineHeight:1.6,whiteSpace:"pre-wrap"}}>
                {m.role==="assistant"&&<div style={{fontSize:9,fontWeight:700,color:C.teal,marginBottom:3}}>🤖 StratexPoints IA</div>}
                {m.text}
              </div>
            </div>)}
            {loading&&<div style={{display:"flex",alignItems:"center",gap:6,color:C.tL,fontSize:11}}>
              {[0,.2,.4].map(d=><div key={d} style={{width:6,height:6,borderRadius:"50%",background:C.teal,animation:`pulse 1s ${d}s infinite`}}/>)}
              <span>Analizando...</span>
            </div>}
          </div>
          <div style={{padding:10,borderTop:"1px solid "+C.bdr,display:"flex",gap:8}}>
            <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&ask()} placeholder="Pregunta sobre el documento (p.ej. ¿Cuáles son los KPIs?)" style={{flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid "+C.bdr,fontSize:11.5,color:C.txt,outline:"none"}}/>
            <Btn onClick={ask} variant="dark" disabled={loading}>{loading?<Spinner/>:"↑"}</Btn>
          </div>
        </>}
      </Card>
    </div>
  </div>;
};

// ── EXPORT ────────────────────────────────────────────────
const ExportMod=({okrs,bowl})=>{
  const [loading,setLoading]=useState(null);
  const [done,setDone]=useState(null);
  const dlCSV=(csv,name)=>{const b=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=name;a.click();URL.revokeObjectURL(u);};
  const exportXL=async(type)=>{
    setLoading(type);await new Promise(r=>setTimeout(r,500));
    if(type==="okrs"){
      let c="CÓDIGO,OBJETIVO,RESPONSABLE,PROGRESO,ESTADO\n";
      okrs.forEach(o=>{c+=`"${o.code}","${o.obj}","${o.own}","${o.prog}%","${ST[o.st]?.l}"\n`;c+=`"","── KEY RESULTS ──","","",""\n`;o.krs.forEach(k=>c+=`"","${k.t}","${k.own}","${k.cur}/${k.tgt} ${k.un}","${Math.round((k.cur/k.tgt)*100)}%"\n`);c+=`"","","","",""\n`;});
      dlCSV(c,"StratexPoints_OKRs.csv");
    }else if(type==="kpis"){
      let c="INDICADOR,META,UNIDAD,BASE,"+MO.join(",")+",PROMEDIO\n";
      bowl.forEach(row=>{const vs=row.mon.filter(v=>v!=null);const avg=vs.length?(vs.reduce((a,b)=>a+b,0)/vs.length).toFixed(1):"-";c+=`"${row.l}","${row.tgt}","${row.un||"pts"}","${row.base}",${row.mon.map(v=>v==null?"":v).join(",")},${avg}\n`;});
      dlCSV(c,"StratexPoints_Bowling.csv");
    }else if(type==="bsc"){
      let c="PERSPECTIVA,CÓDIGO,OBJETIVO,KPI 1,KPI 2,PILAR\n";
      BSC_P.forEach(p=>p.objs.forEach(o=>c+=`"${p.l}","${o.code}","${o.t}","${o.kpis[0]||""}","${o.kpis[1]||""}","${o.p}"\n`));
      dlCSV(c,"StratexPoints_BSC.csv");
    }else if(type==="hoshin"){
      let c="INICIATIVA,"+OA_LIST.join(",")+","+RS_LIST.join(",")+"\n";
      IM_LIST.forEach((im,i)=>c+=`"${im}",${CORR_IM_OA[i].map(v=>v?v.toUpperCase():"").join(",")},${CORR_IM_RS[i].map(v=>v?v.toUpperCase():"").join(",")}\n`);
      dlCSV(c,"StratexPoints_Hoshin.csv");
    }
    setLoading(null);setDone(type);setTimeout(()=>setDone(null),3000);
  };
  const exportPDF=(type)=>{
    setLoading("pdf");
    const avg=Math.round(okrs.reduce((s,o)=>s+o.prog,0)/okrs.length);
    const H=`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#1a2332;padding:28px;font-size:12px}.hdr{background:#0B1F3A;color:#fff;padding:14px 22px;margin:-28px -28px 20px;}.logo{font-size:20px;font-weight:900;letter-spacing:-1px}.teal{color:#0EA5A0}h2{font-size:14px;color:#0EA5A0;margin:18px 0 7px;border-bottom:2px solid #0EA5A0;padding-bottom:3px}table{width:100%;border-collapse:collapse;margin-bottom:14px}th{background:#0B1F3A;color:#fff;padding:6px 9px;text-align:left;font-size:10px}td{padding:5px 9px;border-bottom:1px solid #dde3ec;font-size:11px}tr:nth-child(even)td{background:#f7f9fc}.g{background:#d1fae5;color:#065f46;padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700}.y{background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700}.b{background:#dbeafe;color:#1558A8;padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700}.meta{font-size:10px;color:#8896a8;margin-bottom:18px}@media print{body{padding:0}.hdr{margin:0 0 18px}}</style></head><body>
    <div class="hdr"><div class="logo">Strat<span class="teal">ex</span>Points</div><div style="font-size:10px;color:#94a3b8;letter-spacing:2px;margin-top:2px">EXECUTION PLATFORM</div></div>
    <div class="meta">Hospital Punta Médica · ${new Date().toLocaleDateString("es-MX",{year:"numeric",month:"long",day:"numeric"})} · StratexPoints v2.0</div>`;
    let body="";
    if(type==="okrs"){
      body+=`<h2>Reporte OKRs — Dirección Administración y Finanzas</h2>`;
      okrs.forEach(o=>{const bg=o.prog>=70?"g":o.prog>=40?"y":"b";body+=`<h2 style="margin-top:16px">${o.code}: ${o.obj}</h2><table><tr><th>Responsable</th><th>Progreso</th><th>Estado</th></tr><tr><td>${o.own}</td><td>${o.prog}%</td><td><span class="${bg}">${ST[o.st]?.l}</span></td></tr></table><table><tr><th>Key Result</th><th>Responsable</th><th>Actual</th><th>Meta</th><th>%</th></tr>`;o.krs.forEach(k=>body+=`<tr><td>${k.t}</td><td>${k.own}</td><td>${k.cur} ${k.un}</td><td>${k.tgt} ${k.un}</td><td>${Math.round((k.cur/k.tgt)*100)}%</td></tr>`);body+="</table>";});
    }else{
      body+=`<h2>Dashboard Ejecutivo</h2><table><tr><th>Métrica</th><th>Valor</th></tr><tr><td>Índice Ejecución Global</td><td><strong>${avg}%</strong></td></tr><tr><td>OKRs en riesgo</td><td>${okrs.filter(o=>o.st==="at_risk").length} de ${okrs.length}</td></tr><tr><td>KRs Completados</td><td>${okrs.reduce((s,o)=>s+o.krs.filter(k=>k.st==="completed").length,0)} de ${okrs.reduce((s,o)=>s+o.krs.length,0)}</td></tr></table>`;
      body+=`<h2>Estado por OKR</h2><table><tr><th>Código</th><th>Objetivo</th><th>Progreso</th><th>Estado</th></tr>`;
      okrs.forEach(o=>{const bg=o.prog>=70?"g":o.prog>=40?"y":"b";body+=`<tr><td>${o.code}</td><td>${o.obj}</td><td>${o.prog}%</td><td><span class="${bg}">${ST[o.st]?.l}</span></td></tr>`;});
      body+="</table><h2>Bowling Chart</h2><table><tr><th>KPI</th><th>Meta</th>"+MO.slice(0,6).map(m=>`<th>${m}</th>`).join("")+"</tr>";
      bowl.forEach(row=>body+=`<tr><td>${row.l}</td><td>${row.tgt}${row.un}</td>${row.mon.slice(0,6).map(v=>`<td>${v==null?"—":v}</td>`).join("")}</tr>`);
      body+="</table>";
    }
    const w=window.open("","_blank","width=900,height=700");
    if(w){w.document.write(H+body+"</body></html>");w.document.close();setTimeout(()=>w.print(),600);}
    setLoading(null);setDone("pdf");setTimeout(()=>setDone(null),3000);
  };
  const Row=({label,desc,csvId,pdfType})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:C.bg,borderRadius:8,marginBottom:7}}>
    <div><div style={{fontSize:12,fontWeight:700,color:C.navy}}>{label}</div><div style={{fontSize:10.5,color:C.tL}}>{desc}</div></div>
    <div style={{display:"flex",gap:6}}>
      <Btn onClick={()=>exportXL(csvId)} variant="secondary" sx={{fontSize:10,padding:"5px 10px"}} disabled={loading===csvId}>{loading===csvId?<Spinner/>:done===csvId?"✓":"📊 Excel"}</Btn>
      <Btn onClick={()=>exportPDF(pdfType)} variant="dark" sx={{fontSize:10,padding:"5px 10px"}} disabled={loading==="pdf"}>{loading==="pdf"?<Spinner/>:done==="pdf"?"✓":"📄 PDF"}</Btn>
    </div>
  </div>;
  return <div style={{padding:20}}>
    <h2 style={{margin:"0 0 4px",fontSize:18,fontWeight:800,color:C.navy}}>📤 Centro de Exportación</h2>
    <p style={{margin:"0 0 16px",fontSize:12,color:C.tM}}>Exporta todos los módulos en Excel (CSV) o PDF imprimible</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16}}>
      <Card sx={{padding:18}}><div style={{fontWeight:800,color:C.navy,fontSize:13,marginBottom:12}}>🎯 OKRs y Seguimiento</div>
        <Row label="OKRs Completos" desc="4 objetivos · 14 KRs · responsables y progreso" csvId="okrs" pdfType="okrs"/>
        <Row label="Dashboard Ejecutivo" desc="Resumen global + bowling chart" csvId="kpis" pdfType="dashboard"/>
      </Card>
      <Card sx={{padding:18}}><div style={{fontWeight:800,color:C.navy,fontSize:13,marginBottom:12}}>🗺️ Estrategia y Mapas</div>
        <Row label="Mapa BSC Completo" desc="4 perspectivas · 17 objetivos · KPIs" csvId="bsc" pdfType="dashboard"/>
        <Row label="X-Matrix Hoshin Kanri" desc="5 iniciativas · correlaciones P/S/T" csvId="hoshin" pdfType="dashboard"/>
        <Row label="Bowling Chart KPIs" desc="4 indicadores · 12 meses · semáforo" csvId="kpis" pdfType="dashboard"/>
      </Card>
    </div>
    <Card sx={{marginTop:14,padding:14,background:C.gold+"10",border:"1px solid "+C.gold+"40"}}><div style={{fontSize:11,fontWeight:700,color:C.amber,marginBottom:4}}>💡 Instrucciones de exportación</div><div style={{fontSize:11.5,color:C.tM}}>Excel (CSV): abre directamente en Microsoft Excel o Google Sheets — compatible con fórmulas y tablas dinámicas. PDF: se abre una ventana de impresión; usa Ctrl+P → "Guardar como PDF" para el archivo final.</div></Card>
  </div>;
};

// ── DASHBOARD ─────────────────────────────────────────────
const Dashboard=({okrs,onNav})=>{
  const avg=Math.round(okrs.reduce((s,o)=>s+o.prog,0)/okrs.length);
  const Donut=({p,c,label,sub,onClick})=>{const R=27,CV=35,ci=2*Math.PI*R,col=c||(p>=75?"#10b981":p>=50?"#f59e0b":"#f43f5e");return <div style={{textAlign:"center",cursor:"pointer"}} onClick={onClick}><svg width={70} height={70} viewBox="0 0 70 70"><circle cx={CV} cy={CV} r={R} fill="none" stroke="#e6ecf5" strokeWidth={8}/><circle cx={CV} cy={CV} r={R} fill="none" stroke={col} strokeWidth={8} strokeDasharray={`${ci*p/100} ${ci}`} strokeDashoffset={ci*.25} strokeLinecap="round"/><text x={CV} y={CV} textAnchor="middle" dominantBaseline="middle" fill={col} fontSize={13} fontWeight={900}>{p}%</text></svg><div style={{fontSize:10,fontWeight:700,color:C.txt,marginTop:2}}>{label}</div>{sub&&<div style={{fontSize:9,color:C.tL}}>{sub}</div>}</div>;};
  return <div>
    <div style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.navyL} 55%,${C.teal} 100%)`,borderRadius:16,padding:"22px 26px",marginBottom:18,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-50,right:-30,width:220,height:220,borderRadius:"50%",background:"rgba(255,255,255,.04)"}}/>
      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:14,position:"relative"}}>
        <div><div style={{fontSize:9,letterSpacing:".15em",color:"#64748b",fontWeight:700,marginBottom:4}}>PLATAFORMA ESTRATÉGICA · 2025–2027</div><h1 style={{fontSize:23,fontWeight:900,color:C.white,margin:"0 0 3px",letterSpacing:"-.5px"}}>Hospital Punta Médica</h1><div style={{color:"#94a3b8",fontSize:11,marginBottom:12}}>StratexPoints · BSC + Hoshin Kanri + OKR + IA</div><div style={{display:"inline-flex",alignItems:"center",gap:7,background:"rgba(201,168,76,.18)",border:"1px solid rgba(201,168,76,.35)",borderRadius:30,padding:"4px 13px"}}><span style={{width:7,height:7,borderRadius:"50%",background:C.gold,display:"inline-block"}}/><span style={{color:C.gold,fontWeight:700,fontSize:10}}>Ejecución Q1–Q2 2025</span></div></div>
        <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>{okrs.map(o=><Donut key={o.id} p={o.prog} label={o.code} sub={ST[o.st]?.i} onClick={()=>onNav("okr")}/>)}</div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
      {[{l:"Índice Global",v:`${avg}%`,sub:"Ejecución OKR",c:avg>=60?C.green:avg>=40?C.amber:C.red,i:"📊"},{l:"En Riesgo",v:okrs.filter(o=>o.st==="at_risk").length,sub:`de ${okrs.length} OKRs`,c:C.amber,i:"⚠️"},{l:"KRs OK",v:`${okrs.reduce((s,o)=>s+o.krs.filter(k=>k.st==="completed").length,0)}/${okrs.reduce((s,o)=>s+o.krs.length,0)}`,sub:"Completados",c:C.blue,i:"✅"},{l:"BSC Activo",v:"4/4",sub:"Perspectivas",c:C.teal,i:"🗺️"}].map((s,i)=>(
        <Card key={i} sx={{padding:"14px 16px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:9.5,fontWeight:700,color:C.tL,letterSpacing:".08em",marginBottom:4}}>{s.l.toUpperCase()}</div><div style={{fontSize:24,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</div><div style={{fontSize:10,color:C.tM,marginTop:3}}>{s.sub}</div></div><span style={{fontSize:20}}>{s.i}</span></div></Card>
      ))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>{okrs.map(o=><Card key={o.id} sx={{padding:"13px 15px",cursor:"pointer"}} onClick={()=>onNav("okr")}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}><div><span style={{fontSize:9,fontWeight:800,color:C.teal,letterSpacing:".08em"}}>{o.code} · {o.ref}</span><div style={{fontSize:12.5,fontWeight:700,color:C.navy,marginTop:2,lineHeight:1.3}}>{o.obj}</div></div><Chip s={o.st}/></div><Bar v={o.prog}/><div style={{fontSize:10,color:C.tL,marginTop:5}}>{o.own} · {o.krs.length} KRs</div></Card>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:9}}>{[{l:"Mapa BSC",i:"🗺️",t:"bsc"},{l:"Hoshin X",i:"🔷",t:"hoshin"},{l:"OKR Tracker",i:"🎯",t:"okr"},{l:"Bowling",i:"🎳",t:"bowling"},{l:"Docs IA",i:"🤖",t:"docs"},{l:"Exportar",i:"📤",t:"export"}].map(n=><Card key={n.t} sx={{padding:"13px 8px",textAlign:"center",cursor:"pointer",transition:"transform .2s"}} onClick={()=>onNav(n.t)} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}><div style={{fontSize:22,marginBottom:4}}>{n.i}</div><div style={{fontSize:10.5,fontWeight:700,color:C.navy}}>{n.l}</div></Card>)}</div>
  </div>;
};

// ── BSC MAP ───────────────────────────────────────────────
const BSCMap=()=>{
  const [filter,setFilter]=useState("all");const [sel,setSel]=useState(null);
  return <div style={{padding:20}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
      <h2 style={{margin:0,fontSize:18,fontWeight:800,color:C.navy}}>🗺️ Mapa Estratégico BSC · 2025–2027</h2>
      <div style={{display:"flex",gap:6}}>{["all","Cliente","Productividad","Expansión"].map(p=><button key={p} onClick={()=>setFilter(p)} style={{padding:"5px 11px",borderRadius:20,border:"1.5px solid "+(filter===p?C.teal:C.bdr),background:filter===p?C.teal+"15":"transparent",color:filter===p?C.teal:C.tM,fontSize:11,fontWeight:700,cursor:"pointer"}}>{p==="all"?"Todos":p}</button>)}</div>
    </div>
    {BSC_P.map(per=>{const objs=filter==="all"?per.objs:per.objs.filter(o=>o.p===filter);if(!objs.length)return null;return <div key={per.id} style={{marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}><span style={{fontSize:16}}>{per.ico}</span><span style={{fontSize:12,fontWeight:800,color:per.c,letterSpacing:".05em"}}>{per.l.toUpperCase()}</span><div style={{flex:1,height:1.5,background:per.bd}}/></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))",gap:8}}>{objs.map(o=><div key={o.code} onClick={()=>setSel(sel?.code===o.code?null:o)} style={{padding:"10px 11px",background:per.bg,border:"1.5px solid "+(sel?.code===o.code?per.c:per.bd),borderRadius:8,cursor:"pointer",transition:"all .2s"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><span style={{fontSize:9.5,fontWeight:800,color:per.c}}>{o.code}</span><span style={{fontSize:8.5,padding:"1px 6px",borderRadius:10,background:per.c+"20",color:per.c,fontWeight:700}}>{o.p}</span></div><div style={{fontSize:11,color:C.txt,marginTop:3,lineHeight:1.4,fontWeight:600}}>{o.t}</div>{sel?.code===o.code&&<div style={{marginTop:8,borderTop:"1px solid "+per.bd,paddingTop:7}}><div style={{fontSize:9,fontWeight:700,color:per.c,marginBottom:4}}>KPIs ASOCIADOS</div>{o.kpis.map((k,i)=><div key={i} style={{fontSize:10,color:C.tM,marginBottom:2}}>• {k}</div>)}</div>}</div>)}</div></div>;})}
    {sel&&<Modal title={`Objetivo ${sel.code}`} onClose={()=>setSel(null)}><div style={{fontSize:14,fontWeight:700,color:C.navy,marginBottom:10}}>{sel.t}</div><div style={{fontSize:12,color:C.tM,marginBottom:10}}>Pilar: <strong>{sel.p}</strong></div><div style={{marginBottom:6,fontSize:12,fontWeight:700,color:C.teal}}>KPIs Asociados</div>{sel.kpis.map((k,i)=><div key={i} style={{padding:"8px 12px",background:C.bg,borderRadius:6,marginBottom:5,fontSize:12,color:C.txt}}>📊 {k}</div>)}</Modal>}
  </div>;
};

// ── HOSHIN ────────────────────────────────────────────────
const Hoshin=()=>{
  const [imOa,setImOa]=useState(CORR_IM_OA.map(r=>[...r]));
  const [imRs,setImRs]=useState(CORR_IM_RS.map(r=>[...r]));
  const SYM={"":"","p":"●","s":"○","t":"△"};const COL={"":C.tL,"p":C.green,"s":C.blue,"t":C.violet};
  const cyc=v=>({"":"p","p":"s","s":"t","t":""}[v]);
  const tog=(mat,set,r,c)=>set(p=>{const n=p.map(row=>[...row]);n[r][c]=cyc(n[r][c]);return n;});
  const Cell=({v,onClick})=><td onClick={onClick} style={{width:38,height:34,textAlign:"center",cursor:"pointer",fontSize:16,color:COL[v],background:v?COL[v]+"12":"transparent",border:"0.5px solid "+C.bdr,transition:"all .15s"}}>{SYM[v]}</td>;
  return <div style={{padding:20,overflowX:"auto"}}>
    <h2 style={{margin:"0 0 4px",fontSize:18,fontWeight:800,color:C.navy}}>🔷 Hoshin Kanri X-Matrix</h2>
    <p style={{margin:"0 0 12px",fontSize:11.5,color:C.tM}}>Clic en celda para ciclar: ● Primaria → ○ Secundaria → △ Terciaria → vacío</p>
    <div style={{display:"flex",gap:10,marginBottom:12}}>{[["●","Primaria",C.green],["○","Secundaria",C.blue],["△","Terciaria",C.violet]].map(([s,l,c])=><span key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:c,fontWeight:700}}><span style={{fontSize:15,color:c}}>{s}</span>{l}</span>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
      <div><div style={{fontSize:10,fontWeight:800,color:C.teal,letterSpacing:".08em",marginBottom:7}}>IM × OBJETIVOS ANUALES</div>
        <table style={{borderCollapse:"collapse",width:"100%"}}><thead><tr><th style={{background:C.navy,color:C.white,padding:"6px 8px",fontSize:10,textAlign:"left",minWidth:130}}>Iniciativa</th>{OA_LIST.map(h=><th key={h} style={{background:C.navy,color:C.white,padding:"5px 6px",fontSize:9,textAlign:"center",maxWidth:60}}>{h}</th>)}</tr></thead>
        <tbody>{IM_LIST.map((im,i)=><tr key={im}><td style={{padding:"6px 8px",fontSize:10.5,fontWeight:600,color:C.txt,borderBottom:"1px solid "+C.bdr}}>{im}</td>{OA_LIST.map((_,j)=><Cell key={j} v={imOa[i][j]} onClick={()=>tog(imOa,setImOa,i,j)}/>)}</tr>)}</tbody></table>
      </div>
      <div><div style={{fontSize:10,fontWeight:800,color:C.teal,letterSpacing:".08em",marginBottom:7}}>IM × RESPONSABLES</div>
        <table style={{borderCollapse:"collapse",width:"100%"}}><thead><tr><th style={{background:C.navy,color:C.white,padding:"6px 8px",fontSize:10,textAlign:"left",minWidth:130}}>Iniciativa</th>{RS_LIST.map(h=><th key={h} style={{background:C.navy,color:C.white,padding:"5px 6px",fontSize:9,textAlign:"center",maxWidth:70}}>{h}</th>)}</tr></thead>
        <tbody>{IM_LIST.map((im,i)=><tr key={im}><td style={{padding:"6px 8px",fontSize:10.5,fontWeight:600,color:C.txt,borderBottom:"1px solid "+C.bdr}}>{im}</td>{RS_LIST.map((_,j)=><Cell key={j} v={imRs[i][j]} onClick={()=>tog(imRs,setImRs,i,j)}/>)}</tr>)}</tbody></table>
      </div>
    </div>
  </div>;
};

// ── OKR TRACKER ───────────────────────────────────────────
const OKRTracker=({okrs,setOkrs})=>{
  const [open,setOpen]=useState(null);const [loading,setLoading]=useState(null);
  const upd=(oid,kid,f,v)=>setOkrs(prev=>prev.map(o=>o.id!==oid?o:{...o,
    krs:o.krs.map(k=>k.id!==kid?k:{...k,[f]:f==="cur"?parseFloat(v)||0:v}),
    prog:Math.round(o.krs.map(k=>k.id===kid?{...k,[f]:f==="cur"?parseFloat(v)||0:v}:k).reduce((s,k)=>s+(k.cur/k.tgt)*100,0)/o.krs.length)
  }));
  const makePro=async(o,k)=>{setLoading(k.id);try{const r=await AItext(`Mejora este Key Result haciéndolo SMART, más medible y retador:\n"${k.t}"\nContexto: "${o.obj}", Hospital Punta Médica, salud privada México. Actual: ${k.cur}/${k.tgt} ${k.un}\nResponde SOLO el texto mejorado.`,"Master Black Belt OKRs. Solo el texto mejorado.",400);setOkrs(p=>p.map(ox=>ox.id!==o.id?ox:{...ox,krs:ox.krs.map(kx=>kx.id!==k.id?kx:{...kx,t:r.trim()})}));}catch(e){}setLoading(null);};
  const genKRs=async(o)=>{setLoading("gen_"+o.id);try{const r=await AI(`Genera 2 Key Results SMART adicionales para: "${o.obj}", Hospital Punta Médica. JSON: {"krs":[{"t":"texto","tgt":numero,"un":"unidad","own":"Responsable"}]}`,"Experto OKRs hospitalarios. Solo JSON.",500);if(r.krs){const nk=r.krs.map((k,i)=>({id:"ai_"+Date.now()+i,t:k.t,own:k.own||"Por asignar",tgt:k.tgt||100,un:k.un||"%",cur:0,st:"not_started"}));setOkrs(p=>p.map(ox=>ox.id!==o.id?ox:{...ox,krs:[...ox.krs,...nk]}));}}catch(e){}setLoading(null);};
  return <div style={{padding:20}}>
    <h2 style={{margin:"0 0 4px",fontSize:18,fontWeight:800,color:C.navy}}>🎯 OKR Tracker</h2>
    <p style={{margin:"0 0 14px",fontSize:11.5,color:C.tM}}>Dirección de Administración y Finanzas · Hospital Punta Médica</p>
    {okrs.map(o=><Card key={o.id} sx={{marginBottom:10,overflow:"hidden"}}>
      <div onClick={()=>setOpen(open===o.id?null:o.id)} style={{padding:"13px 15px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
        <div style={{flex:1}}><div style={{display:"flex",gap:7,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}><span style={{fontSize:9.5,fontWeight:800,background:C.teal+"15",color:C.teal,padding:"2px 8px",borderRadius:20}}>{o.code}</span><Chip s={o.st}/><span style={{fontSize:10,color:C.tL}}>{o.own}</span></div><div style={{fontSize:13,fontWeight:700,color:C.navy,marginBottom:7}}>{o.obj}</div><Bar v={o.prog}/></div>
        <span style={{fontSize:18,color:C.tL,transition:"transform .2s",transform:open===o.id?"rotate(90deg)":"none"}}>›</span>
      </div>
      {open===o.id&&<div style={{borderTop:"1px solid "+C.bdr,padding:"11px 15px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}><span style={{fontSize:10.5,fontWeight:700,color:C.teal,letterSpacing:".07em"}}>KEY RESULTS</span><Btn onClick={()=>genKRs(o)} variant="secondary" sx={{fontSize:9.5,padding:"4px 10px"}} disabled={loading==="gen_"+o.id}>{loading==="gen_"+o.id?<Spinner/>:"🪄 IA Generar KRs"}</Btn></div>
        {o.krs.map(k=>{const p=cl(Math.round((k.cur/k.tgt)*100),0,100);return <div key={k.id} style={{padding:"9px 11px",background:C.bg,borderRadius:7,marginBottom:7}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,gap:8}}>
            <div style={{flex:1}}><div style={{fontSize:11.5,fontWeight:600,color:C.navy,lineHeight:1.35}}>{k.t}</div><div style={{fontSize:10,color:C.tL,marginTop:1}}>{k.own}</div></div>
            <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
              <input type="number" value={k.cur} onChange={e=>upd(o.id,k.id,"cur",e.target.value)} style={{width:52,padding:"3px 5px",borderRadius:6,border:"1px solid "+C.bdr,fontSize:11,textAlign:"center",color:C.txt}}/>
              <span style={{fontSize:10,color:C.tL}}>/{k.tgt} {k.un}</span>
              <Btn onClick={()=>makePro(o,k)} variant="secondary" sx={{fontSize:9,padding:"3px 7px"}} disabled={loading===k.id}>{loading===k.id?<Spinner/>:"✨ Pro"}</Btn>
              <select value={k.st} onChange={e=>upd(o.id,k.id,"st",e.target.value)} style={{fontSize:9.5,padding:"3px 5px",borderRadius:6,border:"1px solid "+C.bdr,color:C.txt,background:C.white}}>
                {Object.entries(ST).map(([v,m])=><option key={v} value={v}>{m.l}</option>)}
              </select>
            </div>
          </div>
          <Bar v={p} h={5}/>
        </div>;})}
      </div>}
    </Card>)}
  </div>;
};

// ── BOWLING ───────────────────────────────────────────────
const Bowling=({bowl,setBowl})=>{
  const col=(v,t,b)=>{if(v==null)return{bg:"transparent",tx:C.tL};const p=(v-b)/(t-b);if(p>=1)return{bg:"#065f46",tx:"#d1fae5"};if(p>=.7)return{bg:"#16a34a",tx:"#dcfce7"};if(p>=.4)return{bg:"#ca8a04",tx:"#fef9c3"};return{bg:"#dc2626",tx:"#fee2e2"};};
  const upd=(ri,mi,v)=>setBowl(p=>p.map((r,i)=>i!==ri?r:{...r,mon:r.mon.map((x,j)=>j!==mi?x:v===""?null:parseFloat(v)||null)}));
  const last=(row)=>{const vs=row.mon.filter(v=>v!=null);return vs.length?vs[vs.length-1]:null;};
  return <div style={{padding:20,overflowX:"auto"}}>
    <h2 style={{margin:"0 0 4px",fontSize:18,fontWeight:800,color:C.navy}}>🎳 Bowling Chart KPIs</h2>
    <p style={{margin:"0 0 14px",fontSize:11.5,color:C.tM}}>Seguimiento mensual de indicadores · Clic en celda para editar valor</p>
    <table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
      <thead><tr>
        <th style={{background:C.navy,color:C.white,padding:"8px 11px",textAlign:"left",fontSize:10.5,borderRadius:"8px 0 0 0",minWidth:190}}>KPI</th>
        <th style={{background:C.navy,color:C.white,padding:"8px 7px",textAlign:"center",fontSize:10.5,minWidth:50}}>Meta</th>
        {MO.map(m=><th key={m} style={{background:C.navy,color:C.white,padding:"8px 5px",textAlign:"center",fontSize:9.5,minWidth:40}}>{m}</th>)}
        <th style={{background:C.navy,color:C.white,padding:"8px 7px",textAlign:"center",fontSize:10.5,borderRadius:"0 8px 0 0",minWidth:55}}>Avance</th>
      </tr></thead>
      <tbody>{bowl.map((row,ri)=>{const lv=last(row),rng=row.tgt-row.base,pct=lv!=null?cl(Math.round(((lv-row.base)/rng)*100),0,100):null;return <tr key={ri} style={{background:ri%2?"#f8fafc":C.white}}>
        <td style={{padding:"7px 11px",fontSize:11,fontWeight:600,color:C.navy,borderBottom:"1px solid "+C.bdr}}>{row.l}</td>
        <td style={{padding:"7px 7px",textAlign:"center",fontSize:11,fontWeight:800,color:C.blue,borderBottom:"1px solid "+C.bdr}}>{row.tgt}{row.un}</td>
        {row.mon.map((v,mi)=>{const {bg,tx}=col(v,row.tgt,row.base);return <td key={mi} style={{padding:3,borderBottom:"1px solid "+C.bdr,textAlign:"center"}}><input type="number" value={v==null?"":v} onChange={e=>upd(ri,mi,e.target.value)} style={{width:34,height:26,textAlign:"center",border:"none",borderRadius:3,background:bg,color:tx,fontSize:9.5,fontWeight:700,outline:"none",cursor:"pointer"}}/></td>;})}
        <td style={{padding:"7px 7px",borderBottom:"1px solid "+C.bdr}}>{pct!=null?<Bar v={pct} h={5}/>:<span style={{fontSize:10,color:C.tL,display:"block",textAlign:"center"}}>—</span>}</td>
      </tr>;})}
      </tbody>
    </table>
    <div style={{display:"flex",gap:9,marginTop:10,flexWrap:"wrap"}}>{[["#065f46","Meta ≥100%"],["#16a34a","Buen ritmo 70-99%"],["#ca8a04","Riesgo 40-69%"],["#dc2626","Crítico <40%"]].map(([bg,label])=><div key={label} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:11,height:11,borderRadius:2,background:bg}}/><span style={{fontSize:10,color:C.tM}}>{label}</span></div>)}</div>
  </div>;
};

// ── AI ESTRATÉGICA ────────────────────────────────────────
const AIStrat=({okrs,bowl})=>{
  const [mode,setMode]=useState(null);const [ctx,setCtx]=useState("");const [result,setResult]=useState(null);const [loading,setLoading]=useState(false);
  const run=async()=>{if(!mode)return;setLoading(true);setResult(null);
    const oData=okrs.map(o=>({code:o.code,obj:o.obj,prog:o.prog,st:o.st,krs:o.krs.map(k=>({t:k.t,cur:k.cur,tgt:k.tgt,st:k.st}))}));
    const avg=Math.round(okrs.reduce((s,o)=>s+o.prog,0)/okrs.length);
    const prompts={
      gap:`Gap Analysis ecosistema estratégico. Datos:${JSON.stringify(oData)}${ctx?"\nContexto:"+ctx:""}. JSON:{"score":0-100,"status":"...","gaps":["..."],"fortalezas":["..."],"recomendaciones":["..."],"prioridad":"..."}`,
      riesgo:`Análisis riesgo estratégico Hospital PM. OKRs:${JSON.stringify(oData)}${ctx}. JSON:{"riesgos":[{"nombre":"...","probabilidad":"Alta|Media|Baja","impacto":"Alto|Medio|Bajo","area":"...","mitigacion":"...","owner":"..."}],"nivel_global":"Alto|Medio|Bajo","alerta":"..."}`,
      ejecutivo:`Reporte ejecutivo junta directiva. Promedio:${avg}%. OKRs:${JSON.stringify(oData)}. Bowling:${JSON.stringify(bowl)}. JSON:{"resumen":"...","ieg":${avg},"estado":"...","top3":["1...","2...","3..."],"mensaje_directorio":"..."}`,
      bsc:`Sugiere 2 objetivos adicionales por perspectiva BSC Hospital PM. JSON:{"sugerencias":[{"perspectiva":"Financiera|Clientes|Procesos|Aprendizaje","codigo":"F7|C8|P9|A14","objetivo":"...","justificacion":"...","kpi":"..."}]}`,
    };
    try{const r=await AI(prompts[mode],"CSO virtual StratexPoints. Solo JSON válido.",1400);setResult({mode,data:r});}
    catch(e){setResult({mode,error:true});}
    setLoading(false);
  };
  const Res=()=>{
    if(!result)return null;if(result.error)return <div style={{padding:12,background:"#fef2f2",borderRadius:7,color:C.red,fontSize:12}}>❌ Error al generar análisis.</div>;
    const d=result.data;
    if(result.mode==="gap")return <div>
      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{padding:"12px 18px",background:d.score>=70?"#d1fae5":d.score>=50?"#fef3c7":"#fee2e2",borderRadius:9,textAlign:"center",flex:1,minWidth:90}}><div style={{fontSize:26,fontWeight:900,color:d.score>=70?C.green:d.score>=50?C.amber:C.red}}>{d.score}</div><div style={{fontSize:9.5,fontWeight:700,color:C.tM}}>SCORE ESTRATÉGICO</div></div>
        <div style={{flex:3,padding:"12px 14px",background:C.bg,borderRadius:9}}><div style={{fontSize:12,fontWeight:800,color:C.navy,marginBottom:3}}>Estado: {d.status}</div><div style={{fontSize:11,color:C.tM}}>Prioridad: {d.prioridad}</div></div>
      </div>
      {["gaps","fortalezas","recomendaciones"].map(s=><div key={s} style={{marginBottom:10}}><div style={{fontSize:10,fontWeight:800,color:C.teal,letterSpacing:".08em",marginBottom:5}}>{s.toUpperCase()}</div>{(d[s]||[]).map((x,i)=><div key={i} style={{padding:"6px 11px",background:C.bg,borderRadius:5,marginBottom:3,fontSize:11,color:C.txt}}>{s==="gaps"?"🔴":s==="fortalezas"?"✅":"🎯"} {x}</div>)}</div>)}
    </div>;
    if(result.mode==="riesgo")return <div>
      <div style={{marginBottom:10,padding:"9px 13px",background:d.nivel_global==="Alto"?"#fee2e2":d.nivel_global==="Medio"?"#fef3c7":"#d1fae5",borderRadius:7}}><div style={{fontSize:12,fontWeight:800}}>🚨 Riesgo Global: {d.nivel_global}</div>{d.alerta&&<div style={{fontSize:11,color:C.tM,marginTop:3}}>{d.alerta}</div>}</div>
      {(d.riesgos||[]).map((r,i)=><div key={i} style={{padding:"11px 13px",background:C.bg,borderRadius:7,marginBottom:7}}><div style={{display:"flex",gap:7,marginBottom:5,flexWrap:"wrap"}}><span style={{fontWeight:700,fontSize:12,color:C.navy}}>{r.nombre}</span><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:10,background:r.probabilidad==="Alta"?"#fee2e2":"#fef3c7",color:r.probabilidad==="Alta"?C.red:C.amber,fontWeight:700}}>Prob: {r.probabilidad}</span><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:10,background:"#dbeafe",color:C.blue,fontWeight:700}}>{r.area}</span></div><div style={{fontSize:11,color:C.tM,marginBottom:3}}>🛡 {r.mitigacion}</div><div style={{fontSize:10,color:C.tL}}>Owner: {r.owner}</div></div>)}
    </div>;
    if(result.mode==="ejecutivo")return <div>
      <div style={{padding:"12px 14px",background:C.navy+"08",borderRadius:7,marginBottom:11,borderLeft:"3px solid "+C.teal}}><div style={{fontSize:10,fontWeight:800,color:C.teal,marginBottom:5}}>RESUMEN EJECUTIVO</div><div style={{fontSize:11.5,color:C.txt,lineHeight:1.6}}>{d.resumen}</div></div>
      <div style={{marginBottom:11}}><div style={{fontSize:10,fontWeight:800,color:C.teal,letterSpacing:".08em",marginBottom:5}}>TOP 3 PRIORIDADES</div>{(d.top3||[]).map((p,i)=><div key={i} style={{padding:"7px 11px",background:C.bg,borderRadius:5,marginBottom:3,fontSize:11,color:C.txt}}><strong style={{color:C.navy}}>#{i+1}</strong> {p}</div>)}</div>
      {d.mensaje_directorio&&<div style={{padding:"11px 13px",background:C.gold+"15",borderRadius:7,border:"1px solid "+C.gold+"40"}}><div style={{fontSize:10,fontWeight:800,color:C.amber,marginBottom:3}}>📋 PARA DIRECTORIO</div><div style={{fontSize:11,color:C.tM}}>{d.mensaje_directorio}</div></div>}
    </div>;
    if(result.mode==="bsc")return <div>{(d.sugerencias||[]).map((s,i)=><div key={i} style={{padding:"11px 13px",background:C.bg,borderRadius:7,marginBottom:7}}><div style={{display:"flex",gap:7,marginBottom:5,alignItems:"center"}}><span style={{fontSize:9.5,fontWeight:800,padding:"2px 8px",borderRadius:10,background:C.teal+"20",color:C.teal}}>{s.codigo}</span><span style={{fontSize:9.5,padding:"2px 7px",borderRadius:10,background:"#dbeafe",color:C.blue,fontWeight:700}}>{s.perspectiva}</span></div><div style={{fontSize:12,fontWeight:700,color:C.navy,marginBottom:3}}>{s.objetivo}</div><div style={{fontSize:11,color:C.tM,marginBottom:3}}>{s.justificacion}</div>{s.kpi&&<div style={{fontSize:10.5,color:C.teal}}>📊 KPI: {s.kpi}</div>}</div>)}</div>;
    return null;
  };
  const modes=[{id:"gap",i:"🔍",l:"Gap Analysis",d:"Score y brechas estratégicas"},{id:"riesgo",i:"⚠️",l:"Análisis Riesgo",d:"KRIs y plan mitigación"},{id:"ejecutivo",i:"📋",l:"Reporte Ejecutivo",d:"Para junta directiva"},{id:"bsc",i:"🗺️",l:"Ampliar BSC",d:"Nuevos objetivos sugeridos"}];
  return <div style={{padding:20}}>
    <h2 style={{margin:"0 0 4px",fontSize:18,fontWeight:800,color:C.navy}}>🤖 IA Estratégica</h2>
    <p style={{margin:"0 0 14px",fontSize:11.5,color:C.tM}}>Motor de análisis ejecutivo impulsado por Claude AI</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:14}}>{modes.map(m=><div key={m.id} onClick={()=>setMode(m.id)} style={{padding:"11px 13px",borderRadius:9,border:"2px solid "+(mode===m.id?C.teal:C.bdr),background:mode===m.id?C.teal+"10":"transparent",cursor:"pointer",transition:"all .2s"}}><div style={{fontSize:17,marginBottom:3}}>{m.i}</div><div style={{fontSize:12,fontWeight:700,color:C.navy}}>{m.l}</div><div style={{fontSize:10,color:C.tL}}>{m.d}</div></div>)}</div>
    <textarea value={ctx} onChange={e=>setCtx(e.target.value)} placeholder="Contexto adicional (opcional)..." style={{width:"100%",padding:"9px 11px",borderRadius:8,border:"1px solid "+C.bdr,fontSize:11.5,color:C.txt,resize:"vertical",minHeight:55,marginBottom:11,boxSizing:"border-box"}}/>
    <Btn onClick={run} variant="dark" disabled={!mode||loading} sx={{width:"100%",padding:"10px",fontSize:13}}>{loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><Spinner/>Analizando...</span>:"⚡ Ejecutar Análisis"}</Btn>
    {result&&<div style={{marginTop:14,padding:14,background:C.white,borderRadius:11,border:"1px solid "+C.bdr}}><Res/></div>}
  </div>;
};

// ── ROOT APP ──────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [okrs,setOkrs]=useState(OKRS_INIT);
  const [bowl,setBowl]=useState(BOWL_INIT);
  const [aiOpen,setAiOpen]=useState(false);
  const TABS=[{id:"dashboard",i:"🏠",l:"Dashboard"},{id:"bsc",i:"🗺️",l:"Mapa BSC"},{id:"hoshin",i:"🔷",l:"Hoshin X"},{id:"okr",i:"🎯",l:"OKRs"},{id:"bowling",i:"🎳",l:"Bowling"},{id:"docs",i:"🤖",l:"Docs IA"},{id:"export",i:"📤",l:"Exportar"}];
  return <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter',system-ui,sans-serif",color:C.txt}}>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}*{box-sizing:border-box}input:focus,select:focus,textarea:focus{outline:2px solid ${C.teal};outline-offset:-1px}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:${C.bdr};border-radius:10px}`}</style>
    <div style={{background:C.white,borderBottom:"1px solid "+C.bdr,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 8px rgba(0,0,0,.05)"}}>
      <div style={{maxWidth:1200,margin:"0 auto",padding:"0 14px",display:"flex",alignItems:"center",gap:0,height:52}}>
        <div style={{marginRight:20,flexShrink:0}}><Logo size={22}/></div>
        <div style={{display:"flex",gap:1,flex:1,overflowX:"auto",scrollbarWidth:"none",msOverflowStyle:"none"}}>
          {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"5px 11px",borderRadius:7,border:"none",background:tab===t.id?C.teal+"15":"transparent",color:tab===t.id?C.teal:C.tM,fontSize:11,fontWeight:tab===t.id?800:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s",display:"flex",alignItems:"center",gap:3}}><span>{t.i}</span><span>{t.l}</span></button>)}
        </div>
        <Btn onClick={()=>setAiOpen(true)} variant="dark" sx={{marginLeft:8,fontSize:10.5,padding:"5px 11px",flexShrink:0}}>⚡ IA</Btn>
      </div>
    </div>
    <div style={{maxWidth:1200,margin:"0 auto",padding:"18px 14px"}}>
      {tab==="dashboard"&&<Dashboard okrs={okrs} onNav={setTab}/>}
      {tab==="bsc"&&<BSCMap/>}
      {tab==="hoshin"&&<Hoshin/>}
      {tab==="okr"&&<OKRTracker okrs={okrs} setOkrs={setOkrs}/>}
      {tab==="bowling"&&<Bowling bowl={bowl} setBowl={setBowl}/>}
      {tab==="docs"&&<DocReader/>}
      {tab==="export"&&<ExportMod okrs={okrs} bowl={bowl}/>}
    </div>
    {aiOpen&&<Modal title="🤖 IA Estratégica Integral" onClose={()=>setAiOpen(false)}><AIStrat okrs={okrs} bowl={bowl}/></Modal>}
  </div>;
}
