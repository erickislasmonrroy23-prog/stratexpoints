import React from 'react';
// IMPORTANTE: Como no tienes carpeta src, usamos ./ para buscar en la raíz
import { supabase } from './supabase.js'; 

function App() {
  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#0EA5A0' }}>StratexPoints</h1>
      <p>Si puedes ver esto, el servidor funciona correctamente.</p>
      
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '10px', display: 'inline-block', backgroundColor: '#f9f9f9' }}>
        <h3>Prueba de Conexión</h3>
        <p>El archivo <strong>App.jsx</strong> ahora sabe dónde está <strong>supabase.js</strong>.</p>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>Próximo paso: Activar el formulario de Login.</p>
      </div>
    </div>
  );
}

export default App;
