import logger from '../../utils/logger.js';
import React, { useState } from 'react';
import { supabase } from '../../supabase.js';
import { initializeJWTMonitoring } from '../../utils/jwtUtils.js';
import BrandLogo from '../../BrandLogo.jsx';
import { BRAND } from '../../brand.js';

const getErrorText = (message = '') => {
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials'))
    return 'Correo o contraseña incorrectos.';
  if (message.includes('Email not confirmed'))
    return 'Tu correo aún no está verificado. Revisa tu bandeja de entrada.';
  if (message.includes('Too many requests'))
    return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
  return 'No se pudo iniciar sesión. Verifica tus datos.';
};

/** ¿La cuenta tiene verificación en dos pasos y falta el segundo paso? */
export async function needsSecondFactor() {
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2';
  } catch { return false; }
}

const Status = ({ type, text }) => (
  <div role="status" style={{
    padding: '11px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500,
    background: type === 'success' ? 'var(--green-light)' : 'var(--red-light)',
    color: type === 'success' ? 'var(--green)' : 'var(--red)',
    border: '1px solid ' + (type === 'success' ? 'var(--green)' : 'var(--red)'),
  }}>{text}</div>
);

const inputStyle = { padding: '14px 16px', fontSize: 16, borderRadius: 12 };
const primaryBtn = (loading) => ({
  width: '100%', padding: '14px 20px', borderRadius: 980, fontSize: 16, fontWeight: 500,
  background: 'var(--primary)', color: '#fff', opacity: loading ? 0.7 : 1,
  cursor: loading ? 'not-allowed' : 'pointer',
});

