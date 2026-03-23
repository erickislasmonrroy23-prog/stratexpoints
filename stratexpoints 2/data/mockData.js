// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Mock Data completo
// ══════════════════════════════════════════════════════════════

// ── ORGANIZACIÓN ─────────────────────────────────────────────
export const ORGANIZATION = {
  id: "org_001",
  name: "Hospital Punta Médica",
  sector: "Salud Privada",
  country: "México",
  period: "2025–2027",
  logo: "🏥",
  plan: "enterprise",
  createdAt: "2025-01-01",
};

// ── USUARIOS ──────────────────────────────────────────────────
export const USERS = [
  { id:"u1", name:"Dr. Alejandro Ríos",    email:"a.rios@puntamedica.mx",    role:"admin",    area:"Dirección General",        avatar:"AR", active:true  },
  { id:"u2", name:"Lic. Carmen Villanueva",email:"c.villanueva@puntamedica.mx",role:"director",area:"Administración y Finanzas", avatar:"CV", active:true  },
  { id:"u3", name:"Ing. Roberto Sánchez",  email:"r.sanchez@puntamedica.mx",  role:"director", area:"Tecnología",               avatar:"RS", active:true  },
  { id:"u4", name:"Lic. María González",   email:"m.gonzalez@puntamedica.mx", role:"analyst",  area:"Calidad",                  avatar:"MG", active:true  },
  { id:"u5", name:"Lic. Jorge Mendoza",    email:"j.mendoza@puntamedica.mx",  role:"analyst",  area:"Comercial",                avatar:"JM", active:true  },
  { id:"u6", name:"Dra. Patricia Ruiz",    email:"p.ruiz@puntamedica.mx",     role:"user",     area:"Recursos Humanos",         avatar:"PR", active:true  },
];

export const CURRENT_USER = USERS[0];

// ── PERSPECTIVAS BSC ──────────────────────────────────────────
export const BSC_PERSPECTIVES = [
  {
    id: "fin", key: "financial", label: "Financiera",
    icon: "💰", color: "#059669", bg: "#ecfdf5", border: "#6ee7b7",
    description: "Resultados económicos y crecimiento sostenible",
    weight: 30,
  },
  {
    id: "cli", key: "customer", label: "Clientes",
    icon: "🏥", color: "#1d4ed8", bg: "#eff6ff", border: "#93c5fd",
    description: "Satisfacción, fidelización y captación",
    weight: 25,
  },
  {
    id: "pro", key: "process", label: "Procesos",
    icon: "⚙️", color: "#7c3aed", bg: "#faf5ff", border: "#c4b5fd",
    description: "Eficiencia operativa y calidad de procesos",
    weight: 25,
  },
  {
    id: "apr", key: "learning", label: "Aprendizaje",
    icon: "🌱", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5",
    description: "Capital humano, tecnología e innovación",
    weight: 20,
  },
];

