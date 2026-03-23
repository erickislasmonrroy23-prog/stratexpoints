import {
  createContext, useContext, useReducer,
  useMemo, useCallback
} from "react";

import {
  ORGANIZATION, USERS, CURRENT_USER,
  STRATEGIC_OBJECTIVES, OKRS, KPIS,
  BOWLING_DATA, INITIATIVES, ALERTS,
  HOSHIN, SIMULATOR_SCENARIOS, MONTHS,
  STATUS_CONFIG, TRAFFIC_LIGHT,
  KPI_HISTORY, KPI_PREDICTIONS,
  RADAR_DATA, BENCHMARK_DATA,
  STRATEGY_MAP_NODES, STRATEGY_MAP_EDGES,
  BSC_PERSPECTIVES,
} from "../data/mockData.js";

// ── ESTADO INICIAL ────────────────────────────────────────────
const INITIAL_STATE = {
  // Org & Auth
  organization: ORGANIZATION,
  currentUser:  CURRENT_USER,
  users:        USERS,

  // Estrategia
  perspectives:        BSC_PERSPECTIVES,
  strategicObjectives: STRATEGIC_OBJECTIVES,
  okrs:                OKRS,
  kpis:                KPIS,
  bowling:             BOWLING_DATA,
  initiatives:         INITIATIVES,
  alerts:              ALERTS,
  hoshin:              HOSHIN,

  // Visualización
  strategyMapNodes: STRATEGY_MAP_NODES,
  strategyMapEdges: STRATEGY_MAP_EDGES,

  // Analytics
  kpiHistory:     KPI_HISTORY,
  kpiPredictions: KPI_PREDICTIONS,
  radarData:      RADAR_DATA,
  benchmarkData:  BENCHMARK_DATA,

  // Simulador
  simulatorScenarios: SIMULATOR_SCENARIOS,
  activeSimulation:   null,

  // UI State
  sidebarOpen:   true,
  activeModule:  "dashboard",
  notifications: ALERTS.filter(a => !a.read).length,

  // Configs
  months:        MONTHS,
  statusConfig:  STATUS_CONFIG,
  trafficLight:  TRAFFIC_LIGHT,
};

