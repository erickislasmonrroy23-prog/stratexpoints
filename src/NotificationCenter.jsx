import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from './store.js';

const iconMap = {
  success: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
  error: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
  info: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>,
};

const colorMap = {
  success: 'var(--green)',
  error: 'var(--red)',
  info: 'var(--primary)',
};

function Notification({ notification, onDismiss }) {
  const { id, message, type } = notification;
  const [exit, setExit] = useState(false);
  const [width, setWidth] = useState(100);

  const handleDismiss = useCallback(() => {
    setExit(true);
    setTimeout(() => onDismiss(id), 400); // Match animation duration
  }, [id, onDismiss]);

  useEffect(() => {
    const dismissTimer = setTimeout(handleDismiss, 5000);
    const interval = setInterval(() => {
      setWidth(prev => Math.max(0, prev - (100 / (5000 / 100))));
    }, 100);

    return () => {
      clearTimeout(dismissTimer);
      clearInterval(interval);
    };
  }, [id, handleDismiss]);

  return (
    <>
      <style>{`
        @keyframes toast-enter { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        @keyframes toast-exit { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
        .toast-enter { animation: toast-enter 0.4s cubic-bezier(0.215, 0.610, 0.355, 1.000) forwards; }
        .toast-exit { animation: toast-exit 0.4s cubic-bezier(0.215, 0.610, 0.355, 1.000) forwards; }
      `}</style>
      <div
        className={exit ? "toast-exit" : "toast-enter"}
        style={{
          width: 350,
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          position: 'relative',
          overflow: 'hidden',
          padding: 16,
        }}
      >
        <div style={{ color: colorMap[type], flexShrink: 0, marginTop: 2 }}>{iconMap[type]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, wordBreak: 'break-word' }}>{message}</div>
        </div>
        <button
          onClick={handleDismiss}
          style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 20, padding: 0, lineHeight: 1, flexShrink: 0 }}
        >
          ×
        </button>
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 4,
            width: `${width}%`,
            backgroundColor: colorMap[type],
            transition: 'width 0.1s linear'
        }}/>
      </div>
    </>
  );
}

export default function NotificationCenter() {
  const notifications = useStore.use.notifications();
  const removeNotification = useStore.use.removeNotification();

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {notifications.map((notification) => (
        <Notification key={notification.id} notification={notification} onDismiss={removeNotification} />
      ))}
    </div>
  );
}