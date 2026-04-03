import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Asegúrate de que este es tu componente principal
import './i18n.js';
import './index.css'; // Importa el nuevo archivo CSS global

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div>Cargando...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>
);