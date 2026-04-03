# StratexPoints v3.0 (Enterprise SaaS Release)
## Plataforma Multi-Tenant de Inteligencia Estratégica

### Instalación

1. Clona el repositorio
2. Instala dependencias:
```bash
npm install
```

3. Crea el archivo `.env.local` con tus credenciales:
```
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
VITE_GROQ_KEY=tu_groq_key
```

4. Copia los archivos de tu proyecto anterior que NO están en este ZIP:
- supabase.js
- services.js
- forms.jsx
- components/modules/Login.jsx
- Dashboard.jsx
- BSC.jsx
- AIInsights.jsx
- ExecutivePanel.jsx
- BowlingChart.jsx
- Simulator.jsx
- Chat.jsx
- StrategyMap.jsx
- Prediction.jsx
- Export.jsx
- DocAnalyzer.jsx
- OKRGenerator.jsx
- Benchmark.jsx
- RadarStrategic.jsx
- PowerPoint.jsx
- StrategicEngine.jsx
- StrategicBus.jsx
- IntelligentCore.jsx
- EventBus.js
- CommandCenter.jsx
- SuperAdmin.jsx

5. Corre el proyecto:
```bash
npm run dev
```

### Módulos (10 módulos fusionados)
- 🏠 Inicio — Command Center ejecutivo
- ⚡ Centro Estrategico — Motor IA + Bus + Nucleo
- 🗺️ Estrategia — BSC + Mapa Visual
- 🎯 OKRs — Lista + Generador IA
- 📊 KPIs — Indicadores + Bowling + Prediccion
- 🚀 Iniciativas — Lista + Kanban + Simulador
- 🤖 Inteligencia IA — Chat + IA + Docs
- 📈 Analitica — Dashboard + Radar + Benchmark
- 📤 Reportes — PDF + Excel + Word + PPT
- 🔔 Alertas — Centro de alertas

### Funcionalidades
- CMD+K para búsqueda rápida
- Modo oscuro/claro automático
- Sidebar colapsable
- Diseño responsive

### Novedades en v3.0 (SaaS Multi-Tenant)
- 🏢 **Arquitectura Multi-Tenant:** Segregación total de datos. Múltiples empresas pueden usar la plataforma de forma independiente con sus propios subdominios y logos.
- 💳 **Motor de Facturación:** Control de licencias, precios por plan y emisión automática de estados de cuenta vía email (Resend).
- 🔒 **Gobernanza y RBAC:** Sistema de roles (Super Admin, Admin de Empresa, Editor, Viewer) y aislamiento de datos por Departamento/Área.
- 👔 **Executive Summary (CSO):** Dashboard de alto nivel basado en la Pirámide de Minto para toma de decisiones ejecutivas en menos de 5 minutos.
- 💅 **Soft UI Premium:** Rediseño completo de interfaces, modales unificados, botones redondeados y micro-interacciones.

### Versiones Anteriores (v2.x)
- Matriz Anual Enterprise interactiva (52 semanas).
- IA Avanzada (Groq Llama 3.3 70B) con modo JSON estricto.
- Mapa Estratégico (BSC) exportable a PDF de alta resolución.
- Importador Mágico (DocAnalyzer) desde PDF, Word y Excel.
- Generador automático de Presentaciones PowerPoint (.pptx).
