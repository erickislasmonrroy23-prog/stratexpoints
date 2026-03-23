export function initTheme(){
  var stored=localStorage.getItem("sp-theme");
  if(!stored){
    var prefersDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;
    stored=prefersDark?"dark":"light";
  }
  document.documentElement.setAttribute("data-theme",stored);
  return stored;
}

export function setTheme(theme){
  document.documentElement.setAttribute("data-theme",theme);
  localStorage.setItem("sp-theme",theme);
}