// ── OBJETIVOS ESTRATÉGICOS ────────────────────────────────────
export const STRATEGIC_OBJECTIVES = [
  // FINANCIERA
  { id:"so1", perspectiveId:"fin", code:"F1", title:"Crecer ingresos por admisiones +20%",          progress:58, owner:"u2", status:"at_risk",   period:"2025", kpiIds:["kpi1","kpi2"] },
  { id:"so2", perspectiveId:"fin", code:"F2", title:"Lograr EBITDA positivo en año 3",              progress:42, owner:"u2", status:"at_risk",   period:"2025", kpiIds:["kpi3"] },
  { id:"so3", perspectiveId:"fin", code:"F3", title:"Implementar cirugía robótica BRAINLAB",        progress:75, owner:"u3", status:"on_track",  period:"2025", kpiIds:["kpi4"] },
  // CLIENTES
  { id:"so4", perspectiveId:"cli", code:"C1", title:"Alcanzar NPS ≥ 85 pts en pacientes",          progress:62, owner:"u4", status:"on_track",  period:"2025", kpiIds:["kpi5","kpi6"] },
  { id:"so5", perspectiveId:"cli", code:"C2", title:"Fidelizar base médica activa +30%",            progress:35, owner:"u5", status:"at_risk",   period:"2025", kpiIds:["kpi7"] },
  { id:"so6", perspectiveId:"cli", code:"C3", title:"Lanzar programa de oncología integral",       progress:20, owner:"u1", status:"not_started",period:"2025", kpiIds:["kpi8"] },
  // PROCESOS
  { id:"so7", perspectiveId:"pro", code:"P1", title:"Implementar HIS hospitalario RTR3S",           progress:80, owner:"u3", status:"on_track",  period:"2025", kpiIds:["kpi9","kpi10"] },
  { id:"so8", perspectiveId:"pro", code:"P2", title:"Certificar modelo de calidad NOM-EM-005",     progress:55, owner:"u4", status:"on_track",  period:"2025", kpiIds:["kpi11"] },
  { id:"so9", perspectiveId:"pro", code:"P3", title:"Reducir tiempo de admisión a <10 min",        progress:48, owner:"u5", status:"at_risk",   period:"2025", kpiIds:["kpi12"] },
  // APRENDIZAJE
  { id:"so10",perspectiveId:"apr", code:"A1", title:"Certificar 90% del personal clínico",         progress:65, owner:"u6", status:"on_track",  period:"2025", kpiIds:["kpi13"] },
  { id:"so11",perspectiveId:"apr", code:"A2", title:"Implementar cultura de seguridad paciente",   progress:70, owner:"u4", status:"on_track",  period:"2025", kpiIds:["kpi14"] },
  { id:"so12",perspectiveId:"apr", code:"A3", title:"Digitalizar 100% expedientes clínicos",      progress:45, owner:"u3", status:"at_risk",   period:"2025", kpiIds:["kpi15"] },
];

// ── OKRs ──────────────────────────────────────────────────────
export const OKRS = [
  {
    id:"okr1", objectiveId:"so1", code:"OKR-F1-01",
    objective:"Incrementar volumen de admisiones particulares y aseguradoras",
    owner:"u2", period:"Q1-Q2 2025", progress:52, status:"at_risk",
    keyResults:[
      { id:"kr1", text:"Aumentar admisiones particulares de 120 a 138/mes (+15%)",    baseline:120, target:138, current:128, unit:"admisiones", type:"lagging", progress:53, status:"at_risk" },
      { id:"kr2", text:"Firmar convenios con 3 nuevas aseguradoras",                  baseline:5,   target:8,   current:7,   unit:"convenios",  type:"leading", progress:67, status:"on_track" },
      { id:"kr3", text:"Reducir tasa de cancelación de cirugías a <5%",               baseline:12,  target:5,   current:8,   unit:"%",          type:"leading", progress:57, status:"at_risk" },
      { id:"kr4", text:"Implementar sistema de evaluación satisfacción al 100%",      baseline:0,   target:100, current:40,  unit:"% impl",     type:"leading", progress:40, status:"at_risk" },
    ]
  },
  {
    id:"okr2", objectiveId:"so4", code:"OKR-C1-01",
    objective:"Elevar experiencia del paciente a estándar premium",
    owner:"u4", period:"Q1-Q2 2025", progress:68, status:"on_track",
    keyResults:[
      { id:"kr5", text:"Aumentar NPS pacientes de 72 a 85 puntos",                   baseline:72, target:85, current:78, unit:"pts NPS",  type:"lagging", progress:46, status:"at_risk"  },
      { id:"kr6", text:"Reducir tiempo de espera promedio de 45 a 20 minutos",        baseline:45, target:20, current:30, unit:"minutos", type:"leading", progress:60, status:"on_track" },
      { id:"kr7", text:"Lograr 95% de resolución en primera visita",                  baseline:78, target:95, current:88, unit:"%",       type:"lagging", progress:59, status:"on_track" },
    ]
  },
  {
    id:"okr3", objectiveId:"so7", code:"OKR-P1-01",
    objective:"Digitalizar y automatizar procesos hospitalarios críticos",
    owner:"u3", period:"Q1-Q2 2025", progress:78, status:"on_track",
    keyResults:[
      { id:"kr8",  text:"Implementar HIS al 100% en áreas clínicas",                 baseline:20, target:100, current:80, unit:"% impl",     type:"leading", progress:75, status:"on_track" },
      { id:"kr9",  text:"Reducir incidentes de TI a <2 por semana",                  baseline:8,  target:2,   current:3,  unit:"incidentes", type:"lagging", progress:83, status:"on_track" },
      { id:"kr10", text:"Lograr uptime de sistemas ≥ 99.5%",                          baseline:96, target:99.5,current:98.8,unit:"%",         type:"lagging", progress:82, status:"on_track" },
    ]
  },
  {
    id:"okr4", objectiveId:"so10", code:"OKR-A1-01",
    objective:"Desarrollar capital humano de alto desempeño",
    owner:"u6", period:"Q1-Q2 2025", progress:62, status:"on_track",
    keyResults:[
      { id:"kr11", text:"Certificar 90% del personal en NOM y protocolos",            baseline:55, target:90, current:68, unit:"%",       type:"lagging", progress:41, status:"at_risk"  },
      { id:"kr12", text:"Completar 2,400 horas de capacitación clínica",              baseline:0,  target:2400,current:1560,unit:"horas", type:"leading", progress:65, status:"on_track" },
      { id:"kr13", text:"Reducir rotación de personal a <10% anual",                 baseline:18, target:10, current:14, unit:"%",       type:"lagging", progress:50, status:"at_risk"  },
    ]
  },
];

