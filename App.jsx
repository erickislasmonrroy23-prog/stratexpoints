import React, { useState } from 'react';
import { supabase } from './supabase'; // Esto conecta con tu archivo supabase.js

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Aquí es donde sucede la magia con Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('¡Bienvenido a StratexPoints!');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>StratexPoints</h1>
      <form onSubmit={handleLogin} style={{ display: 'inline-block', border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
        <h2>Login</h2>
        <input 
          type="email" 
          placeholder="Tu email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          style={{ display: 'block', marginBottom: '10px', width: '200px' }}
        />
        <input 
          type="password" 
          placeholder="Tu contraseña" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          style={{ display: 'block', marginBottom: '10px', width: '200px' }}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  );
}

export default App;
