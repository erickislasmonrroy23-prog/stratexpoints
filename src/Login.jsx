import React, { useState } from 'react';
import { supabase } from './supabase.js';
import { useStore } from './store.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [resetSent, setResetSent] = useState(false);
  const tenant = useStore(s => s.currentOrganization);

  const getErrorText = (message = '') => {
    if (message.includes('Invalid login credentials') || message.includes('invalid_credentials'))
      return 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.';
    if (message.includes('Email not confirmed'))
      return 'Tu correo aún no está verificado. Revisa tu bandeja de entrada.';
    if (message.includes('Too many requests'))
      return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
    if (message.includes('User not found'))
      return 'No encontramos una cuenta con ese correo.';
    return 'Error al iniciar sesión. Verifica tus credenciales.';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setStatusMsg({ type: 'error', text: getErrorText(error.message) });
    } else {
      setStatusMsg({ type: 'success', text: 'Acceso correcto. Cargando tu plataforma...' });
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg({ type: '', text: '' });
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      setStatusMsg({ type: 'error', text: 'No pudimos enviar el enlace. Verifica el correo e intenta de nuevo.' });
    } else {
      setResetSent(true);
      setStatusMsg({ type: 'success', text: 'Enlace enviado. Revisa tu bandeja de entrada y la carpeta de spam.' });
    }
  };

  const handleFieldChange = (setter) => (e) => {
    setter(e.target.value);
    if (statusMsg.text) setStatusMsg({ type: '', text: '' });
  };

  const StatusBanner = ({ type, text }) => (
    <div style={{
      padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
      background: type === 'success' ? '#dcfce7' : '#fee2e2',
      color: type === 'success' ? '#16a34a' : '#dc2626',
      border: '1px solid ' + (type === 'success' ? '#86efac' : '#fecaca'),
      display: 'flex', alignItems: 'flex-start', gap: 8
    }}>
      <span style={{ flexShrink: 0 }}>{type === 'success' ? '✅' : '❌'}</span>
      <span>{text}</span>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Panel izquierdo */}
      <div className="hide-on-mobile" style={{
        flex: 1,
        background: 'linear-gradient(135deg, var(--bg2), var(--primary-light))',
        padding: 60,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderRight: '1px solid var(--border)'
      }}>
        {/* Logo: usa logo del tenant si existe, si no el logo SVG de Xtratia */}
        {tenant && tenant.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={tenant.name}
            style={{ maxHeight: 80, maxWidth: 220, objectFit: 'contain', marginBottom: 32, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #14b8a6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99,102,241,0.35)'
            }}>
              <svg viewBox="0 0 32 32" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="10" fill="none" stroke="white" strokeWidth="2.5"/>
                <circle cx="16" cy="16" r="5" fill="none" stroke="white" strokeWidth="2"/>
                <circle cx="16" cy="16" r="2" fill="white"/>
              </svg>
            </div>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', letterSpacing: '-1px' }}>Xtratia</span>
          </div>
        )}

        <h1 className="scale-in" style={{ fontSize: 48, fontWeight: 800, marginBottom: 24, lineHeight: 1.1, color: 'var(--text)', letterSpacing: '-1px' }}>
          {tenant
            ? <><span>Bóveda estratégica de</span><br/><span style={{ color: 'var(--primary)' }}>{tenant.name}.</span></>
            : <><span>El motor de tu</span><br/><span style={{ color: 'var(--primary)' }}>estrategia AI.</span></>
          }
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text2)', lineHeight: 1.6, maxWidth: 500, fontWeight: 500 }}>
          {tenant
            ? 'Inicia sesión para acceder a tu Command Center, OKRs y KPIs asignados.'
            : 'Xtratia unifica tus OKRs, KPIs e iniciativas bajo un núcleo de Inteligencia Artificial que predice resultados.'
          }
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {resetMode ? (
          <form onSubmit={handleReset} className="sp-card fade-up" style={{ padding: 48, width: '100%', maxWidth: 420, borderRadius: 24 }}>
            <h2 style={{ marginBottom: 8, textAlign: 'center', color: 'var(--text)', fontSize: 24, fontWeight: 800 }}>Recuperar contraseña</h2>
            <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 14, marginBottom: 32 }}>
              {resetSent ? 'Revisa también la carpeta de spam si no ves el correo.' : 'Ingresa tu correo y te enviaremos un enlace de acceso.'}
            </p>
            {statusMsg.text && (
              <StatusBanner type={statusMsg.type} text={statusMsg.text} />
            )}
            {!resetSent && (
              <>
                <label className="sp-label" style={{ marginBottom: 8, fontSize: 12 }}>Correo Electrónico</label>
                <input
                  className="sp-input scale-in"
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={handleFieldChange(setEmail)}
                  autoFocus
                  autoComplete="email"
                  style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 14, fontSize: 14 }}
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="sp-btn sp-btn-primary"
                  style={{ width: '100%', padding: '16px 24px', borderRadius: 14, fontSize: 16, fontWeight: 700, marginBottom: 16, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Enviando...' : 'Enviar enlace →'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => { setResetMode(false); setResetSent(false); setStatusMsg({ type: '', text: '' }); }}
              style={{ width: '100%', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 14, marginTop: resetSent ? 16 : 0 }}
            >
              ← Volver al login
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="sp-card fade-up" style={{ padding: 48, width: '100%', maxWidth: 420, borderRadius: 24, boxShadow: '0 24px 48px rgba(0,0,0,0.05)' }}>
            <h2 style={{ marginBottom: 8, textAlign: 'center', color: 'var(--text)', fontSize: 24, fontWeight: 800 }}>Bienvenido de nuevo</h2>
            <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 14, marginBottom: 32 }}>
              {tenant ? 'Accede a tu cuenta corporativa.' : 'Ingresa tus credenciales para acceder al sistema.'}
            </p>
            <label className="sp-label" style={{ marginBottom: 8, fontSize: 12 }}>Correo Electrónico</label>
            <input
              className="sp-input scale-in"
              type="email"
              placeholder="ejemplo@empresa.com"
              value={email}
              onChange={handleFieldChange(setEmail)}
              autoFocus
              autoComplete="email"
              style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 14, fontSize: 14 }}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="sp-label" style={{ fontSize: 12 }}>Contraseña</label>
              <button type="button" onClick={() => { setResetMode(true); setStatusMsg({ type: '', text: '' }); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 12 }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <input
                className="sp-input scale-in"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={handleFieldChange(setPassword)}
                autoComplete="current-password"
                style={{ padding: '14px 16px', borderRadius: 14, fontSize: 14, paddingRight: 48, width: '100%', boxSizing: 'border-box' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18, padding: 4 }}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {statusMsg.text && (
              <StatusBanner type={statusMsg.type} text={statusMsg.text} />
            )}
            <button
              type="submit"
              disabled={loading}
              className="sp-btn sp-btn-primary"
              style={{ width: '100%', padding: '16px 24px', borderRadius: 14, fontSize: 16, fontWeight: 700, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}
            >
              {loading ? 'Accediendo...' : 'Acceder a la Plataforma →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
