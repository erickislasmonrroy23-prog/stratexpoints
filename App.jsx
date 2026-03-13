import { useState } from "react";

export default function App() {
  const [module, setModule] = useState("dashboard");

  const MenuButton = ({ id, label }) => (
    <button
      onClick={() => setModule(id)}
      style={{
        padding: "10px 16px",
        margin: "5px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        background: module === id ? "#2563eb" : "#e5e7eb",
        color: module === id ? "white" : "black",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ fontFamily: "Arial", padding: "30px", background: "#f3f4f6", minHeight: "100vh" }}>
      <h1>StratexPoints — Strategic Execution Platform</h1>

      <div style={{ marginBottom: "20px" }}>
        <MenuButton id="dashboard" label="Dashboard" />
        <MenuButton id="bsc" label="Mapa BSC" />
        <MenuButton id="okr" label="OKR Tracker" />
        <MenuButton id="kpi" label="KPIs" />
        <MenuButton id="ai" label="IA Documentos" />
      </div>

      {module === "dashboard" && <Dashboard />}
      {module === "bsc" && <BSC />}
      {module === "okr" && <OKR />}
      {module === "kpi" && <KPIs />}
      {module === "ai" && <AIReader />}
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "10px",
        width: "200px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
      }}
    >
      <h3>{title}</h3>
      <p style={{ fontSize: "24px", fontWeight: "bold" }}>{value}</p>
    </div>
  );
}

function Dashboard() {
  return (
    <div>
      <h2>Dashboard Ejecutivo</h2>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <Card title="Pacientes Atendidos" value="1,245" />
        <Card title="Ingresos Mensuales" value="$3.2M" />
        <Card title="Satisfacción Paciente" value="92%" />
        <Card title="Eficiencia Operativa" value="88%" />
      </div>

      <h3 style={{ marginTop: "30px" }}>Indicadores Estratégicos</h3>

      <ul>
        <li>📈 Crecimiento financiero estable</li>
        <li>🏥 Alta ocupación hospitalaria</li>
        <li>⭐ Satisfacción del paciente en aumento</li>
      </ul>
    </div>
  );
}

function BSC() {
  return (
    <div>
      <h2>Mapa Estratégico Balanced Scorecard</h2>

      <h3>Financiera</h3>
      <ul>
        <li>Crecimiento de ingresos</li>
        <li>Optimización de costos</li>
      </ul>

      <h3>Pacientes</h3>
      <ul>
        <li>Experiencia del paciente</li>
        <li>Calidad clínica</li>
      </ul>

      <h3>Procesos Internos</h3>
      <ul>
        <li>Eficiencia quirúrgica</li>
        <li>Reducción de tiempos de espera</li>
      </ul>

      <h3>Aprendizaje y Crecimiento</h3>
      <ul>
        <li>Capacitación médica</li>
        <li>Innovación tecnológica</li>
      </ul>
    </div>
  );
}

function OKR() {
  return (
    <div>
      <h2>OKR Tracker</h2>

      <h3>Objetivo</h3>
      <p>Mejorar la eficiencia operativa hospitalaria.</p>

      <h4>Resultados Clave</h4>

      <ul>
        <li>Reducir tiempos de espera en 20%</li>
        <li>Aumentar satisfacción del paciente a 90%</li>
        <li>Optimizar costos operativos en 15%</li>
      </ul>
    </div>
  );
}

function KPIs() {
  return (
    <div>
      <h2>Bowling Chart KPIs</h2>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>KPI</th>
            <th>Ene</th>
            <th>Feb</th>
            <th>Mar</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ingresos</td>
            <td>🟢</td>
            <td>🟡</td>
            <td>🟢</td>
          </tr>
          <tr>
            <td>Satisfacción Paciente</td>
            <td>🟢</td>
            <td>🟢</td>
            <td>🟡</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function AIReader() {
  return (
    <div>
      <h2>Lector de Documentos IA</h2>

      <p>Sube documentos estratégicos para análisis con IA.</p>

      <input type="file" />

      <p style={{ marginTop: "10px", color: "gray" }}>
        Próximamente: análisis automático de PDF, Excel y PowerPoint.
      </p>
    </div>
  );
}
