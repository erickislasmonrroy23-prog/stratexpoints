// Xtratia Theme Manager — persistente con localStorage
const THEME_KEY = 'xtratia-theme';
const THEMES = ['light', 'dark'];

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = THEMES.includes(saved) ? saved : (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
  return theme;
}

export function setTheme(theme) {
  if (!THEMES.includes(theme)) return;
  applyTheme(theme);
  localStorage.setItem(THEME_KEY, theme);
}

export function toggleTheme() {
  const current = localStorage.getItem(THEME_KEY) || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
}

export function getCurrentTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);

  if (theme === 'dark') {
    root.style.setProperty('--bg',           '#0f172a');
    root.style.setProperty('--bg2',          '#1e293b');
    root.style.setProperty('--bg3',          '#334155');
    root.style.setProperty('--text',         '#f1f5f9');
    root.style.setProperty('--text2',        '#cbd5e1');
    root.style.setProperty('--text3',        '#64748b');
    root.style.setProperty('--border',       '#334155');
    root.style.setProperty('--primary',      '#818cf8');
    root.style.setProperty('--primary-light','#312e81');
    root.style.setProperty('--teal',         '#2dd4bf');
    root.style.setProperty('--red',          '#f87171');
    root.style.setProperty('--red-light',    '#450a0a');
  } else {
    root.style.setProperty('--bg',           '#ffffff');
    root.style.setProperty('--bg2',          '#f8fafc');
    root.style.setProperty('--bg3',          '#f1f5f9');
    root.style.setProperty('--text',         '#0f172a');
    root.style.setProperty('--text2',        '#334155');
    root.style.setProperty('--text3',        '#94a3b8');
    root.style.setProperty('--border',       '#e2e8f0');
    root.style.setProperty('--primary',      '#6366f1');
    root.style.setProperty('--primary-light','#eef2ff');
    root.style.setProperty('--teal',         '#14b8a6');
    root.style.setProperty('--red',          '#dc2626');
    root.style.setProperty('--red-light',    '#fef2f2');
  }
}