// ── REDUCER ───────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {

    // ── OKR ──────────────────────────────────────────────────
    case "UPDATE_KR": {
      const { okrId, krId, field, value } = action;
      const okrs = state.okrs.map(okr => {
        if (okr.id !== okrId) return okr;
        const keyResults = okr.keyResults.map(kr => {
          if (kr.id !== krId) return kr;
          const updated = { ...kr, [field]: field === "current" ? (parseFloat(value) || 0) : value };
          const pct = Math.min(100, Math.round((updated.current / updated.target) * 100));
          return { ...updated, progress: pct, status: pct >= 70 ? "on_track" : pct >= 40 ? "at_risk" : "not_started" };
        });
        const progress = Math.round(keyResults.reduce((s, k) => s + k.progress, 0) / keyResults.length);
        return { ...okr, keyResults, progress, status: progress >= 70 ? "on_track" : progress >= 40 ? "at_risk" : "not_started" };
      });
      return { ...state, okrs };
    }

    case "ADD_KR": {
      const { okrId, kr } = action;
      const okrs = state.okrs.map(okr =>
        okr.id !== okrId ? okr : { ...okr, keyResults: [...okr.keyResults, kr] }
      );
      return { ...state, okrs };
    }

    case "ADD_OKR": {
      return { ...state, okrs: [...state.okrs, action.okr] };
    }

    case "UPDATE_OKR": {
      const okrs = state.okrs.map(o => o.id !== action.okr.id ? o : { ...o, ...action.okr });
      return { ...state, okrs };
    }

    case "DELETE_OKR": {
      return { ...state, okrs: state.okrs.filter(o => o.id !== action.id) };
    }

    // ── KPI ──────────────────────────────────────────────────
    case "UPDATE_KPI": {
      const kpis = state.kpis.map(k => {
        if (k.id !== action.kpiId) return k;
        const updated = { ...k, ...action.data };
        const pct = (updated.value / updated.target) * 100;
        updated.trafficLight = pct >= 90 ? "green" : pct >= 60 ? "yellow" : "red";
        return updated;
      });
      return { ...state, kpis };
    }

    case "ADD_KPI": {
      return { ...state, kpis: [...state.kpis, action.kpi] };
    }

    // ── BOWLING ───────────────────────────────────────────────
    case "UPDATE_BOWLING": {
      const { rowIdx, monIdx, value } = action;
      const bowling = state.bowling.map((row, i) =>
        i !== rowIdx ? row : {
          ...row,
          months: row.months.map((v, j) =>
            j !== monIdx ? v : (value === "" ? null : parseFloat(value) || null)
          )
        }
      );
      return { ...state, bowling };
    }

    // ── INICIATIVAS ───────────────────────────────────────────
    case "UPDATE_INITIATIVE": {
      const initiatives = state.initiatives.map(ini =>
        ini.id !== action.initiative.id ? ini : { ...ini, ...action.initiative }
      );
      return { ...state, initiatives };
    }

    case "ADD_INITIATIVE": {
      return { ...state, initiatives: [...state.initiatives, action.initiative] };
    }

    case "DELETE_INITIATIVE": {
      return { ...state, initiatives: state.initiatives.filter(i => i.id !== action.id) };
    }

    // ── OBJETIVOS ─────────────────────────────────────────────
    case "ADD_OBJECTIVE": {
      return { ...state, strategicObjectives: [...state.strategicObjectives, action.objective] };
    }

    case "UPDATE_OBJECTIVE": {
      const strategicObjectives = state.strategicObjectives.map(o =>
        o.id !== action.objective.id ? o : { ...o, ...action.objective }
      );
      return { ...state, strategicObjectives };
    }

    case "DELETE_OBJECTIVE": {
      return { ...state, strategicObjectives: state.strategicObjectives.filter(o => o.id !== action.id) };
    }

    // ── ALERTAS ───────────────────────────────────────────────
    case "MARK_ALERT_READ": {
      const alerts = state.alerts.map(a =>
        a.id !== action.id ? a : { ...a, read: true }
      );
      const notifications = alerts.filter(a => !a.read).length;
      return { ...state, alerts, notifications };
    }

    case "MARK_ALL_READ": {
      const alerts = state.alerts.map(a => ({ ...a, read: true }));
      return { ...state, alerts, notifications: 0 };
    }

    case "ADD_ALERT": {
      const alerts = [action.alert, ...state.alerts];
      const notifications = alerts.filter(a => !a.read).length;
      return { ...state, alerts, notifications };
    }

    // ── SIMULADOR ─────────────────────────────────────────────
    case "SET_SIMULATION": {
      return { ...state, activeSimulation: action.simulation };
    }

    case "CLEAR_SIMULATION": {
      return { ...state, activeSimulation: null };
    }

    // ── UI ────────────────────────────────────────────────────
    case "TOGGLE_SIDEBAR": {
      return { ...state, sidebarOpen: !state.sidebarOpen };
    }

    case "SET_MODULE": {
      return { ...state, activeModule: action.module };
    }

    // ── HOSHIN ────────────────────────────────────────────────
    case "UPDATE_HOSHIN_CORR": {
      const { matrix, row, col, value } = action;
      const hoshin = { ...state.hoshin };
      const key = matrix === "oa" ? "corrIM_OA" : "corrIM_RS";
      const updated = hoshin[key].map((r, i) =>
        i !== row ? r : r.map((v, j) => j !== col ? v : value)
      );
      return { ...state, hoshin: { ...hoshin, [key]: updated } };
    }

    default:
      return state;
  }
}