export const LoginIntegrated = ({ mfaPending = false, onVerified }) => {
  const [step, setStep] = useState(mfaPending ? 'mfa' : 'login'); // login | reset | mfa
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const clearMsg = () => msg.text && setMsg({ type: '', text: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({ type: '', text: '' });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      if (await needsSecondFactor()) { setStep('mfa'); return; }
      setMsg({ type: 'success', text: 'Acceso correcto. Cargando…' });
      initializeJWTMonitoring().catch(() => {});
      // App.jsx detecta la sesión (onAuthStateChange) y carga el perfil.
    } catch (err) {
      logger.error('[Login] Error de autenticación:', err);
      setMsg({ type: 'error', text: getErrorText(err.message) });
    } finally { setLoading(false); }
  };

  const handleMfa = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({ type: '', text: '' });
    try {
      const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
      if (fErr) throw fErr;
      const factor = (factors?.totp || []).find((f) => f.status === 'verified');
      if (!factor) throw new Error('No se encontró el factor de verificación.');
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code });
      if (vErr) throw new Error('Código incorrecto o vencido.');
      setMsg({ type: 'success', text: 'Verificado. Cargando…' });
      if (onVerified) onVerified();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally { setLoading(false); }
  };

  const cancelMfa = async () => {
    await supabase.auth.signOut();
    setStep('login'); setCode(''); setPassword(''); setMsg({ type: '', text: '' });
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({ type: '', text: '' });
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin });
    setLoading(false);
    if (error) setMsg({ type: 'error', text: 'No se pudo enviar el enlace. Verifica el correo.' });
    else { setResetSent(true); setMsg({ type: 'success', text: 'Te enviamos un enlace. Revisa tu bandeja y la carpeta de spam.' }); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      <aside className="login-aside" style={{
        flex: '1 1 50%', background: '#000', color: '#F5F5F7',
        padding: 'clamp(40px, 6vw, 72px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <BrandLogo size={44} light />
        <div style={{ maxWidth: 520 }}>
          <div style={{ width: 40, height: 3, borderRadius: 3, background: '#0A84FF', marginBottom: 28 }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.03em', fontSize: 'clamp(36px, 3.8vw, 56px)', lineHeight: 1.05, marginBottom: 20 }}>
            {BRAND.tagline}
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(245,245,247,.62)', maxWidth: '52ch' }}>
            Mapa estratégico, OKRs, indicadores e iniciativas del despacho, con análisis asistido por IA.
          </p>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(245,245,247,.4)' }}>
          {BRAND.legalName}. Uso interno y confidencial.
        </div>
      </aside>

      <main style={{ flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div className="login-mobile-logo" style={{ marginBottom: 32 }}><BrandLogo size={36} /></div>

          {step === 'login' && (
            <form onSubmit={handleLogin}>
              <h2 className="brand-display" style={{ fontSize: 30, color: 'var(--text)', marginBottom: 6 }}>Iniciar sesión</h2>
              <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 28 }}>{BRAND.product}</p>

              <label className="sp-label" htmlFor="login-email">Correo</label>
              <input id="login-email" className="sp-input" type="email" placeholder="nombre@empresa.com"
                value={email} onChange={(e) => { setEmail(e.target.value); clearMsg(); }} autoFocus autoComplete="email" required
                style={{ ...inputStyle, marginBottom: 18 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label className="sp-label" htmlFor="login-pass">Contraseña</label>
                <button type="button" onClick={() => { setStep('reset'); setMsg({ type: '', text: '' }); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }}>
                  ¿La olvidaste?
                </button>
              </div>
              <div style={{ position: 'relative', marginBottom: 22 }}>
                <input id="login-pass" className="sp-input" type={showPassword ? 'text' : 'password'}
                  value={password} onChange={(e) => { setPassword(e.target.value); clearMsg(); }} autoComplete="current-password" required
                  style={{ ...inputStyle, paddingRight: 72 }} />
                <button type="button" onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12, fontWeight: 600 }}>
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {msg.text && <Status {...msg} />}
              <button type="submit" disabled={loading} className="sp-btn" style={primaryBtn(loading)}>
                {loading ? 'Verificando…' : 'Entrar'}
              </button>
            </form>
          )}

          {step === 'mfa' && (
            <form onSubmit={handleMfa}>
              <h2 className="brand-display" style={{ fontSize: 28, color: 'var(--text)', marginBottom: 6 }}>Verificación en dos pasos</h2>
              <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>Escribe el código de 6 dígitos de tu app de autenticación.</p>
              <input className="sp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
                value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); clearMsg(); }}
                style={{ ...inputStyle, fontSize: 22, letterSpacing: 8, textAlign: 'center', marginBottom: 20 }} aria-label="Código de verificación" />
              {msg.text && <Status {...msg} />}
              <button type="submit" disabled={loading || code.length < 6} className="sp-btn" style={primaryBtn(loading)}>
                {loading ? 'Verificando…' : 'Verificar y entrar'}
              </button>
              <button type="button" onClick={cancelMfa}
                style={{ width: '100%', marginTop: 14, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13 }}>
                Usar otra cuenta
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleReset}>
              <h2 className="brand-display" style={{ fontSize: 28, color: 'var(--text)', marginBottom: 6 }}>Recuperar contraseña</h2>
              <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>Te enviaremos un enlace para crear una nueva.</p>
              {!resetSent && (
                <>
                  <label className="sp-label" htmlFor="reset-email">Correo</label>
                  <input id="reset-email" className="sp-input" type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); clearMsg(); }} autoFocus autoComplete="email" required
                    style={{ ...inputStyle, marginBottom: 20 }} />
                </>
              )}
              {msg.text && <Status {...msg} />}
              {!resetSent && (
                <button type="submit" disabled={loading} className="sp-btn" style={primaryBtn(loading)}>
                  {loading ? 'Enviando…' : 'Enviar enlace'}
                </button>
              )}
              <button type="button" onClick={() => { setStep('login'); setResetSent(false); setMsg({ type: '', text: '' }); }}
                style={{ width: '100%', marginTop: 14, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13 }}>
                Volver a iniciar sesión
              </button>
            </form>
          )}
        </div>
      </main>

      <style>{`
        .login-mobile-logo{display:none}
        @media (max-width: 860px){ .login-aside{display:none!important} .login-mobile-logo{display:block} }
      `}</style>
    </div>
  );
};

export default LoginIntegrated;