// ── KPIs ──────────────────────────────────────────────────────
export const KPIS = [
  { id:"kpi1",  name:"Admisiones Totales/Mes",       perspectiveId:"fin", value:128,  target:138,  unit:"admisiones", trend:"up",   trafficLight:"yellow", formula:"Total admisiones del mes",                      frequency:"monthly", owner:"u2" },
  { id:"kpi2",  name:"Ingresos vs Presupuesto",       perspectiveId:"fin", value:87,   target:100,  unit:"%",          trend:"up",   trafficLight:"yellow", formula:"(Ingresos reales / Presupuesto) × 100",          frequency:"monthly", owner:"u2" },
  { id:"kpi3",  name:"EBITDA Margin",                perspectiveId:"fin", value:12.4, target:18,   unit:"%",          trend:"flat", trafficLight:"yellow", formula:"(EBITDA / Ingresos) × 100",                      frequency:"monthly", owner:"u2" },
  { id:"kpi4",  name:"ROI BRAINLAB",                 perspectiveId:"fin", value:2.1,  target:3.5,  unit:"x",          trend:"up",   trafficLight:"yellow", formula:"Ingresos generados / Inversión BRAINLAB",        frequency:"quarterly",owner:"u3" },
  { id:"kpi5",  name:"NPS Pacientes",                perspectiveId:"cli", value:78,   target:85,   unit:"pts",        trend:"up",   trafficLight:"yellow", formula:"% Promotores − % Detractores",                   frequency:"monthly", owner:"u4" },
  { id:"kpi6",  name:"Tasa Retención Pacientes",     perspectiveId:"cli", value:72,   target:85,   unit:"%",          trend:"flat", trafficLight:"yellow", formula:"Pacientes que regresan / Total pacientes",        frequency:"monthly", owner:"u4" },
  { id:"kpi7",  name:"Médicos Activos en Convenio",  perspectiveId:"cli", value:87,   target:110,  unit:"médicos",    trend:"up",   trafficLight:"yellow", formula:"Conteo médicos con convenio activo",             frequency:"monthly", owner:"u5" },
  { id:"kpi8",  name:"Pacientes Oncología",          perspectiveId:"cli", value:12,   target:40,   unit:"pacientes",  trend:"up",   trafficLight:"red",    formula:"Pacientes en protocolo oncológico activo",       frequency:"monthly", owner:"u1" },
  { id:"kpi9",  name:"Uptime Sistema HIS",           perspectiveId:"pro", value:98.8, target:99.5, unit:"%",          trend:"up",   trafficLight:"yellow", formula:"(Tiempo disponible / Tiempo total) × 100",        frequency:"weekly",  owner:"u3" },
  { id:"kpi10", name:"Incidentes TI/Semana",         perspectiveId:"pro", value:3,    target:2,    unit:"incidentes", trend:"down", trafficLight:"yellow", formula:"Conteo incidentes críticos por semana",          frequency:"weekly",  owner:"u3" },
  { id:"kpi11", name:"Cumplimiento NOM (%)",         perspectiveId:"pro", value:82,   target:95,   unit:"%",          trend:"up",   trafficLight:"yellow", formula:"Puntos cumplidos / Total puntos NOM × 100",      frequency:"monthly", owner:"u4" },
  { id:"kpi12", name:"Tiempo Promedio Admisión",     perspectiveId:"pro", value:22,   target:10,   unit:"minutos",    trend:"down", trafficLight:"red",    formula:"Promedio tiempo desde llegada hasta cama",       frequency:"weekly",  owner:"u5" },
  { id:"kpi13", name:"Personal Certificado (%)",     perspectiveId:"apr", value:68,   target:90,   unit:"%",          trend:"up",   trafficLight:"yellow", formula:"Personal certificado / Total personal × 100",    frequency:"monthly", owner:"u6" },
  { id:"kpi14", name:"Score Cultura Seguridad",      perspectiveId:"apr", value:74,   target:85,   unit:"pts",        trend:"up",   trafficLight:"yellow", formula:"Encuesta AHRQ cultura seguridad",                frequency:"quarterly",owner:"u4" },
  { id:"kpi15", name:"Expedientes Digitalizados",    perspectiveId:"apr", value:45,   target:100,  unit:"%",          trend:"up",   trafficLight:"red",    formula:"Expedientes digitales / Total expedientes × 100",frequency:"monthly", owner:"u3" },
];

