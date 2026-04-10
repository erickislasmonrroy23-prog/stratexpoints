import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function fetchTenant() {
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      
      // Si hay un subdominio válido (ej: acme.xtratia.com), buscamos a la empresa
      try {
        if (subdomain && subdomain !== 'www' && subdomain !== 'localhost' && subdomain !== '127') {
          const { data, error } = await supabase.from('organizations').select('*').eq('subdomain', subdomain).single();
          if (error) throw error;
          if (data) {
            setTenant(data);
            // Magia: Cambiamos el color base de todo el sistema por el color de la empresa
            document.documentElement.style.setProperty('--primary', data.theme_color);
          }
        }
      } catch (error) {
        console.error("Error fetching tenant by subdomain:", error);
        // No es un error crítico, la página de login puede funcionar sin datos del tenant.
      }
    }
    fetchTenant();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Mensaje de error más amigable para el usuario en lugar del mensaje técnico de la API.
      notificationService.error("Correo o contraseña incorrectos. Por favor, verifica tus datos.");
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      notificationService.error("Por favor, ingresa tu correo electrónico para enviarte el enlace de recuperación.");
      return;
    }
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setResetting(false);
    
    if (error) notificationService.error("Error: " + error.message);
    else notificationService.success("Te hemos enviado un enlace a tu correo. Revisa tu bandeja de entrada (y spam).");
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <div style={{ flex: 1, background: 'linear-gradient(135deg, var(--bg2), var(--primary-light))', padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid var(--border)' }} className="hide-on-mobile">
        <img src={tenant && tenant.logo_url ? tenant.logo_url : '/xtratia-logo.jpg'} alt='Xtratia' style={{ maxHeight: 80, maxWidth: 220, objectFit: 'contain', marginBottom: 32, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }} onError={e => { e.target.style.display='none'; }} />
        
        <h1 className="scale-in" style={{ fontSize: 48, fontWeight: 800, marginBottom: 24, lineHeight: 1.1, color: 'var(--text)', letterSpacing: '-1px' }}>
          {tenant ? <>Bóveda estratégica de<br/><span style={{ color: 'var(--primary)' }}>{tenant.name}.</span></> : <>El motor de tu<br/><span style={{ color: 'var(--primary)' }}>estrategia AI.</span></>}
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text2)', lineHeight: 1.6, maxWidth: 500, fontWeight: 500 }}>
          {tenant ? 'Inicia sesión para acceder a tu Command Center, OKRs y KPIs asignados.' : 'Xtratia unifica tus OKRs, KPIs e iniciativas bajo un núcleo de Inteligencia Artificial que predice resultados.'}
        </p>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <form onSubmit={handleLogin} className="sp-card fade-up" style={{ padding: 48, width: '100%', maxWidth: 420, borderRadius: 24, boxShadow: '0 24px 48px rgba(0,0,0,0.05)' }}>
          <h2 style={{ marginBottom: 8, textAlign: 'center', color: 'var(--text)', fontSize: 24, fontWeight: 800 }}>Bienvenido de nuevo</h2>
          <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 14, marginBottom: 32 }}>{tenant ? 'Accede a tu cuenta corporativa.' : 'Ingresa tus credenciales para acceder al sistema.'}</p>
          <label className="sp-label" style={{ marginBottom: 8, fontSize: 12 }}>Correo Electrónico</label>
          <input className="sp-input scale-in" type="email" placeholder="ejemplo@empresa.com" value={email} onChange={e => setEmail(e.target.value)} style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 14, fontSize: 14 }} required />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <label className="sp-label" style={{ fontSize: 12, margin: 0 }}>Contraseña</label>
            <button type="button" onClick={handleResetPassword} disabled={resetting} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', fontWeight: 600, padding: 0 }}>{resetting ? 'Enviando...' : '¿Olvidaste tu contraseña?'}</button>
          </div>
          <div style={{ position: 'relative', marginBottom: 32 }}>
            <input className="sp-input scale-in" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '14px 16px', borderRadius: 14, fontSize: 14, paddingRight: 48, width: '100%', boxSizing: 'border-box' }} required />
            <button type="button" onClick={() => setShowPassword(function(v){ return !v; })} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18, padding: 0, lineHeight: 1 }}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <button type="submit" className="sp-btn scale-in" style={{ width: '100%', justifyContent: 'center', fontSize: 15, fontWeight: 800, padding: '16px', background: 'var(--primary)', color: '#fff', borderRadius: 99, border: '2px solid transparent', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', alignItems: 'center', gap: 8, animationDelay: '0.1s' }} onMouseEnter={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; e.currentTarget.querySelector('span').style.transform = 'translateX(4px)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.querySelector('span').style.transform = 'translateX(0)'; }}>
            Acceder a la Plataforma <span style={{ fontSize: 18, transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>→</span>
          </button>
        </form>
      </div>
      <style>{`.hide-on-mobile { display: flex; } @media (max-width: 768px) { .hide-on-mobile { display: none !important; } }`}</style>
    </div>
  );
}