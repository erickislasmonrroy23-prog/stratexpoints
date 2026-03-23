// ══════════════════════════════════════════════════════════════
// STRATEXPOINTS — Gestión de Usuarios
// ══════════════════════════════════════════════════════════════

import { useState, useMemo, memo, useCallback } from "react";
import { useApp } from "../../context/AppContext.jsx";
import {
  Card, Btn, Modal, Bar, SectionHeader, StatCard,
  Input, Select, AlertBox, EmptyState, Tabs,
  Avatar, Badge, T,
} from "../ui/index.jsx";
import { SpBarChart, SpPieChart } from "../charts/index.jsx";
import { color, calc, fmt, genId } from "../../utils/helpers.js";

// ── CONSTANTES ────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value:"admin",    label:"👑 Administrador" },
  { value:"director", label:"👔 Director"      },
  { value:"manager",  label:"👥 Gerente"       },
  { value:"analyst",  label:"📊 Analista"      },
  { value:"viewer",   label:"👁️ Visualizador"  },
];

const ROLE_CFG = {
  admin:    { c:T.red,    bg:"#fee2e2", label:"Admin",    icon:"👑", perms:["all"]                              },
  director: { c:T.navy,  bg:`${T.navy}12`, label:"Director", icon:"👔", perms:["view","edit","approve"]        },
  manager:  { c:T.teal,  bg:`${T.teal}12`, label:"Gerente",  icon:"👥", perms:["view","edit"]                  },
  analyst:  { c:T.blue,  bg:"#dbeafe", label:"Analista",  icon:"📊", perms:["view","edit_own"]                 },
  viewer:   { c:T.tL,    bg:T.bg,      label:"Viewer",    icon:"👁️", perms:["view"]                           },
};

const STATUS_CFG = {
  active:   { c:T.green,  bg:"#d1fae5", label:"Activo"   },
  inactive: { c:T.tL,     bg:T.bg,      label:"Inactivo" },
  pending:  { c:"#d97706",bg:"#fef3c7", label:"Pendiente"},
};

// ── USER CARD ─────────────────────────────────────────────────
const UserCard = memo(({ user, okrs, initiatives, onSelect, onEdit }) => {
  const roleCfg   = ROLE_CFG[user.role]   || ROLE_CFG.viewer;
  const statusCfg = STATUS_CFG[user.status] || STATUS_CFG.active;
  const userOKRs  = okrs.filter(o => o.owner === user.id);
  const userInits = initiatives.filter(i => i.owner === user.name);
  const avgProg   = calc.avgProgress(userOKRs);

  return (
    <Card hover sx={{ padding:"15px 17px" }}
      onClick={() => onSelect(user)}>
      {/* Header */}
      <div style={{ display:"flex", gap:12, alignItems:"flex-start",
        marginBottom:12 }}>
        <Avatar name={user.name} size={44}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13.5, fontWeight:800, color:T.navy,
            fontFamily:"var(--font-display)", marginBottom:3 }}>
            {user.name}
          </div>
          <div style={{ fontSize:11, color:T.tL, marginBottom:5 }}>
            {user.position}
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
            <span style={{ fontSize:9.5, fontWeight:800, padding:"2px 8px",
              borderRadius:20, background:roleCfg.bg, color:roleCfg.c }}>
              {roleCfg.icon} {roleCfg.label}
            </span>
            <span style={{ fontSize:9.5, fontWeight:700, padding:"2px 8px",
              borderRadius:20, background:statusCfg.bg, color:statusCfg.c }}>
              {statusCfg.label}
            </span>
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onEdit(user); }}
          style={{ background:"none", border:"none", cursor:"pointer",
            color:T.tL, fontSize:14, padding:"3px 5px" }}>✏️</button>
      </div>

      {/* Info */}
      <div style={{ display:"flex", flexDirection:"column", gap:4,
        marginBottom:12 }}>
        <div style={{ fontSize:10.5, color:T.tL }}>
          🏥 {user.area}
        </div>
        <div style={{ fontSize:10.5, color:T.tL }}>
          📧 {user.email}
        </div>
        {user.lastLogin && (
          <div style={{ fontSize:10.5, color:T.tL }}>
            🕐 Último acceso: {fmt.date(user.lastLogin)}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:"flex", gap:10, paddingTop:10,
        borderTop:`1px solid ${T.bdr}` }}>
        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontSize:16, fontWeight:900, color:T.teal,
            fontFamily:"var(--font-display)" }}>
            {userOKRs.length}
          </div>
          <div style={{ fontSize:9.5, color:T.tL }}>OKRs</div>
        </div>
        <div style={{ width:1, background:T.bdr }}/>
        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontSize:16, fontWeight:900, color:T.blue,
            fontFamily:"var(--font-display)" }}>
            {userInits.length}
          </div>
          <div style={{ fontSize:9.5, color:T.tL }}>Iniciativas</div>
        </div>
        <div style={{ width:1, background:T.bdr }}/>
        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontSize:16, fontWeight:900,
            color:color.progressBar(avgProg),
            fontFamily:"var(--font-display)" }}>
            {userOKRs.length ? `${avgProg}%` : "—"}
          </div>
          <div style={{ fontSize:9.5, color:T.tL }}>Avance</div>
        </div>
      </div>
    </Card>
  );
});

