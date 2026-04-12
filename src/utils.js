/**
 * utils.js — Helpers compartidos Xtratia Enterprise OS
 * Centraliza lógica reutilizable para evitar duplicación
 */

// ── Formato de fechas ─────────────────────────────────────────────────────────
export const formatDate = (dateStr, opts = {}) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', ...opts });
  } catch { return '—'; }
};

export const formatDateTime = (dateStr) =>
  formatDate(dateStr, { hour: '2-digit', minute: '2-digit' });

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const isOverdue = (dateStr) => daysUntil(dateStr) < 0;

// ── Cálculos de progreso ──────────────────────────────────────────────────────
export const calcProgress = (current, target) => {
  if (!target || target === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
};

export const getStatusColor = (pct) => {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#f59e0b';
  return '#dc2626';
};

export const getStatusLabel = (pct) => {
  if (pct >= 80) return 'En curso';
  if (pct >= 50) return 'En riesgo';
  return 'Atrasado';
};

// ── Formato de moneda ─────────────────────────────────────────────────────────
export const formatCurrency = (amount, currency = 'MXN') => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2
  }).format(amount);
};

// ── Truncar texto ─────────────────────────────────────────────────────────────
export const truncate = (str, max = 50) => {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
};

// ── Generar iniciales ─────────────────────────────────────────────────────────
export const getInitials = (name = '') => {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
};

// ── Colores de rol ────────────────────────────────────────────────────────────
export const ROLE_COLORS = {
  admin:  { bg: '#ede9fe', color: '#6d28d9' },
  editor: { bg: '#dbeafe', color: '#1d4ed8' },
  viewer: { bg: '#dcfce7', color: '#15803d' },
};

// ── Agrupar array por campo ───────────────────────────────────────────────────
export const groupBy = (arr, key) => {
  return (arr || []).reduce((acc, item) => {
    const k = item[key] ?? 'Sin asignar';
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
};

// ── Ordenar array ─────────────────────────────────────────────────────────────
export const sortBy = (arr, key, dir = 'asc') => {
  return [...(arr || [])].sort((a, b) => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    return dir === 'asc'
      ? av < bv ? -1 : av > bv ? 1 : 0
      : bv < av ? -1 : bv > av ? 1 : 0;
  });
};

// ── Debounce ──────────────────────────────────────────────────────────────────
export const debounce = (fn, ms = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

// ── Generar UUID simple (sin dependencia) ─────────────────────────────────────
export const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });

// ── Detectar si es móvil ──────────────────────────────────────────────────────
export const isMobile = () => window.innerWidth < 768;

// ── Score de salud de organización ───────────────────────────────────────────
export const calcHealthScore = (org) => {
  if (!org) return 0;
  return [
    org.status === 'active'     ? 40 : 0,
    org.is_paid                 ? 30 : 0,
    (org.user_count || 0) > 0  ? 20 : 0,
    org.modules?.okrs           ? 10 : 0,
  ].reduce((a, b) => a + b, 0);
};
