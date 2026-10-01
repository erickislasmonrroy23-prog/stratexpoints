// Tema Cabrera & Consultores — claro/oscuro persistente
import { PALETTE } from './brand.js';

const THEME_KEY = 'cyc-theme';
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
  const next = getCurrentTheme() === 'light' ? 'dark' : 'light';
  setTheme(next);
  return next;
}

export function getCurrentTheme() {
  return localStorage.getItem(THEME_KEY) || 'light';
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  Object.entries(PALETTE[theme]).forEach(([k, v]) => root.style.setProperty(k, v));
}
