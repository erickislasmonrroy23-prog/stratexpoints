# Cabrera & Consultores — Sistema de Gestión Estratégica

Herramienta interna (no comercial) de Cabrera & Consultores en Estrategia y Riesgos para
gestionar Mapa Estratégico (BSC), OKRs, KPIs e iniciativas, con análisis asistido por IA.

- Frontend: React + Vite, desplegado en Vercel.
- Datos y acceso: Supabase (instancia única, tabla `instance_settings` para la identidad institucional).
- Administración (solo administradores): usuarios, identidad y logo, seguridad (2FA) y bitácora.

## Variables de entorno (Vercel)
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y al menos una clave de IA:
`VITE_GEMINI_API_KEY`, `VITE_CLAUDE_API_KEY` o `VITE_GROQ_API_KEY`.

## Desarrollo local
```
npm install
npm run dev
```