// ── BOWLING CHART ─────────────────────────────────────────────
export const BOWLING_DATA = [
  { kpiId:"kpi1",  label:"Admisiones/Mes",    target:138, base:120, unit:"",    months:[120,122,125,null,null,null,null,null,null,null,null,null] },
  { kpiId:"kpi5",  label:"NPS Pacientes",     target:85,  base:72,  unit:"pts", months:[72,74,78,null,null,null,null,null,null,null,null,null]  },
  { kpiId:"kpi9",  label:"Uptime HIS",        target:99.5,base:96,  unit:"%",   months:[96,97.5,98.8,null,null,null,null,null,null,null,null,null] },
  { kpiId:"kpi11", label:"Cumpl. NOM",        target:95,  base:65,  unit:"%",   months:[65,72,82,null,null,null,null,null,null,null,null,null]  },
  { kpiId:"kpi13", label:"Personal Cert.",    target:90,  base:55,  unit:"%",   months:[55,60,68,null,null,null,null,null,null,null,null,null]  },
  { kpiId:"kpi12", label:"T. Admisión (min)", target:10,  base:45,  unit:"min", months:[45,38,22,null,null,null,null,null,null,null,null,null], inverse:true },
];

// ── HISTORIAL KPI (12 meses) ──────────────────────────────────
export const KPI_HISTORY = {
  kpi1:  [105,110,112,118,120,122,119,124,125,126,127,128],
  kpi2:  [78, 80, 82, 83, 84, 85, 83, 86, 87, 86, 87, 87 ],
  kpi3:  [8,  9,  10, 11, 11, 12, 11, 12, 12, 12, 12, 12.4],
  kpi5:  [68, 70, 71, 72, 73, 74, 73, 75, 76, 77, 77, 78 ],
  kpi9:  [95, 96, 96, 97, 97, 97, 98, 98, 98, 99, 99, 98.8],
  kpi11: [60, 63, 65, 68, 70, 72, 74, 76, 78, 80, 81, 82 ],
  kpi13: [50, 52, 55, 57, 59, 60, 62, 63, 65, 66, 67, 68 ],
  kpi12: [42, 40, 38, 36, 35, 33, 30, 28, 26, 25, 23, 22 ],
};

