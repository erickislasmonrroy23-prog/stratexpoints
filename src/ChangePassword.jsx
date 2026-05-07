import logger from './utils/logger.js';
import React, { useState } from 'react';
import { supabase } from './supabase.js';
import { useStore } from './store.js';
import toast from 'react-hot-toast';

const validatePassword = (password) => {
  const errors = {};
  if (password.length < 12) errors.length = 'La contraseña debe tener al menos 12 caracteres';
  if (!/[A-Z]/.test(password)) errors.uppercase = 'Debe contener al menos una letra mayúscula';
  if (!/[0-9]/.test(password)) errors.numbers = 'Debe contener al menos un número';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.symbols = 'Debe contener al menos un carácter especial (!@#$%^&*)';
  return errors;
};

function PasswordStrengthIndicator({ password }) {
  if (!password) return null;
  const errors = validatePassword(password);
  const score = 4 - Object.keys(errors).length;
  const colors = ['#dc2626', '#ea580c', '#eab308', '#22c55e'];
  const labels = ['Muy débil', 'Débil', 'Regular', 'Fuerte'];
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Fortaleza de contraseña</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: colors[Math.max(0, score - 1)] }}>
          {labels[Math.max(0, score - 1)]}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < score ? colors[i] : 'var(--bg3)', transition: 'all 0.2s' }} />
        ))}
      </div>
      {Object.keys(errors).length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.6 }}>
          {Object.values(errors).map((error, idx) => (
            <div key={idx}>❌ {error}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function PasswordInput({ label, value, onChange, show, onToggleShow, error, name }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={name === 'current' ? '••••••••' : 'Min 12 caracteres, mayúscula, número, símbolo'}
          style={{
            width: '100%', padding: '12px 16px', paddingRight: 48, borderRadius: 12,
            border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
            background: 'var(--bg2)', color: 'var(--text)', fontSize: 14,
            fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box', transition: 'all 0.2s',
          }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18, padding: 4 }}
        >
          {show ? '🙈' : '👁️'}
        </button>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>❌ {error}</div>}
    </div>
  );
}

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const user = useStore(state => state.user);
  const profile = useStore(state => state.profile);
  const setAuth = useStore(state => state.setAuth);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    setLoading(true);

    try {
      const errors = {};
      if (!currentPassword) errors.current = 'Ingresa tu contraseña actual';
      if (!newPassword) errors.new = 'Ingresa la nueva contraseña';
      if (!confirmPassword) errors.confirm = 'Confirma la nueva contraseña';
      if (newPassword !== confirmPassword) errors.confirm = 'Las contraseñas no coinciden';
      const strengthErrors = validatePassword(newPassword);
      if (Object.keys(strengthErrors).length > 0) Object.assign(errors, strengthErrors);

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setLoading(false);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (authError) {
        setValidationErrors({ current: 'Contraseña actual incorrecta' });
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        toast.error(`Error al cambiar contraseña: ${updateError.message}`);
        setLoading(false);
        return;
      }

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ password_rotation_due: false })
        .eq('id', user.id);

      if (dbError) logger.error('Error updating password rotation flag:', dbError);

      setAuth(user, { ...profile, password_rotation_due: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('✅ Contraseña actualizada correctamente');
    } catch (error) {
      logger.error('Error in handlePasswordChange:', error);
      toast.error(`Error inesperado: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <form
        onSubmit={handlePasswordChange}
        style={{ width: '100%', maxWidth: 480, background: 'var(--bg2)', borderRadius: 20, border: '1px solid var(--border)', padding: 48, boxShadow: '0 24px 48px rgba(0,0,0,0.1)' }}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.5px' }}>
            Cambiar contraseña
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 32 }}>
          Por seguridad, actualiza tu contraseña con una más fuerte. Debe incluir mayúscula, número y símbolo especial.
        </p>

        <PasswordInput label="Contraseña actual" value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          show={showPasswords.current}
          onToggleShow={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
          error={validationErrors.current} name="current" />

        <PasswordInput label="Nueva contraseña" value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          show={showPasswords.new}
          onToggleShow={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
          error={validationErrors.new} name="new" />

        <PasswordStrengthIndicator password={newPassword} />

        <div style={{ marginBottom: 20, marginTop: 20 }}>
          <PasswordInput label="Confirmar nueva contraseña" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            show={showPasswords.confirm}
            onToggleShow={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
            error={validationErrors.confirm} name="confirm" />
        </div>

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '14px 24px', borderRadius: 12,
          background: 'linear-gradient(135deg, var(--primary), var(--teal))',
          color: '#fff', border: 'none', fontSize: 15, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          transition: 'all 0.2s', letterSpacing: '-0.3px',
        }}>
          {loading ? '⏳ Actualizando...' : '🔒 Actualizar contraseña'}
        </button>
      </form>
    </div>
  );
}
