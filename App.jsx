import { useState } from "react";

export default function App() {
  const [module, setModule] = useState("dashboard");

  const Button = ({ id, label }) => (
    <button
      onClick={() => setModule(id)}
      style={{
        margin: "5px",
        padding: "10px 16px",
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
    <div style={{ fontFamily: "Arial", padding: "30px" }}>
      <h1>StratexPoints — Strategic Execution Platform</h1>

      <div style={{ marginBottom: "20px" }}>
        <Button id="dashboard" label="Dashboard Ejecutivo" />
        <Button id="bsc" label="Mapa Estratégico BSC" />
        <Button id="okr" label="OKR Tracker" />
        <Button id="kpi" label="Bowling Chart KPIs" />
        <Button id="ai" label="Lector Documentos IA" />
      </div>

      {module === "dashboard" && <Dashboard />}
      {module === "bsc" && <BSC />}
      {module === "okr" && <OKR />}
      {module === "kpi" && <KPIs />}
      {module === "ai" && <AIReader />}
    </div>
  );
}

function Dashboard() {
  return (
    <div>
      <h2>Dashboard Ejecutivo</h2>
      <p>Resumen estratégico del hospital.</p>

      <ul>
        <li>Ingresos mensuales</li>
        <li>Pacientes atendidos</li>
        <li>Satisfacción del paciente</li>
        <li>Indicadores financieros</li>
      </ul>
    </div>
  );
}

function BSC() {
  return (
    <div>
      <h2>Mapa Estratégico BSC</h2>

      <h3>Financiera</h3>
      <ul>
        <li>Crecimiento de ingresos</li>
        <li>Optimización de costos</li>
      </ul>

      <h3>Pacientes</h3>
      <ul>
        <li>Satisfacción del paciente</li>
        <li>Calidad del servicio</li>
      </ul>

      <h3>Procesos</h3>
      <ul>
        <li>Eficiencia quirúrgica</li>
        <li>Reducción de tiempos de espera</li>
      </ul>

      <h3>Aprendizaje</h3>
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
      <p>Mejorar la eficiencia operativa del hospital.</p>

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
            <td>Satisfacción</td>
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
      <p>Próximamente podrás subir:</p>

      <ul>
        <li>PDF</li>
        <li>Excel</li>
        <li>PowerPoint</li>
        <li>Word</li>
      </ul>

      <input type="file" />
    </div>
  );
}
