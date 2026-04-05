import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App.jsx';
import './src/i18n.js';
import './src/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<div>Cargando...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>
);
