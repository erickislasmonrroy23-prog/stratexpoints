import React, { useState } from "react";

export default function App() {

  const [module,setModule] = useState("dashboard")
  const [analysis,setAnalysis] = useState("")

  const MenuButton = ({id,label}) => (

    <button
      onClick={()=>setModule(id)}
      style={{
        padding:"10px 16px",
        margin:"6px",
        borderRadius:"8px",
        border:"none",
        cursor:"pointer",
        fontWeight:"bold",
        background: module===id ? "#2563eb" : "#e5e7eb",
        color: module===id ? "white" : "#111"
      }}
    >
      {label}
    </button>

  )

  function analyzeDocument(){

    setAnalysis(`
ANÁLISIS ESTRATÉGICO GENERADO

Hallazgos principales:

• El documento contiene indicadores financieros.
• Se detectan objetivos de crecimiento organizacional.
• Se identifican métricas relacionadas con eficiencia operativa.

Recomendaciones estratégicas:

1. Alinear los OKR con las perspectivas del Balanced Scorecard.
2. Implementar seguimiento mensual de indicadores KPI.
3. Automatizar análisis de desempeño estratégico.
4. Fortalecer enfoque en experiencia del paciente.
5. Crear panel ejecutivo para monitoreo continuo.
`)
  }

  return(

    <div
      style={{
        fontFamily:"Arial",
        padding:"30px",
        background:"#f3f4f6",
        minHeight:"100vh"
      }}
    >

      <h1>StratexPoints — Strategic Execution Platform</h1>

      <div style={{marginBottom:"20px"}}>

        <MenuButton id="dashboard" label="Dashboard Ejecutivo"/>
        <MenuButton id="bsc" label="Mapa Estratégico BSC"/>
        <MenuButton id="okr" label="OKR Tracker"/>
        <MenuButton id="kpi" label="Bowling Chart KPI"/>
        <MenuButton id="ai" label="IA Documentos"/>

      </div>

      {module==="dashboard" && <Dashboard/>}
      {module==="bsc" && <BSC/>}
      {module==="okr" && <OKR/>}
      {module==="kpi" && <KPI/>}
      {module==="ai" && <AI analyzeDocument={analyzeDocument} analysis={analysis}/>}

    </div>
  )
}


function Card({title,value}){

  return(

    <div
      style={{
        background:"white",
        padding:"20px",
        borderRadius:"10px",
        width:"220px",
        boxShadow:"0 2px 6px rgba(0,0,0,0.1)"
      }}
    >

      <h3>{title}</h3>

      <p
        style={{
          fontSize:"26px",
          fontWeight:"bold"
        }}
      >
        {value}
      </p>

    </div>

  )

}


function Dashboard(){

  return(

    <div>

      <h2>Dashboard Ejecutivo</h2>

      <div
        style={{
          display:"flex",
          gap:"20px",
          flexWrap:"wrap"
        }}
      >

        <Card title="Pacientes Atendidos" value="1,245"/>
        <Card title="Ingresos Mensuales" value="$3.2M"/>
        <Card title="Satisfacción Paciente" value="92%"/>
        <Card title="Eficiencia Operativa" value="88%"/>

      </div>

      <h3 style={{marginTop:"30px"}}>Indicadores Estratégicos</h3>

      <ul>
        <li>📈 Crecimiento financiero sostenido</li>
        <li>🏥 Alta demanda hospitalaria</li>
        <li>⭐ Mejora continua en satisfacción del paciente</li>
      </ul>

      <h3 style={{marginTop:"30px"}}>Tendencia de desempeño</h3>

      <div
        style={{
          background:"white",
          padding:"20px",
          borderRadius:"10px",
          width:"500px"
        }}
      >

        ████████░░░░░░░░░░  
        ███████████░░░░░░  
        █████████████░░░  
        ███████████████  

      </div>

    </div>

  )

}


function BSC(){

  return(

    <div>

      <h2>Balanced Scorecard</h2>

      <h3>Perspectiva Financiera</h3>

      <ul>
        <li>Crecimiento de ingresos</li>
        <li>Optimización de costos operativos</li>
      </ul>

      <h3>Perspectiva Pacientes</h3>

      <ul>
        <li>Experiencia del paciente</li>
        <li>Calidad clínica</li>
      </ul>

      <h3>Procesos Internos</h3>

      <ul>
        <li>Eficiencia quirúrgica</li>
        <li>Optimización de flujo hospitalario</li>
      </ul>

      <h3>Aprendizaje y Crecimiento</h3>

      <ul>
        <li>Capacitación médica continua</li>
        <li>Innovación tecnológica</li>
      </ul>

    </div>

  )

}


function OKR(){

  return(

    <div>

      <h2>OKR Tracker</h2>

      <h3>Objetivo Estratégico</h3>

      <p>Incrementar eficiencia operativa hospitalaria</p>

      <h4>Resultados Clave</h4>

      <ul>
        <li>Reducir tiempos de espera 20%</li>
        <li>Aumentar satisfacción del paciente a 90%</li>
        <li>Optimizar costos operativos 15%</li>
      </ul>

    </div>

  )

}


function KPI(){

  return(

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

  )

}


function AI({analyzeDocument,analysis}){

  return(

    <div>

      <h2>IA Estratégica</h2>

      <p>Sube un documento para generar análisis estratégico.</p>

      <input type="file"/>

      <br/><br/>

      <button
        onClick={analyzeDocument}
        style={{
          padding:"10px 20px",
          borderRadius:"8px",
          border:"none",
          background:"#2563eb",
          color:"white",
          cursor:"pointer"
        }}
      >
        Analizar Documento
      </button>

      {analysis &&

        <div
          style={{
            marginTop:"20px",
            background:"white",
            padding:"20px",
            borderRadius:"10px",
            whiteSpace:"pre-line"
          }}
        >

          {analysis}

        </div>

      }

    </div>

  )

}
