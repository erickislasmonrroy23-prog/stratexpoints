#!/bin/bash
FILES=(
  "Dashboard.jsx" "BSC.jsx" "AIInsights.jsx" "ExecutivePanel.jsx" 
  "BowlingChart.jsx" "Simulator.jsx" "Chat.jsx" "StrategyMap.jsx" 
  "Prediction.jsx" "Export.jsx" "DocAnalyzer.jsx" "OKRGenerator.jsx" 
  "Benchmark.jsx" "RadarStrategic.jsx" "PowerPoint.jsx" "StrategicEngine.jsx" 
  "StrategicBus.jsx" "IntelligentCore.jsx" "CommandCenter.jsx" "SuperAdmin.jsx"
)

for file in "${FILES[@]}"; do
  COMPONENT_NAME="${file%.*}"
  cat <<EOT > "$file"
import React from 'react';
export default function $COMPONENT_NAME() {
  return (
    <div className="sp-card" style={{ padding: 24 }}>
      <h2>Módulo: $COMPONENT_NAME</h2>
      <p style={{ color: 'var(--text3)' }}>Construcción en progreso o pendiente de importar.</p>
    </div>
  );
}
EOT
  echo "Creado: $file"
done

# EventBus.js necesita una estructura distinta
cat <<EOT > "EventBus.js"
export const EventBus = {
  events: {},
  emit: function(event, data) { if (this.events[event]) this.events[event].forEach(cb => cb(data)); },
  on: function(event, cb) { if (!this.events[event]) this.events[event] = []; this.events[event].push(cb); }
};
EOT
echo "Creado: EventBus.js"