// ── INICIATIVAS ───────────────────────────────────────────────
export const INITIATIVES = [
  { id:"ini1", objectiveId:"so1", title:"Programa de captación de aseguradoras premium",     owner:"u5", startDate:"2025-01-15", endDate:"2025-06-30", progress:65, status:"on_track",  budget:250000, spent:162000, priority:"high"   },
  { id:"ini2", objectiveId:"so1", title:"Rediseño proceso de admisión exprés",               owner:"u5", startDate:"2025-02-01", endDate:"2025-05-31", progress:45, status:"at_risk",   budget:80000,  spent:38000,  priority:"high"   },
  { id:"ini3", objectiveId:"so4", title:"Implementación programa VIP Salud",                 owner:"u4", startDate:"2025-01-01", endDate:"2025-12-31", progress:55, status:"on_track",  budget:120000, spent:66000,  priority:"medium" },
  { id:"ini4", objectiveId:"so7", title:"Despliegue HIS RTR3S fase 2",                       owner:"u3", startDate:"2025-01-01", endDate:"2025-04-30", progress:80, status:"on_track",  budget:450000, spent:360000, priority:"high"   },
  { id:"ini5", objectiveId:"so8", title:"Auditoría y certificación NOM-EM-005",              owner:"u4", startDate:"2025-03-01", endDate:"2025-09-30", progress:40, status:"on_track",  budget:60000,  spent:24000,  priority:"medium" },
  { id:"ini6", objectiveId:"so10",title:"Academia interna de formación clínica",             owner:"u6", startDate:"2025-01-01", endDate:"2025-12-31", progress:62, status:"on_track",  budget:95000,  spent:58900,  priority:"medium" },
  { id:"ini7", objectiveId:"so5", title:"Programa de fidelización médica 'Punta Partners'", owner:"u5", startDate:"2025-02-15", endDate:"2025-08-31", progress:30, status:"at_risk",   budget:70000,  spent:21000,  priority:"high"   },
  { id:"ini8", objectiveId:"so12",title:"Digitalización expedientes fase 1",                owner:"u3", startDate:"2025-01-15", endDate:"2025-07-31", progress:45, status:"at_risk",   budget:180000, spent:81000,  priority:"high"   },
];

// ── ALERTAS ───────────────────────────────────────────────────
export const ALERTS = [
  { id:"al1", type:"kpi_red",    severity:"critical", title:"KPI en zona roja",              message:"Tiempo de admisión (22 min) supera la meta de 10 min en un 120%.", entityId:"kpi12", entityType:"kpi",       read:false, createdAt:"2025-03-13T08:00:00Z" },
  { id:"al2", type:"kpi_red",    severity:"critical", title:"KPI Oncología crítico",         message:"Pacientes oncología (12) muy por debajo de la meta (40).",         entityId:"kpi8",  entityType:"kpi",       read:false, createdAt:"2025-03-12T09:30:00Z" },
  { id:"al3", type:"okr_risk",   severity:"warning",  title:"OKR en riesgo",                message:"OKR-F1-01 con 52% de avance vs 58% esperado del período.",         entityId:"okr1",  entityType:"okr",       read:false, createdAt:"2025-03-11T10:00:00Z" },
  { id:"al4", type:"initiative", severity:"warning",  title:"Iniciativa retrasada",         message:"Rediseño proceso de admisión con 45% de avance, debería estar al 65%.",entityId:"ini2",entityType:"initiative",read:true,  createdAt:"2025-03-10T14:00:00Z" },
  { id:"al5", type:"okr_risk",   severity:"warning",  title:"KR sin actualizar",            message:"KR 'Admisiones particulares' sin actualización en 7 días.",        entityId:"kr1",   entityType:"kr",        read:true,  createdAt:"2025-03-09T08:00:00Z" },
  { id:"al6", type:"initiative", severity:"info",     title:"Iniciativa próxima a vencer",  message:"'Programa Punta Partners' vence en 30 días con 30% de avance.",    entityId:"ini7",  entityType:"initiative",read:true,  createdAt:"2025-03-08T09:00:00Z" },
];