// ── CONTEXT ───────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);

  // ── ACCIONES MEMORIZADAS ──────────────────────────────────
  const actions = useMemo(() => ({

    // OKR
    updateKR:     (okrId, krId, field, value) => dispatch({ type:"UPDATE_KR", okrId, krId, field, value }),
    addKR:        (okrId, kr)    => dispatch({ type:"ADD_KR",    okrId, kr }),
    addOKR:       (okr)          => dispatch({ type:"ADD_OKR",   okr }),
    updateOKR:    (okr)          => dispatch({ type:"UPDATE_OKR",okr }),
    deleteOKR:    (id)           => dispatch({ type:"DELETE_OKR",id }),

    // KPI
    updateKPI:    (kpiId, data)  => dispatch({ type:"UPDATE_KPI", kpiId, data }),
    addKPI:       (kpi)          => dispatch({ type:"ADD_KPI",    kpi }),

    // Bowling
    updateBowling:(rowIdx, monIdx, value) => dispatch({ type:"UPDATE_BOWLING", rowIdx, monIdx, value }),

    // Iniciativas
    updateInitiative:(initiative) => dispatch({ type:"UPDATE_INITIATIVE", initiative }),
    addInitiative:   (initiative) => dispatch({ type:"ADD_INITIATIVE",    initiative }),
    deleteInitiative:(id)         => dispatch({ type:"DELETE_INITIATIVE", id }),

    // Objetivos
    addObjective:    (objective)  => dispatch({ type:"ADD_OBJECTIVE",    objective }),
    updateObjective: (objective)  => dispatch({ type:"UPDATE_OBJECTIVE", objective }),
    deleteObjective: (id)         => dispatch({ type:"DELETE_OBJECTIVE", id }),

    // Alertas
    markAlertRead:  (id)  => dispatch({ type:"MARK_ALERT_READ", id }),
    markAllRead:    ()    => dispatch({ type:"MARK_ALL_READ" }),
    addAlert:       (alert) => dispatch({ type:"ADD_ALERT", alert }),

    // Simulador
    setSimulation:  (simulation) => dispatch({ type:"SET_SIMULATION",  simulation }),
    clearSimulation:()           => dispatch({ type:"CLEAR_SIMULATION" }),

    // UI
    toggleSidebar:  ()           => dispatch({ type:"TOGGLE_SIDEBAR" }),
    setModule:      (module)     => dispatch({ type:"SET_MODULE", module }),

    // Hoshin
    updateHoshinCorr:(matrix, row, col, value) => dispatch({ type:"UPDATE_HOSHIN_CORR", matrix, row, col, value }),

  }), []);

  // ── SELECTORES ────────────────────────────────────────────
  const selectors = useMemo(() => ({

    getOKRsByObjective: (objectiveId) =>
      state.okrs.filter(o => o.objectiveId === objectiveId),

    getKPIsByPerspective: (perspectiveId) =>
      state.kpis.filter(k => k.perspectiveId === perspectiveId),

    getObjectivesByPerspective: (perspectiveId) =>
      state.strategicObjectives.filter(o => o.perspectiveId === perspectiveId),

    getInitiativesByObjective: (objectiveId) =>
      state.initiatives.filter(i => i.objectiveId === objectiveId),

    getUnreadAlerts: () =>
      state.alerts.filter(a => !a.read),

    getGlobalProgress: () => {
      const all = state.okrs;
      if (!all.length) return 0;
      return Math.round(all.reduce((s, o) => s + o.progress, 0) / all.length);
    },

    getKPIsAtRisk: () =>
      state.kpis.filter(k => k.trafficLight === "red" || k.trafficLight === "yellow"),

    getUserById: (id) =>
      state.users.find(u => u.id === id),

    getPerspectiveHealth: () =>
      state.perspectives.map(p => {
        const objs = state.strategicObjectives.filter(o => o.perspectiveId === p.id);
        const avg  = objs.length ? Math.round(objs.reduce((s, o) => s + o.progress, 0) / objs.length) : 0;
        return {
          ...p,
          avgProgress: avg,
          health: avg >= 70 ? "green" : avg >= 45 ? "yellow" : "red",
          objectiveCount: objs.length,
        };
      }),

  }), [state]);

  const value = useMemo(() => ({
    ...state,
    ...actions,
    ...selectors,
    dispatch,
  }), [state, actions, selectors]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppProvider");
  return ctx;
};

export default AppContext;