// ── USER DETAIL MODAL ─────────────────────────────────────────
const UserDetailModal = memo(({ user, okrs, initiatives, kpis, onClose, onEdit }) => {
  const roleCfg   = ROLE_CFG[user.role]     || ROLE_CFG.viewer;
  const statusCfg = STATUS_CFG[user.status] || STATUS_CFG.active;
  const userOKRs  = okrs.filter(o => o.owner === user.id);
  const userInits = initiatives.filter(i => i.owner === user.name);
  const avgProg   = calc.avgProgress(userOKRs);

  return (
    <Modal
      title={`👤 ${user.name}`}
      onClose={onClose}
      maxWidth={620}
      footer={
        <Btn variant="primary" onClick={() => { onEdit(user); onClose(); }}>
          ✏️ Editar Usuario
        </Btn>
      }
    >
      {/* Profile header */}
      <div style={{ display:"flex", gap:16, alignItems:"center",
        marginBottom:16, padding:"14px 16px",
        background:T.bg, borderRadius:10 }}>
        <Avatar name={user.name} size={60}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, fontWeight:900, color:T.navy,
            fontFamily:"var(--font-display)", marginBottom:4 }}>
            {user.name}
          </div>
          <div style={{ fontSize:12, color:T.tM, marginBottom:6 }}>
            {user.position} · {user.area}
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:10, fontWeight:800, padding:"3px 10px",
              borderRadius:20, background:roleCfg.bg, color:roleCfg.c }}>
              {roleCfg.icon} {roleCfg.label}
            </span>
            <span style={{ fontSize:10, fontWeight:700, padding:"3px 10px",
              borderRadius:20, background:statusCfg.bg, color:statusCfg.c }}>
              {statusCfg.label}
            </span>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div style={{ display:"grid",
        gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",
        gap:8, marginBottom:16 }}>
        {[
          { label:"Email",          value:user.email,    icon:"📧" },
          { label:"Área",           value:user.area,     icon:"🏥" },
          { label:"Cargo",          value:user.position, icon:"💼" },
          { label:"Último Acceso",  value:fmt.date(user.lastLogin), icon:"🕐" },
        ].map((m, i) => (
          <div key={i} style={{ padding:"8px 11px", background:T.bg,
            borderRadius:9, border:`1px solid ${T.bdr}` }}>
            <div style={{ fontSize:9.5, color:T.tL, fontWeight:700,
              marginBottom:2 }}>{m.icon} {m.label}</div>
            <div style={{ fontSize:12, fontWeight:700, color:T.navy,
              overflow:"hidden", textOverflow:"ellipsis",
              whiteSpace:"nowrap" }}>{m.value || "—"}</div>
          </div>
        ))}
      </div>

      {/* Permissions */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:800, color:T.teal,
          letterSpacing:".08em", marginBottom:8 }}>
          PERMISOS DEL ROL
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {(roleCfg.perms || []).map((perm, i) => (
            <span key={i} style={{ fontSize:10.5, padding:"3px 10px",
              borderRadius:20, background:`${T.teal}12`,
              color:T.teal, fontWeight:700,
              border:`1px solid ${T.teal}25` }}>
              ✓ {perm === "all" ? "Acceso completo"
                : perm === "view" ? "Visualizar"
                : perm === "edit" ? "Editar"
                : perm === "approve" ? "Aprobar"
                : perm === "edit_own" ? "Editar propios" : perm}
            </span>
          ))}
        </div>
      </div>

      {/* OKRs */}
      {userOKRs.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:8 }}>
            OKRs ASIGNADOS ({userOKRs.length})
          </div>
          {userOKRs.map(okr => (
            <div key={okr.id} style={{ display:"flex",
              justifyContent:"space-between", alignItems:"center",
              padding:"8px 11px", background:T.bg, borderRadius:8,
              marginBottom:5, border:`1px solid ${T.bdr}` }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11.5, fontWeight:700, color:T.navy,
                  overflow:"hidden", textOverflow:"ellipsis",
                  whiteSpace:"nowrap" }}>
                  {okr.code}: {okr.objective}
                </div>
                <Bar value={okr.progress} height={4}/>
              </div>
              <span style={{ fontSize:11, fontWeight:800,
                color:color.progressBar(okr.progress),
                marginLeft:10, flexShrink:0 }}>
                {okr.progress}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Initiatives */}
      {userInits.length > 0 && (
        <div>
          <div style={{ fontSize:10, fontWeight:800, color:T.teal,
            letterSpacing:".08em", marginBottom:8 }}>
            INICIATIVAS ({userInits.length})
          </div>
          {userInits.map(ini => (
            <div key={ini.id} style={{ display:"flex",
              justifyContent:"space-between", alignItems:"center",
              padding:"7px 11px", background:T.bg, borderRadius:8,
              marginBottom:5, border:`1px solid ${T.bdr}` }}>
              <div style={{ fontSize:11, fontWeight:600, color:T.navy,
                flex:1, minWidth:0, overflow:"hidden",
                textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {ini.title}
              </div>
              <span style={{ fontSize:10, fontWeight:700,
                color:color.progressBar(ini.progress),
                marginLeft:8, flexShrink:0 }}>
                {ini.progress}%
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
});

// ── USER FORM MODAL ───────────────────────────────────────────
const UserFormModal = memo(({ user, onSave, onClose }) => {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name:     user?.name     || "",
    email:    user?.email    || "",
    position: user?.position || "",
    area:     user?.area     || "",
    role:     user?.role     || "viewer",
    status:   user?.status   || "active",
  });
  const [errors, setErrors] = useState({});
  const set = (f, v) => setForm(p => ({ ...p, [f]:v }));

  const handleSave = () => {
    const errs = {};
    if (!form.name.trim())  errs.name  = "El nombre es requerido";
    if (!form.email.trim()) errs.email = "El email es requerido";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({ ...form, id: user?.id || genId("u") });
    onClose();
  };

  const statusOptions = [
    { value:"active",   label:"✅ Activo"    },
    { value:"inactive", label:"⏸️ Inactivo"  },
    { value:"pending",  label:"⏳ Pendiente" },
  ];

  return (
    <Modal
      title={isEdit ? "✏️ Editar Usuario" : "➕ Nuevo Usuario"}
      onClose={onClose}
      maxWidth={520}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave}>
            {isEdit ? "Guardar" : "Crear Usuario"}
          </Btn>
        </>
      }
    >
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <Input label="Nombre completo" value={form.name}
          onChange={e => set("name", e.target.value)}
          error={errors.name}
          placeholder="Ej: Dr. María García"/>
        <Input label="Email" type="email" value={form.email}
          onChange={e => set("email", e.target.value)}
          error={errors.email}
          placeholder="m.garcia@hospital.mx"/>
        <Input label="Cargo / Posición" value={form.position}
          onChange={e => set("position", e.target.value)}
          placeholder="Ej: Directora de Calidad"/>
        <Input label="Área / Departamento" value={form.area}
          onChange={e => set("area", e.target.value)}
          placeholder="Ej: Calidad y Seguridad"/>
        <div className="sp-grid-2" style={{ gap:10 }}>
          <Select label="Rol" value={form.role}
            options={ROLE_OPTIONS}
            onChange={e => set("role", e.target.value)}/>
          <Select label="Estado" value={form.status}
            options={statusOptions}
            onChange={e => set("status", e.target.value)}/>
        </div>
      </div>
    </Modal>
  );
});

// ── USERS SUMMARY ─────────────────────────────────────────────
const UsersSummary = memo(({ users }) => {
  const total   = users.length;
  const active  = users.filter(u => u.status === "active").length;
  const admins  = users.filter(u => u.role === "admin" || u.role === "director").length;
  const areas   = [...new Set(users.map(u => u.area))].length;

  return (
    <div className="sp-grid-4" style={{ marginBottom:20 }}>
      <StatCard label="Total Usuarios" value={total}
        sub="Registrados" icon="👥" color={T.navy}/>
      <StatCard label="Activos" value={active}
        sub="Con acceso activo" icon="✅" color={T.green}/>
      <StatCard label="Directivos" value={admins}
        sub="Admin + Directores" icon="👔" color={T.blue}/>
      <StatCard label="Áreas" value={areas}
        sub="Departamentos" icon="🏥" color={T.teal}/>
    </div>
  );
});

// ── MAIN USERS ────────────────────────────────────────────────
const Users = memo(({ onNavigate }) => {
  const { users = [], okrs, initiatives, kpis } = useApp();

  const [tab,     setTab]     = useState("grid");
  const [search,  setSearch]  = useState("");
  const [roleFlt, setRoleFlt] = useState("Todos");
  const [selected,setSelected]= useState(null);
  const [editUser,setEditUser]= useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [localUsers, setLocalUsers] = useState(users);

  const filtered = useMemo(() => localUsers.filter(u => {
    const roleOk   = roleFlt === "Todos" || u.role === roleFlt;
    const searchOk = !search
      || u.name.toLowerCase().includes(search.toLowerCase())
      || u.email?.toLowerCase().includes(search.toLowerCase())
      || u.area?.toLowerCase().includes(search.toLowerCase());
    return roleOk && searchOk;
  }), [localUsers, roleFlt, search]);

  const handleSave = useCallback((data) => {
    setLocalUsers(p => {
      const exists = p.find(u => u.id === data.id);
      return exists ? p.map(u => u.id === data.id ? data : u) : [...p, data];
    });
  }, []);

  // Charts data
  const roleChartData = useMemo(() =>
    Object.entries(ROLE_CFG).map(([k, v]) => ({
      name:  v.label,
      value: localUsers.filter(u => u.role === k).length,
      color: v.c,
    })).filter(d => d.value > 0),
  [localUsers]);

  const areaChartData = useMemo(() => {
    const areas = {};
    localUsers.forEach(u => {
      if (u.area) areas[u.area] = (areas[u.area] || 0) + 1;
    });
    return Object.entries(areas).map(([name, count]) => ({
      name: name.substring(0, 22), count,
    })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [localUsers]);

  const TABS = [
    { id:"grid",   label:"👥 Tarjetas" },
    { id:"table",  label:"📋 Tabla"    },
    { id:"charts", label:"📊 Análisis" },
  ];

  return (
    <div className="sp-page">
      <SectionHeader
        title="👥 Gestión de Usuarios"
        subtitle={`${localUsers.length} usuarios · Hospital Punta Médica`}
        action={
          <Btn variant="primary" onClick={() => setShowAdd(true)}>
            + Nuevo Usuario
          </Btn>
        }
      />

      <UsersSummary users={localUsers}/>

      <Tabs tabs={TABS} active={tab} onChange={setTab}/>

      {/* Filters */}
      {tab !== "charts" && (
        <div style={{ display:"flex", gap:8, marginBottom:16,
          flexWrap:"wrap", alignItems:"center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar usuario..."
            style={{ padding:"6px 12px", borderRadius:8,
              border:`1px solid ${T.bdr}`, fontSize:12,
              color:T.txt, background:T.white, minWidth:180 }}/>
          <div style={{ display:"flex", gap:5 }}>
            {["Todos", ...Object.keys(ROLE_CFG)].map(r => (
              <button key={r} onClick={() => setRoleFlt(r)}
                style={{ padding:"5px 11px", borderRadius:20, fontSize:10.5,
                  fontWeight:700, cursor:"pointer", transition:"all .15s",
                  border:`1.5px solid ${roleFlt===r ? T.teal : T.bdr}`,
                  background:roleFlt===r ? `${T.teal}15` : "transparent",
                  color:roleFlt===r ? T.teal : T.tM }}>
                {r === "Todos" ? "Todos" : ROLE_CFG[r]?.label || r}
              </button>
            ))}
          </div>
          <span style={{ fontSize:11, color:T.tL, marginLeft:"auto" }}>
            {filtered.length} de {localUsers.length}
          </span>
        </div>
      )}

      {/* ── GRID TAB ── */}
      {tab === "grid" && (
        filtered.length === 0
          ? <EmptyState icon="👥" title="Sin usuarios"
              description="No hay usuarios para los filtros seleccionados"
              action={<Btn variant="primary" onClick={() => setShowAdd(true)}>
                + Crear Usuario</Btn>}/>
          : (
            <div className="sp-grid-3">
              {filtered.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  okrs={okrs}
                  initiatives={initiatives}
                  onSelect={setSelected}
                  onEdit={setEditUser}
                />
              ))}
            </div>
          )
      )}

      {/* ── TABLE TAB ── */}
      {tab === "table" && (
        <Card>
          <div style={{ overflowX:"auto" }}>
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Área</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th style={{ textAlign:"center" }}>OKRs</th>
                  <th style={{ textAlign:"center" }}>Inits.</th>
                  <th>Último acceso</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => {
                  const rc = ROLE_CFG[user.role]     || ROLE_CFG.viewer;
                  const sc = STATUS_CFG[user.status] || STATUS_CFG.active;
                  const uOKRs = okrs.filter(o => o.owner === user.id).length;
                  const uInits= initiatives.filter(i => i.owner === user.name).length;
                  return (
                    <tr key={user.id} style={{ cursor:"pointer" }}
                      onClick={() => setSelected(user)}>
                      <td>
                        <div style={{ display:"flex", alignItems:"center",
                          gap:9 }}>
                          <Avatar name={user.name} size={30}/>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700,
                              color:T.navy }}>{user.name}</div>
                            <div style={{ fontSize:10, color:T.tL }}>
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize:11, color:T.tM }}>{user.area}</td>
                      <td>
                        <span style={{ fontSize:10, fontWeight:800,
                          padding:"2px 8px", borderRadius:20,
                          background:rc.bg, color:rc.c }}>
                          {rc.icon} {rc.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize:10, fontWeight:700,
                          padding:"2px 8px", borderRadius:20,
                          background:sc.bg, color:sc.c }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ textAlign:"center", fontSize:13,
                        fontWeight:800, color:T.teal }}>{uOKRs}</td>
                      <td style={{ textAlign:"center", fontSize:13,
                        fontWeight:800, color:T.blue }}>{uInits}</td>
                      <td style={{ fontSize:11, color:T.tL }}>
                        {fmt.date(user.lastLogin)}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button onClick={() => setEditUser(user)}
                          style={{ background:"none", border:"none",
                            cursor:"pointer", fontSize:13 }}>✏️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── CHARTS TAB ── */}
      {tab === "charts" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="sp-grid-2">
            <Card sx={{ padding:"16px 18px" }}>
              <SpPieChart
                data={roleChartData}
                title="Usuarios por Rol"
                height={260}
                innerRadius={50}
                outerRadius={90}
                showLabels={false}
              />
            </Card>
            <Card sx={{ padding:"16px 18px" }}>
              <SpBarChart
                data={areaChartData}
                title="Usuarios por Área"
                height={260}
                xKey="name"
                horizontal
                bars={[{ key:"count", color:T.teal, label:"Usuarios" }]}
                showValues
              />
            </Card>
          </div>

          {/* OKR load per user */}
          <Card sx={{ padding:"16px 18px" }}>
            <SpBarChart
              data={localUsers.slice(0, 8).map(u => ({
                name:   u.name.split(" ")[0] + " " + (u.name.split(" ")[1]?.[0] || "") + ".",
                OKRs:   okrs.filter(o => o.owner === u.id).length,
                Inits:  initiatives.filter(i => i.owner === u.name).length,
              }))}
              title="Carga de Trabajo por Usuario"
              subtitle="OKRs e Iniciativas asignadas"
              height={240}
              xKey="name"
              bars={[
                { key:"OKRs",  color:T.teal, label:"OKRs"        },
                { key:"Inits", color:T.blue, label:"Iniciativas"  },
              ]}
            />
          </Card>
        </div>
      )}

      {/* Modals */}
      {selected && (
        <UserDetailModal
          user={selected}
          okrs={okrs}
          initiatives={initiatives}
          kpis={kpis}
          onClose={() => setSelected(null)}
          onEdit={u => { setEditUser(u); setSelected(null); }}
        />
      )}

      {(editUser || showAdd) && (
        <UserFormModal
          user={editUser}
          onSave={handleSave}
          onClose={() => { setEditUser(null); setShowAdd(false); }}
        />
      )}
    </div>
  );
});

export default Users;
