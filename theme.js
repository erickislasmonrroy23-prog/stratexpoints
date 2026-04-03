export function initTheme() {
  const theme = localStorage.getItem("sp-theme") || "light";
  setTheme(theme);
}

export function setTheme(theme) {
  localStorage.setItem("sp-theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
  
  if (theme === "dark") {
    document.documentElement.style.setProperty("--bg", "#0f172a");
    document.documentElement.style.setProperty("--bg2", "#1e293b");
    document.documentElement.style.setProperty("--bg3", "#334155");
    document.documentElement.style.setProperty("--text", "#f8fafc");
    document.documentElement.style.setProperty("--text2", "#cbd5e1");
    document.documentElement.style.setProperty("--text3", "#94a3b8");
    document.documentElement.style.setProperty("--border", "#334155");
  } else {
    document.documentElement.style.setProperty("--bg", "#f8fafc");
    document.documentElement.style.setProperty("--bg2", "#ffffff");
    document.documentElement.style.setProperty("--bg3", "#f1f5f9");
    document.documentElement.style.setProperty("--text", "#0f172a");
    document.documentElement.style.setProperty("--text2", "#334155");
    document.documentElement.style.setProperty("--text3", "#64748b");
    document.documentElement.style.setProperty("--border", "#e2e8f0");
  }
  
  // Shared Colors
  document.documentElement.style.setProperty("--primary", "#2563eb");
  document.documentElement.style.setProperty("--primary-light", "rgba(37, 99, 235, 0.1)");
  document.documentElement.style.setProperty("--teal", "#0d9488");
  document.documentElement.style.setProperty("--green", "#16a34a");
  document.documentElement.style.setProperty("--gold", "#d97706");
  document.documentElement.style.setProperty("--red", "#dc2626");
  document.documentElement.style.setProperty("--red-light", "rgba(220, 38, 38, 0.1)");
  document.documentElement.style.setProperty("--violet", "#7c3aed");
  document.documentElement.style.setProperty("--shadow", "0 1px 3px rgba(0,0,0,0.1)");
  document.documentElement.style.setProperty("--shadow-md", "0 4px 6px rgba(0,0,0,0.1)");
  document.documentElement.style.setProperty("--shadow-lg", "0 10px 15px rgba(0,0,0,0.1)");
  document.documentElement.style.setProperty("--radius", "12px");
}