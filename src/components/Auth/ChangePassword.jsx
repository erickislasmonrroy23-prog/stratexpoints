/**
 * FASE 1.1: Change Password Component
 * Implements secure password rotation with validation
 * Integrates with Supabase Auth and profiles table
 */

import React, { useState } from 'react';
import { supabase } from '../../supabase';
import { useNavigate } from 'react-router-dom';
import logger from '../../utils/logger.js';
import '../styles/ChangePassword.css';

export const ChangePassword = ({ onSuccess } = {}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validatePassword = (pwd) => {
    const minLength = pwd.length >= 12;
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
    
    return {
      isValid: minLength && hasUppercase && hasNumber && hasSymbol,
      minLength,
      hasUppercase,
      hasNumber,
      hasSymbol
    };
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      logger.info('[ChangePassword] Validating new password strength');
      
      // Validations
      const validation = validatePassword(formData.newPassword);
      if (!validation.isValid) {
        const missing = [];
        if (!validation.minLength) missing.push('12+ caracteres');
        if (!validation.hasUppercase) missing.push('mayúsculas');
        if (!validation.hasNumber) missing.push('números');
        if (!validation.hasSymbol) missing.push('símbolos');
        
        const errorMsg = `Contraseña debe tener: ${missing.join(', ')}`;
        setError(errorMsg);
        logger.warn('[ChangePassword] Password validation failed', { missing });
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        logger.warn('[ChangePassword] Password confirmation mismatch');
        return;
      }

      if (formData.newPassword === formData.currentPassword) {
        setError('La nueva contraseña debe ser diferente a la actual');
        logger.warn('[ChangePassword] New password same as current');
        return;
      }

      setLoading(true);
      logger.info('[ChangePassword] Starting password update process');

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('No hay usuario autenticado');
      }

      // Update password in Auth
      logger.info('[ChangePassword] Updating password in Supabase Auth');
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (updateError) {
        throw updateError;
      }

      // Update profile to clear rotation flag
      logger.info('[ChangePassword] Updating profile rotation flag');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          password_rotation_due: false,
          last_password_change: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) {
        logger.warn('[ChangePassword] Profile update warning', { error: profileError });
        // Don't fail on this - password was changed successfully
      }

      setSuccess('Contraseña actualizada exitosamente');
      logger.info('[ChangePassword] Password change successful', { userId: user.id });
      
      // Clear form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Redirect after brief delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 1500);

    } catch (err) {
      const errorMsg = err.message || 'Error al cambiar contraseña';
      setError(errorMsg);
      logger.error('[ChangePassword] Password change failed', { 
        error: err.message,
        code: err.code 
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePassword(formData.newPassword);
  const showValidation = formData.newPassword.length > 0;

  return (
    <div className="change-password-container">
      <div className="change-password-card">
        <h2>Cambiar Contraseña</h2>
        <p className="subtitle">Actualiza tu contraseña para mayor seguridad</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label htmlFor="currentPassword">Contraseña Actual</label>
            <input
              id="currentPassword"
              type="password"
              placeholder="Ingresa tu contraseña actual"
              value={formData.currentPassword}
              onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
              disabled={loading}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">Nueva Contraseña</label>
            <input
              id="newPassword"
              type="password"
              placeholder="Crea una nueva contraseña fuerte"
              value={formData.newPassword}
              onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
              disabled={loading}
              required
              autoComplete="new-password"
            />
            
            {showValidation && (
              <div className="validation-checklist">
                <div className={`check-item ${passwordValidation.minLength ? 'valid' : 'invalid'}`}>
                  <span className="check-icon">{passwordValidation.minLength ? '✓' : '✗'}</span>
                  Mínimo 12 caracteres
                </div>
                <div className={`check-item ${passwordValidation.hasUppercase ? 'valid' : 'invalid'}`}>
                  <span className="check-icon">{passwordValidation.hasUppercase ? '✓' : '✗'}</span>
                  Al menos una mayúscula
                </div>
                <div className={`check-item ${passwordValidation.hasNumber ? 'valid' : 'invalid'}`}>
                  <span className="check-icon">{passwordValidation.hasNumber ? '✓' : '✗'}</span>
                  Al menos un número
                </div>
                <div className={`check-item ${passwordValidation.hasSymbol ? 'valid' : 'invalid'}`}>
                  <span className="check-icon">{passwordValidation.hasSymbol ? '✓' : '✗'}</span>
                  Al menos un símbolo (!@#$%^&*)
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirma tu nueva contraseña"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              disabled={loading}
              required
              autoComplete="new-password"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !passwordValidation.isValid}
            className="submit-btn"
          >
            {loading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