// ── HOSHIN / X-MATRIX ─────────────────────────────────────────
export const HOSHIN = {
  initiatives: ["HIS RTR3S","Calidad NOM","Cultura RRHH","KRIs/KPIs","Mkt Aseguradoras"],
  annualObjectives: ["Admisiones +20%","NPS ≥85","Uptime ≥99.5%","Cert. Personal 90%"],
  responsibles: ["Dir. Médica","Dir. Comercial","Dir. Admon","Gte. Calidad"],
  corrIM_OA: [["p","s","",""],["p","p","s","s"],["","","p",""],["","s","s","p"],["s","p","","s"]],
  corrIM_RS: [["p","","s","s"],["s","p","","s"],["","","p",""],["s","","s","p"],["","p","s",""]],
};

// ── STRATEGY MAP NODES (grafo causa-efecto) ───────────────────
export const STRATEGY_MAP_NODES = [
  // Aprendizaje
  { id:"n1",  label:"Personal Certificado",      perspective:"apr", x:50,  y:520, objectiveId:"so10" },
  { id:"n2",  label:"Cultura Seguridad",         perspective:"apr", x:280, y:520, objectiveId:"so11" },
  { id:"n3",  label:"Digitalización Expedientes",perspective:"apr", x:510, y:520, objectiveId:"so12" },
  // Procesos
  { id:"n4",  label:"HIS Hospitalario",          perspective:"pro", x:50,  y:360, objectiveId:"so7"  },
  { id:"n5",  label:"Certificación NOM",         perspective:"pro", x:280, y:360, objectiveId:"so8"  },
  { id:"n6",  label:"Admisión Rápida <10min",    perspective:"pro", x:510, y:360, objectiveId:"so9"  },
  // Clientes
  { id:"n7",  label:"NPS ≥ 85 pts",             perspective:"cli", x:100, y:200, objectiveId:"so4"  },
  { id:"n8",  label:"Médicos Fidelizados",       perspective:"cli", x:340, y:200, objectiveId:"so5"  },
  { id:"n9",  label:"Oncología Integral",        perspective:"cli", x:550, y:200, objectiveId:"so6"  },
  // Finanzas
  { id:"n10", label:"Ingresos Admisiones +20%",  perspective:"fin", x:100, y:60,  objectiveId:"so1"  },
  { id:"n11", label:"EBITDA Positivo",           perspective:"fin", x:340, y:60,  objectiveId:"so2"  },
  { id:"n12", label:"BRAINLAB & Robótica",       perspective:"fin", x:560, y:60,  objectiveId:"so3"  },
];

export const STRATEGY_MAP_EDGES = [
  { from:"n1", to:"n5" }, { from:"n1", to:"n7" },
  { from:"n2", to:"n5" }, { from:"n2", to:"n7" },
  { from:"n3", to:"n4" }, { from:"n3", to:"n6" },
  { from:"n4", to:"n6" }, { from:"n4", to:"n8" },
  { from:"n5", to:"n7" }, { from:"n5", to:"n8" },
  { from:"n6", to:"n7" }, { from:"n6", to:"n10"},
  { from:"n7", to:"n10"},{ from:"n7", to:"n11"},
  { from:"n8", to:"n10"},{ from:"n8", to:"n11"},
  { from:"n9", to:"n11"},{ from:"n9", to:"n12"},
];