/** Pantalla para definir nueva contraseña al llegar desde el enlace de recuperación. */
export function NewPasswordScreen({ onDone }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (a.length < 8) return setMsg({ type: 'error', text: 'Usa al menos 8 caracteres.' });
    if (a !== b) return setMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: a });
    setLoading(false);
    if (error) return setMsg({ type: 'error', text: 'No se pudo guardar: ' + error.message });
    setMsg({ type: 'success', text: 'Contraseña guardada. Entrando…' });
    if (onDone) onDone();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <form onSubmit={submit} style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: 28 }}><BrandLogo size={36} /></div>
        <h2 className="brand-display" style={{ fontSize: 28, color: 'var(--text)', marginBottom: 6 }}>Crea tu nueva contraseña</h2>
        <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>Mínimo 8 caracteres.</p>
        <label className="sp-label" htmlFor="np-a">Nueva contraseña</label>
        <input id="np-a" className="sp-input" type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} autoFocus required />
        <label className="sp-label" htmlFor="np-b">Confirmar contraseña</label>
        <input id="np-b" className="sp-input" type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} style={{ ...inputStyle, marginBottom: 20 }} required />
        {msg.text && <Status {...msg} />}
        <button type="submit" disabled={loading} className="sp-btn" style={primaryBtn(loading)}>{loading ? 'Guardando…' : 'Guardar contraseña'}</button>
      </form>
    </div>
  );
}

/** Activación obligatoria de verificación en dos pasos (administradores). */
export function Activar2FAObligatorio({ onListo, onSalir }) {
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  React.useEffect(() => {
    (async () => {
      const { data: ex } = await supabase.auth.mfa.listFactors();
      for (const f of (ex?.totp || []).filter((x) => x.status === 'unverified')) await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'C&C ' + new Date().toISOString().slice(0, 10) });
      if (error) setMsg({ type: 'error', text: error.message });
      else setSetup({ qr: data.totp.qr_code, secret: data.totp.secret, factorId: data.id });
    })();
  }, []);

  const verificar = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg({ type: '', text: '' });
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: setup.factorId });
    if (chErr) { setLoading(false); return setMsg({ type: 'error', text: chErr.message }); }
    const { error } = await supabase.auth.mfa.verify({ factorId: setup.factorId, challengeId: ch.id, code });
    setLoading(false);
    if (error) return setMsg({ type: 'error', text: 'Código incorrecto. Revisa la hora de tu teléfono e intenta de nuevo.' });
    setMsg({ type: 'success', text: 'Verificación activada. Entrando…' });
    onListo();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <form onSubmit={verificar} className="sp-card" style={{ width: '100%', maxWidth: 460, padding: 32 }}>
        <BrandLogo size={36} />
        <h2 className="brand-display" style={{ fontSize: 26, margin: '20px 0 6px' }}>Protege tu cuenta de administrador</h2>
        <p style={{ color: 'var(--text3)', fontSize: 14, lineHeight: 1.55, marginBottom: 20 }}>
          Por seguridad, las cuentas con acceso de administrador requieren verificación en dos pasos.
          Escanea el código con Google Authenticator, Microsoft Authenticator o Authy y escribe el código de 6 dígitos.
        </p>
        {setup ? (
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
            <img src={setup.qr} alt="Código QR de verificación" style={{ width: 160, height: 160, background: '#fff', padding: 8, borderRadius: 14, border: '1px solid var(--border)' }} />
            <div style={{ flex: 1, minWidth: 160, fontSize: 12, color: 'var(--text3)' }}>¿No puedes escanear? Captura esta clave en tu app:<div style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--text)', fontSize: 13, wordBreak: 'break-all', marginTop: 6, userSelect: 'all' }}>{setup.secret}</div></div>
          </div>
        ) : <div style={{ padding: 20, color: 'var(--text3)', fontSize: 13 }}>Preparando código…</div>}
        <input className="sp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000" aria-label="Código de 6 dígitos" style={{ ...inputStyle, fontSize: 22, letterSpacing: 8, textAlign: 'center', marginBottom: 16 }} />
        {msg.text && <Status {...msg} />}
        <button type="submit" disabled={loading || code.length < 6 || !setup} className="sp-btn" style={primaryBtn(loading)}>{loading ? 'Verificando…' : 'Activar y entrar'}</button>
        <button type="button" onClick={onSalir} style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13 }}>Cerrar sesión</button>
      </form>
    </div>
  );
}
