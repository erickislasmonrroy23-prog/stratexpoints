/**
 * Unauthorized Page Component
 * FASE 1.3: Route Protection
 * Displays when user lacks permission to access a resource
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import logger from '../utils/logger.js';

export default function Unauthorized() {
  const navigate = useNavigate();

  React.useEffect(() => {
    logger.warn('User attempted to access unauthorized resource', {
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
    });
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--bg) 0%, var(--bg2) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        maxWidth: 520,
        textAlign: 'center',
        animation: 'fadeIn 0.6s ease-out',
      }}>
        {/* Icon */}
        <div style={{
          fontSize: 80,
          marginBottom: 24,
          animation: 'slideDown 0.8s ease-out',
        }}>
          🔒
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 32,
          fontWeight: 800,
          color: 'var(--text)',
          marginBottom: 12,
          letterSpacing: '-0.5px',
        }}>
          Acceso Denegado
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 16,
          color: 'var(--text2)',
          marginBottom: 32,
          lineHeight: 1.6,
        }}>
          No tienes permiso para acceder a este recurso. Si crees que es un error,
          contacta al administrador de tu organización.
        </p>

        {/* Details Box */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 32,
          textAlign: 'left',
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 8,
          }}>
            Posibles Razones
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: 20,
            color: 'var(--text2)',
            fontSize: 13,
            lineHeight: 1.8,
          }}>
            <li>Tu rol no tiene los permisos requeridos para esta acción</li>
            <li>Eres miembro de una organización diferente</li>
            <li>Tu cuenta aún no ha sido activada por el administrador</li>
            <li>Tus permisos han sido revocados recientemente</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 24px',
              background: 'var(--bg3)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg2)';
              e.currentTarget.style.borderColor = 'var(--primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg3)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            ← Volver Atrás
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 24px',
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🏠 Ir al Inicio
          </button>
        </div>

        {/* Support Link */}
        <div style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: '1px dashed var(--border)',
        }}>
          <p style={{
            fontSize: 12,
            color: 'var(--text3)',
            marginBottom: 8,
          }}>
            ¿Necesitas ayuda?
          </p>
          <a
            href="mailto:support@xtratia.com"
            style={{
              color: 'var(--primary)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Contacta al equipo de soporte →
          </a>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