// ── SIMULADOR ─────────────────────────────────────────────────
export const SIMULATOR_SCENARIOS = [
  {
    id:"sc1", name:"Incremento Inversión Marketing +30%",
    description:"Aumentar presupuesto de marketing y captación en un 30%",
    inputs:{ marketingBudget:+30, admissions:+12, nps:+3, costs:+8 },
    impacts:{ revenue:+15, ebitda:+4, nps:+3, admissions:+12 },
  },
  {
    id:"sc2", name:"Reducción Costos Operativos -15%",
    description:"Programa de eficiencia y reducción de gastos operativos",
    inputs:{ operationalCosts:-15, headcount:-5, admissions:-2, nps:-4 },
    impacts:{ revenue:-2, ebitda:+11, nps:-4, admissions:-2 },
  },
  {
    id:"sc3", name:"Apertura Oncología Full",
    description:"Lanzamiento completo del programa de oncología integral",
    inputs:{ investment:+500000, oncologyPatients:+40, revenue:+18, costs:+12 },
    impacts:{ revenue:+18, ebitda:+5, nps:+6, admissions:+8 },
  },
  {
    id:"sc4", name:"Digitalización Acelerada 6 meses",
    description:"Completar digitalización total en la mitad del tiempo",
    inputs:{ investment:+200000, processSpeed:+25, errors:-30, nps:+5 },
    impacts:{ revenue:+6, ebitda:+8, nps:+5, admissions:+4 },
  },
];

// ── KPI PREDICTIONS (modelo lineal simple) ────────────────────
export const KPI_PREDICTIONS = {
  kpi1:  { months: [129,131,133,135,136,138], confidence: 0.82 },
  kpi5:  { months: [79, 80, 81, 82, 83, 85],  confidence: 0.78 },
  kpi9:  { months: [99, 99.1,99.2,99.3,99.4,99.5], confidence: 0.91 },
  kpi11: { months: [84, 86, 87, 89, 91, 93],  confidence: 0.85 },
  kpi13: { months: [70, 72, 74, 76, 78, 80],  confidence: 0.80 },
  kpi12: { months: [20, 18, 16, 14, 12, 10],  confidence: 0.75 },
};

// ── RADAR DATA ────────────────────────────────────────────────
export const RADAR_DATA = [
  { dimension:"Financiero",  actual:55, target:100, benchmark:65 },
  { dimension:"Clientes",    actual:62, target:100, benchmark:70 },
  { dimension:"Procesos",    actual:70, target:100, benchmark:68 },
  { dimension:"Aprendizaje", actual:65, target:100, benchmark:60 },
  { dimension:"Innovación",  actual:48, target:100, benchmark:55 },
  { dimension:"Riesgos",     actual:72, target:100, benchmark:63 },
];

// ── BENCHMARK ─────────────────────────────────────────────────
export const BENCHMARK_DATA = [
  { metric:"NPS Pacientes",        company:78, industry:72, top10:90,  unit:"pts" },
  { metric:"Rotación Personal",    company:14, industry:22, top10:8,   unit:"%"   },
  { metric:"Uptime Sistemas",      company:98.8,industry:97, top10:99.5,unit:"%"  },
  { metric:"T. Admisión (min)",    company:22, industry:30, top10:8,   unit:"min",inverse:true },
  { metric:"Camas Ocupadas",       company:74, industry:68, top10:85,  unit:"%"   },
  { metric:"Satisfacción Médicos", company:71, industry:65, top10:88,  unit:"pts" },
];

// ── MESES ─────────────────────────────────────────────────────
export const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ── COLORES ESTADO ────────────────────────────────────────────
export const STATUS_CONFIG = {
  on_track:    { label:"En curso",    color:"#059669", bg:"#d1fae5", border:"#6ee7b7", icon:"✅" },
  at_risk:     { label:"En riesgo",   color:"#d97706", bg:"#fef3c7", border:"#fcd34d", icon:"⚠️" },
  completed:   { label:"Completado",  color:"#1d4ed8", bg:"#dbeafe", border:"#93c5fd", icon:"🏆" },
  not_started: { label:"Sin iniciar", color:"#6b7280", bg:"#f3f4f6", border:"#d1d5db", icon:"⭕" },
  critical:    { label:"Crítico",     color:"#dc2626", bg:"#fee2e2", border:"#fca5a5", icon:"🚨" },
};

export const TRAFFIC_LIGHT = {
  green:  { color:"#059669", bg:"#d1fae5", label:"Meta" },
  yellow: { color:"#d97706", bg:"#fef3c7", label:"Riesgo" },
  red:    { color:"#dc2626", bg:"#fee2e2", label:"Crítico" },
};
