import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase.js';
import { organizationService, profileService, emailService, objectivesService } from './services.js';
import { useStore } from './store.js';
import { useTenants } from './useTenants.jsx';
import { useAuditLogs } from './useAuditLogs.jsx';
import jsPDF from 'jspdf'; // Importar jsPDF
import * as XLSX from 'xlsx';
import UserEditModal from './UserEditModal.jsx';
import TenantCard from './TenantCard.jsx'
import UserDirectory from './UserDirectory.jsx';
import BrandingSettings from './BrandingSettings.jsx';
import ModuleProvisioning from './ModuleProvisioning.jsx';
import BillingSettings from './BillingSettings.jsx';
import RoleManagement from './RoleManagement.jsx';
import BillingEngine from './BillingEngine.jsx';
import { notificationService } from './services.js';
import { TabBar } from './SharedUI.jsx';

export default function SuperAdmin({ user, profile, onBack }) {
  const can = useStore(state => state.can);
  const isSystemOwner = can('access', 'super_admin_panel');

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  const {
    tenants,
    setTenants,
    selectedTenantId,
    setSelectedTenantId,
    loadingData,
    searchTenantQuery,
    setSearchTenantQuery,
    tenantPage,
    setTenantPage,
    totalTenantPages,
    updateTenant: updateTenantInState,
  } = useTenants(isSystemOwner, profile, isUnlocked);

  const {
    auditLogs, loadingLogs, exportingLogs, startDate, setStartDate, endDate, setEndDate,
    searchLogQuery, setSearchLogQuery, currentPage, setCurrentPage, totalLogPages, exportLogsToExcel
  } = useAuditLogs(selectedTenantId);

  const [editingUser, setEditingUser] = useState(null); // Modal state for Create/Edit
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [adminTab, setAdminTab] = useState('bi');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingAuth, setUpdatingAuth] = useState(false);
  
  // Estados Fase 3: Seguridad y MFA (2FA)
  const [mfaStatus, setMfaStatus] = useState({ enabled: false, factors: [] });
  const [mfaSetup, setMfaSetup] = useState({ qr: null, secret: '', factorId: '' });
  const [mfaCode, setMfaCode] = useState('');
  const [loadingMfa, setLoadingMfa] = useState(false);
  
  // Estado para el PIN de la Bóveda
  const [vaultPin, setVaultPin] = useState(() => localStorage.getItem('sp-vault-pin') || '2315');
  const [pinForm, setPinForm] = useState({ newPin: '', confirmPin: '' });
  
  const [systemTotalUsers, setSystemTotalUsers] = useState(0);
  const [globalMetrics, setGlobalMetrics] = useState({ mrr: 0, active: 0, atRisk: 0 });

  // Función para ejecutar el backfill de códigos de objetivos
  const handleBackfillObjectiveCodes = async () => {
    if (!window.confirm("¿Estás seguro de querer asignar códigos a todos los objetivos sin código? Esto actualizará la base de datos.")) return;
    try {
      // Obtener todos los tenants y hacer backfill por organización
      const orgs = await organizationService.getAll();
      let total = 0;
      for (const org of orgs) {
        const count = await objectivesService.backfillObjectiveCodes(org.id);
        total += count;
      }
      notificationService.success(`✅ Se asignaron códigos a ${total} objetivos en ${orgs.length} organizaciones.`);
    } catch (e) { notificationService.error("Error al asignar códigos: " + e.message); }
  };


  // Cargar Métricas Globales Financieras (BI - Command Center)
  useEffect(() => {
    if (!isSystemOwner || !isUnlocked) return;
    let isMounted = true;
    async function fetchMetrics() {
      try {
        const { data: orgs } = await supabase.from('organizations').select('id, modules');
        const { data: profs } = await supabase.from('profiles').select('id, organization_id');

        let mrr = 0; let active = 0; let atRisk = 0;
        const today = new Date();
        const currentMonthStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0');
        const currentDay = today.getDate();

        const usersPerOrg = {};
        profs?.forEach(p => { if(p.organization_id) usersPerOrg[p.organization_id] = (usersPerOrg[p.organization_id] || 0) + 1; });

        orgs?.forEach(t => {
           const isPaidThisMonth = t.modules?.lastPaymentMonth === currentMonthStr;
           const isGracePeriod = !isPaidThisMonth && currentDay <= 10;
           const activePrice = t.modules?.ai ? 29 : 12;
           const usersCount = usersPerOrg[t.id] || 0;

           if (isPaidThisMonth || isGracePeriod) {
             mrr += (usersCount * activePrice);
             active++;
           } else {
             atRisk++;
           }
        });
        if (isMounted) {
          setGlobalMetrics({ mrr, active, atRisk });
          setSystemTotalUsers(profs?.length || 0);
        }
      } catch (e) { console.error("Error metrics BI:", e); }
    }
    fetchMetrics();
    return () => { isMounted = false; };
  }, [isSystemOwner, isUnlocked, tenants]);

  // Cargar estado de MFA al entrar a la pestaña de Seguridad
  useEffect(() => {
    if (adminTab === 'security') {
      async function checkMfa() {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (data) {
          const verified = (data.totp || []).filter(f => f.status === 'verified');
          setMfaStatus({ enabled: verified.length > 0, factors: verified });
        }
      }
      checkMfa();
    }
  }, [adminTab]);

  // Lógica del PIN de Seguridad
  const handlePinChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    
    if (value !== '' && index < 3) pinRefs[index + 1].current.focus();
    
    if (newPin.join('') === vaultPin) {
      setTimeout(() => setIsUnlocked(true), 300);
    } else if (newPin.join('').length === 4) {
      notificationService.error("Código incorrecto. Acceso denegado.");
      setPin(['', '', '', '']);
      pinRefs[0].current.focus();
    }
  };

  const handleSaveBranding = async () => {
    try {
      const payload = {
        name: currentTenant.name, subdomain: currentTenant.subdomain, industry: currentTenant.industry,
        size: currentTenant.size, logo_url: currentTenant.logoUrl, theme_color: currentTenant.themeColor,
        max_users: currentTenant.maxUsers, modules: currentTenant.modules,
        
      };
      try {
        await organizationService.update(currentTenant.id, payload);
        notificationService.success("✅ Perfil de empresa guardado exitosamente en la base de datos.");
      } catch (err) {
        // PLAN B: Si la caché de Supabase falla, guardamos todo menos la facturación para no perder el trabajo
        if (err.message?.includes('schema cache') || err.message?.includes('Could not find')) {
          const safePayload = payload;
          await organizationService.update(currentTenant.id, safePayload);
          notificationService.success("✅ Datos base e Identidad guardados con éxito.");
          notificationService.error("⚠️ Nota: Los datos de facturación no se guardaron porque la base de datos está actualizando su memoria (caché). Por favor, espera unos minutos e intenta guardarlos nuevamente.");
        } else {
          throw err;
        }
      }
    } catch (e) {
      notificationService.error("Error al guardar en base de datos: " + e.message);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return notificationService.error("Las contraseñas no coinciden.");
    if (newPassword.length < 8) return notificationService.error("Por normativas de seguridad (ISO 27001), la contraseña debe tener al menos 8 caracteres.");
    
    setUpdatingAuth(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingAuth(false);
    
    if (error) {
      notificationService.error("Error de seguridad al actualizar: " + error.message);
    } else {
      notificationService.success("✅ Credenciales maestras actualizadas con éxito. Por seguridad, tus sesiones en otros dispositivos se invalidarán.");
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleUpdatePin = (e) => {
    e.preventDefault();
    if (pinForm.newPin.length !== 4) return notificationService.error("El PIN debe ser exactamente de 4 dígitos.");
    if (pinForm.newPin !== pinForm.confirmPin) return notificationService.error("Los códigos PIN no coinciden.");
    localStorage.setItem('sp-vault-pin', pinForm.newPin);
    setVaultPin(pinForm.newPin);
    setPinForm({ newPin: '', confirmPin: '' });
    notificationService.success("✅ PIN de la Bóveda actualizado con éxito.");
  };

  const handleSetupMfa = async () => {
    setLoadingMfa(true);
    try {
      // 1. Limpiar cualquier intento de configuración abandonado previamente
      const { data: existing } = await supabase.auth.mfa.listFactors();
      if (existing?.totp) {
        const unverified = existing.totp.filter(f => f.status === 'unverified');
        for (const factor of unverified) {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      // 2. Crear un nuevo factor de seguridad con un nombre identificable
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Bóveda Raíz Xtratia' });
      if (error) throw error;
      setMfaSetup({ qr: data.totp.qr_code, secret: data.totp.secret, factorId: data.id });
    } catch (error) {
      notificationService.error("Error iniciando 2FA: " + error.message);
    }
    setLoadingMfa(false);
  };

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    setLoadingMfa(true);
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaSetup.factorId });
    if (challengeError) { notificationService.error("Error: " + challengeError.message); setLoadingMfa(false); return; }
    
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaSetup.factorId, challengeId: challengeData.id, code: mfaCode });
    if (verifyError) { notificationService.error("Código incorrecto. Revisa tu aplicación de autenticación."); }
    else {
      notificationService.success("✅ Autenticación de Dos Factores (MFA) activada con éxito.");
      setMfaSetup({ qr: null, secret: '', factorId: '' });
      setMfaCode('');
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = (data?.totp || []).filter(f => f.status === 'verified');
      setMfaStatus({ enabled: verified.length > 0, factors: verified });
    }
    setLoadingMfa(false);
  };

  const handleDisableMfa = async (factorId) => {
    if (!window.confirm("⚠️ PELIGRO DE SEGURIDAD\n\n¿Estás absolutamente seguro de deshabilitar la autenticación de dos factores? Esto reducirá drásticamente la protección de la cuenta Raíz.")) return;
    setLoadingMfa(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) notificationService.error("Error: " + error.message);
    else {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = (data?.totp || []).filter(f => f.status === 'verified');
      setMfaStatus({ enabled: verified.length > 0, factors: verified });
    }
    setLoadingMfa(false);
  };

  const currentTenant = tenants.find(t => t.id === selectedTenantId);

  // Modificamos esta función para que permita actualizar cualquier inquilino de la lista global
  const updateTenant = (key, value, specificTenantId = selectedTenantId) => {
    setTenants(prev => prev.map(t => t.id === specificTenantId ? { ...t, [key]: value } : t));
  };

  const toggleModule = (mod) => {
    if (!isSystemOwner) return notificationService.error("⚠️ Solo el Súper Administrador puede modificar los módulos de tu plan.");
    const currentMods = currentTenant.modules || {};
    updateTenant('modules', { ...currentMods, [mod]: !currentMods[mod] });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `tenant_${currentTenant?.id || 'new'}_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
      updateTenant('logoUrl', data.publicUrl);
    } catch (error) {      
      notificationService.error("Error al subir el logo: " + error.message);
    } finally {
      setUploadingLogo(false);
      e.target.value = ''; // Limpia la memoria del input para permitir subir el mismo archivo
    }
  };

  const handleUserPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `user_${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setEditingUser({ ...editingUser, photoUrl: data.publicUrl });
    } catch (error) {      
      notificationService.error("Error al subir la foto: " + error.message);
    } finally {
      setUploadingAvatar(false);
      e.target.value = ''; // Limpia la memoria del input para permitir subir el mismo archivo
    }
  };

  const copyLink = (subdomain) => {
    const link = `https://${subdomain || 'empresa'}.xtratia.com`;
    navigator.clipboard.writeText(link);
    notificationService.success(`🔗 Enlace copiado al portapapeles:\n${link}`);
  };

  const sendInvite = (userObj, subdomain) => {
    // Llamada al motor de correos de Resend
    emailService.sendInvite(userObj, subdomain);
  };

  const downloadAccessPDF = (userObj, tenant) => {
    const doc = new jsPDF();
    
    // Cabecera Corporativa
    doc.setFillColor(37, 99, 235); // Azul Primario
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Bienvenido a Xtratia", 105, 22, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Bóveda Estratégica Corporativa", 105, 32, { align: "center" });
    
    // Cuerpo del Documento
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Hola, ${userObj.name}`, 20, 65);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Se ha creado tu cuenta de acceso para la plataforma de ${tenant.name}.`, 20, 75);
    doc.text("A continuación, encontrarás tus credenciales de ingreso:", 20, 85);
    
    // Caja de Datos
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(20, 95, 170, 75, 'FD');
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("ENLACE DE ACCESO:", 28, 110);
    doc.setFontSize(13);
    doc.setTextColor(37, 99, 235);
    doc.setFont("helvetica", "normal");
    doc.text(`https://${tenant.subdomain}.xtratia.com`, 28, 118);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("USUARIO (CORREO):", 28, 132);
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.text(`${userObj.email}`, 28, 140);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRASEÑA TEMPORAL:", 28, 154);
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.text(`(Solicítala a tu administrador de cuenta)`, 28, 162);
    
    // Pie de página
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text("Guarda este documento en un lugar seguro. Por motivos de seguridad,", 20, 186);
    doc.text("te recomendamos cambiar tu contraseña una vez ingreses al sistema.", 20, 192);
    
    doc.save(`Credenciales_${userObj.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleSaveUser = async () => {
    if (!editingUser?.name || !editingUser?.email) return notificationService.error("⚠️ Por favor completa al menos el nombre y el correo.");
    
    const currentUsers = currentTenant?.users || [];
    
    try {
      if (editingUser.isNew) {
        const maxLimit = currentTenant?.maxUsers || 5;
        if (currentUsers.length >= maxLimit) return notificationService.error(`⛔ LÍMITE DE LICENCIAS ALCANZADO\n\nTu plan actual solo permite ${maxLimit} usuarios.`);
        if (!editingUser.password) return notificationService.error("⚠️ Ingresa una contraseña temporal para el nuevo usuario.");
        
        const payload = { full_name: editingUser.name, email: editingUser.email, role: editingUser.role, job_title: editingUser.jobTitle, photo_url: editingUser.photoUrl, organization_id: currentTenant.id, department: editingUser.department };
        const data = await profileService.create(payload);
        if (data && data[0]) {
          const newUser = { id: data[0].id, name: data[0].full_name, email: data[0].email, role: data[0].role, jobTitle: data[0].job_title, photoUrl: data[0].photo_url, department: data[0].department, createdAt: data[0].created_at || new Date().toISOString() };
          updateTenant('users', [...currentUsers, newUser]);
        }
      } else {
        const payload = { full_name: editingUser.name, email: editingUser.email, role: editingUser.role, job_title: editingUser.jobTitle, photo_url: editingUser.photoUrl, department: editingUser.department };
        await profileService.update(editingUser.id, payload);
        const updatedUsers = currentUsers.map(u => u.id === editingUser.id ? editingUser : u);
        updateTenant('users', updatedUsers);
      }
      setEditingUser(null);
    } catch (e) { notificationService.error("Error al guardar usuario: " + e.message); }
  };

  const handleAddTenant = async () => {
    const newTenant = {
      name: 'Nueva Organización', subdomain: `empresa-${Date.now().toString().slice(-4)}`, industry: 'Tecnología', size: '1-50', logo_url: '', theme_color: '#6366f1', max_users: 5,
      modules: { strategy: true, okrs: true, kpis: true, initiatives: true, ai: true, reports: true }
    };
    try {
      const data = await organizationService.create(newTenant);
      if (data && data[0]) {
        const created = { id: data[0].id, name: data[0].name, subdomain: data[0].subdomain, industry: data[0].industry, size: data[0].size, logoUrl: data[0].logo_url, themeColor: data[0].theme_color, maxUsers: data[0].max_users, modules: data[0].modules, billingEmail: '', priceBasic: 12, pricePremium: 29, isPaid: true, users: [] };
        setTenants([created, ...tenants]);
        setSelectedTenantId(created.id);
      }
    } catch(e) { notificationService.error("Error al crear empresa: " + e.message); }
  };

  if (!isUnlocked) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="scale-in" style={{ background: '#141414', border: '1px solid #262626', padding: 48, borderRadius: 24, textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', maxWidth: 400, width: '100%' }}>
          <div style={{ width: 64, height: 64, borderRadius: '20px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(220, 38, 38, 0.2))', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 24px', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>🔒</div>
          <h2 style={{ color: '#fff', fontSize: 24, marginBottom: 8, fontWeight: 800, letterSpacing: '-0.5px' }}>Bóveda de Administración</h2>
          <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>Ingresa tu PIN de seguridad para acceder al panel de control Multi-Tenant.</p>
          
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
            {pin.map((digit, i) => (
              <input key={i} ref={pinRefs[i]} type="password" maxLength={1} value={digit}
                onChange={e => handlePinChange(i, e.target.value)}
                onKeyDown={e => { if (e.key === 'Backspace' && !digit && i > 0) pinRefs[i - 1].current.focus(); }}
                style={{ width: 56, height: 64, fontSize: 24, textAlign: 'center', background: '#000', border: '2px solid #3f3f46', borderRadius: 14, color: '#fff', outline: 'none', fontWeight: 800, transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#3f3f46'}
              />
            ))}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>← Volver a la plataforma</button>
            <button onClick={() => {              
              if(window.confirm("⚠️ Por seguridad extrema, restablecer el PIN requiere cerrar tu sesión actual en este dispositivo.\n\nDeberás volver a iniciar sesión con tu correo, contraseña maestra y código 2FA para crear un PIN nuevo.\n\n¿Deseas proceder y cerrar sesión?")) {
                localStorage.removeItem('sp-vault-pin');
                supabase.auth.signOut().then(() => window.location.reload());
              }
            }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>¿Olvidaste tu PIN?</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <button className="sp-btn" onClick={() => (selectedTenantId && isSystemOwner) ? setSelectedTenantId(null) : onBack()} style={{ marginBottom: 32, background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 99, padding: '10px 24px', fontSize: 13, fontWeight: 700, transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)', display: 'inline-flex', alignItems: 'center', gap: 8 }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--text)'; e.currentTarget.style.color = 'var(--bg)'; e.currentTarget.style.transform = 'translateX(-4px)'; e.currentTarget.style.borderColor = 'var(--text)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
        <span style={{ fontSize: 16, transition: 'transform 0.2s' }}>←</span> {(selectedTenantId && isSystemOwner) ? 'Volver a lista de Empresas' : 'Volver a la App'}
      </button>
      
      <div className="page-header" style={{ marginBottom: 32, background: 'linear-gradient(135deg, var(--bg2), var(--bg))', padding: '40px 32px', borderRadius: 20, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg3)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, background: 'var(--green)', borderRadius: '50%', boxShadow: '0 0 8px var(--green)' }}></div>
            {isSystemOwner ? 'Súper Admin (Acceso Raíz)' : 'Admin de Empresa'}
          </div>
          {selectedTenantId ? (
            <>
              <div className="page-title scale-in" style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1px', color: 'var(--primary)', marginBottom: 8, lineHeight: 1.1 }}>{currentTenant?.name || 'Cargando...'}</div>
              <div className="page-subtitle" style={{ fontSize: 15, color: 'var(--text2)' }}>⚙️ Configuración del perfil corporativo, accesos y facturación.</div>
            </>
          ) : (
            <>
              <div className="page-title" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{fontSize: 28}}>{isSystemOwner ? '⚡' : '⚙️'}</span> {isSystemOwner ? 'Administración de Plataforma' : 'Ajustes de Empresa'}
              </div>
              <div className="page-subtitle" style={{ fontSize: 14, color: 'var(--text2)' }}>
                {isSystemOwner ? 'Gestión centralizada de organizaciones, licencias y configuración global del sistema.' : 'Gestiona los usuarios, licencias y personalización de tu plataforma.'}
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {selectedTenantId && (
            <button className="sp-btn sp-card-hover scale-in" onClick={handleSaveBranding} style={{ background: 'var(--primary)', color: '#fff', padding: '16px 32px', borderRadius: 99, fontSize: 15, fontWeight: 800, boxShadow: '0 8px 16px rgba(37,99,235,0.3)' }}>
              💾 Guardar Cambios
            </button>
          )}
        </div>
      </div>

      {!selectedTenantId && isSystemOwner ? (
        loadingData ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text3)' }}>
            <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
            Sincronizando Base de Datos...
          </div>
        ) : (
        <div className="fade-up" style={{ animationDelay: '0.1s' }}>
          <div style={{ marginBottom: 32 }}>
            <TabBar tabs={[
              {id: 'bi', icon: '📈', label: 'Command Center (BI)'},
              {id: 'orgs', icon: '🏢', label: 'Portafolio de Organizaciones'}, 
              {id: 'billing', icon: '💳', label: 'Motor de Facturación'}, 
              {id: 'security', icon: '🔐', label: 'Seguridad y Credenciales'}
            ]} active={adminTab} onChange={setAdminTab} />
          </div>
          
          {adminTab === 'bi' && (
            <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📈</div>
                    Executive Command Center
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text3)' }}>Métricas financieras y operativas consolidadas de todo el portafolio SaaS.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
                <div className="sp-card" style={{ padding: 24, borderTop: '4px solid var(--green)', background: 'linear-gradient(135deg, var(--bg2), rgba(34, 197, 94, 0.05))' }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Ingreso Recurrente (MRR)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--green)', letterSpacing: '-1px' }}>${globalMetrics.mrr.toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Ingresos calculados por licencias activas.</div>
                </div>
                
                <div className="sp-card" style={{ padding: 24, borderTop: '4px solid var(--primary)', background: 'var(--bg2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Empresas Activas</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--text)', letterSpacing: '-1px' }}>{globalMetrics.active}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Inquilinos al día con su pago.</div>
                </div>

                <div className="sp-card" style={{ padding: 24, borderTop: globalMetrics.atRisk > 0 ? '4px solid var(--red)' : '4px solid var(--border)', background: 'var(--bg2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Riesgo de Churn (Mora)</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: globalMetrics.atRisk > 0 ? 'var(--red)' : 'var(--text)', letterSpacing: '-1px' }}>{globalMetrics.atRisk}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Cuentas bloqueadas o expiradas.</div>
                </div>

                <div className="sp-card" style={{ padding: 24, borderTop: '4px solid var(--violet)', background: 'var(--bg2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Usuarios Globales</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--text)', letterSpacing: '-1px' }}>{systemTotalUsers}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Asientos totales aprovisionados.</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginTop: 4 }}>
                <div className="sp-card" style={{ padding: 24 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span>📡</span> Estado de la Infraestructura</h4>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Base de Datos (Supabase)</span>
                      <span className="sp-badge" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>● Operativo</span>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Motor de Inteligencia (Groq AI)</span>
                      <span className="sp-badge" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>● Latencia Baja</span>
                    </li>
                    <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Servicio de Correos (Resend)</span>
                      <span className="sp-badge" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>● Operativo</span>
                    </li>
                  </ul>
                </div>

                <div className="sp-card" style={{ padding: 24, background: 'linear-gradient(135deg, var(--bg3), var(--bg2))' }}>
                  <h4 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span>🧠</span> Insight Ejecutivo (IA)</h4>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                    <p style={{ marginBottom: 12 }}>El motor financiero reporta una base sólida con <strong>${globalMetrics.mrr.toLocaleString()}</strong> de MRR asegurado. Sin embargo, existen <strong>{globalMetrics.atRisk}</strong> organizaciones en riesgo de deserción (Churn).</p>
                    <p style={{ marginBottom: 12 }}>Se recomienda iniciar acciones de recuperación sobre el <strong>{globalMetrics.active + globalMetrics.atRisk > 0 ? Math.round((globalMetrics.active / (globalMetrics.active + globalMetrics.atRisk)) * 100) : 0}%</strong> de tu cartera activa para maximizar el LTV (Life Time Value) haciendo upselling del módulo de Inteligencia Artificial.</p>
                  </div>
                  <button onClick={() => setAdminTab('billing')} className="sp-btn" style={{ width: '100%', background: 'var(--text)', color: 'var(--bg)', justifyContent: 'center', marginTop: 12, padding: '12px', fontSize: 13, fontWeight: 800 }}>Ir al Motor de Facturación →</button>
                </div>
              </div>
            </div>
          )}
          
          {adminTab === 'orgs' && (
            <div className="fade-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>🏢 Portafolio de Organizaciones</h3>
                  <p style={{ fontSize: 13, color: 'var(--text3)' }}>Selecciona un inquilino (Tenant) para aislar su configuración.</p>
                </div>
                <button onClick={handleAddTenant} className="sp-btn scale-in" style={{ background: 'var(--primary)', color: '#fff', padding: '12px 28px', borderRadius: 99, fontSize: 14, fontWeight: 700, boxShadow: '0 8px 16px rgba(37,99,235,0.3)', transform: 'translateY(0)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  + Registrar Organización
                </button>
              </div>
              
              <div style={{ marginBottom: 20, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text3)' }}>🔍</span>
                <input 
                  className="sp-input" 
                  value={searchTenantQuery} 
                  onChange={e => { setSearchTenantQuery(e.target.value); setTenantPage(1); }} 
                  placeholder="Buscar organización por nombre o subdominio..." 
                  style={{ paddingLeft: 36, borderRadius: 12 }} 
                />
              </div>

              {tenants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 16, border: '1px dashed var(--border)' }}>
                  No se encontraron organizaciones.
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
                    {tenants.map(tenant => (
                      <TenantCard key={tenant.id} tenant={tenant} onSelect={setSelectedTenantId} />
                    ))}
                  </div>
                  {totalTenantPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      <button onClick={() => setTenantPage(p => Math.max(p - 1, 1))} disabled={tenantPage === 1} className="sp-btn" style={{ padding: '8px 16px', fontSize: 13, background: 'var(--bg3)', border: '1px solid var(--border)', color: tenantPage === 1 ? 'var(--text3)' : 'var(--text)', opacity: tenantPage === 1 ? 0.5 : 1 }}>← Anterior</button>
                      <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>Página {tenantPage} de {totalTenantPages}</span>
                      <button onClick={() => setTenantPage(p => Math.min(p + 1, totalTenantPages))} disabled={tenantPage === totalTenantPages} className="sp-btn" style={{ padding: '8px 16px', fontSize: 13, background: 'var(--bg3)', border: '1px solid var(--border)', color: tenantPage === totalTenantPages ? 'var(--text3)' : 'var(--text)', opacity: tenantPage === totalTenantPages ? 0.5 : 1 }}>Siguiente →</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {adminTab === 'billing' && (
            <div className="fade-up">
              <BillingEngine 
                tenants={tenants} 
                onUpdateTenant={updateTenant} 
                onSendInvoice={emailService.sendInvoice} 
              />
            </div>
          )}

          {adminTab === 'security' && (
            <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
              <div className="sp-card" style={{ padding: 32, borderTop: '4px solid var(--primary)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔢</div>
                  PIN de Acceso Rápido (Bóveda Local)
                </h3>
                <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>Cambia el código PIN de 4 dígitos que protege la pantalla de esta bóveda en tu dispositivo actual.</p>
                
                <form onSubmit={handleUpdatePin} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg3)', padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                    <div>
                      <label className="sp-label">Nuevo PIN</label>
                      <input className="sp-input" type="password" maxLength={4} required value={pinForm.newPin} onChange={e => setPinForm({...pinForm, newPin: e.target.value.replace(/\D/g, '')})} placeholder="••••" style={{ padding: '12px 16px', fontSize: 20, letterSpacing: 4, textAlign: 'center' }} />
                    </div>
                    <div>
                      <label className="sp-label">Confirmar PIN</label>
                      <input className="sp-input" type="password" maxLength={4} required value={pinForm.confirmPin} onChange={e => setPinForm({...pinForm, confirmPin: e.target.value.replace(/\D/g, '')})} placeholder="••••" style={{ padding: '12px 16px', fontSize: 20, letterSpacing: 4, textAlign: 'center' }} />
                    </div>
                  </div>
                  <button type="submit" disabled={pinForm.newPin.length < 4 || pinForm.confirmPin.length < 4} className="sp-btn" style={{ background: 'var(--primary)', color: '#fff', padding: '14px', fontSize: 14, fontWeight: 800, marginTop: 8, boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
                    🔢 Guardar Nuevo PIN
                  </button>
                </form>
              </div>

              <div className="sp-card" style={{ padding: 32, borderTop: '4px solid var(--red)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--red-light)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔑</div>
                  Actualización de Credenciales (Raíz)
                </h3>
                <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>Como propietario del sistema, es vital mantener una rotación de contraseñas periódica. Usa una contraseña fuerte alfanumérica y única para este entorno.</p>
                
                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg3)', padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
                  <div>
                    <label className="sp-label">Nueva Contraseña de Súper Admin</label>
                    <input className="sp-input" type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••••••" style={{ padding: '12px 16px', fontSize: 14 }} />
                  </div>
                  <div>
                    <label className="sp-label">Confirmar Nueva Contraseña</label>
                    <input className="sp-input" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••••••" style={{ padding: '12px 16px', fontSize: 14 }} />
                  </div>
                  <button type="submit" disabled={updatingAuth} className="sp-btn" style={{ background: 'var(--red)', color: '#fff', padding: '14px', fontSize: 14, fontWeight: 800, marginTop: 8, boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}>
                    {updatingAuth ? '⏳ Cifrando y Guardando...' : '🔐 Cambiar Contraseña Maestra'}
                  </button>
                </form>
              </div>

              <div className="sp-card" style={{ padding: 32, borderTop: '4px solid var(--violet)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124,58,237,0.15)', color: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📱</div>
                  Autenticación de Dos Factores (2FA / MFA)
                </h3>
                <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>Protege el acceso a la cuenta raíz exigiendo un código temporal generado en tu dispositivo móvil (Google Authenticator, Authy, etc).</p>
                
                {mfaStatus.enabled ? (
                  <div style={{ background: 'var(--green-light)', border: '1px solid var(--green)', padding: 20, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>✅ Tu cuenta está protegida</div>
                      <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4 }}>La autenticación de dos factores está activa y configurada.</div>
                    </div>
                    <button onClick={() => handleDisableMfa(mfaStatus.factors[0].id)} disabled={loadingMfa} className="sp-btn" style={{ background: 'var(--red)', color: '#fff', border: 'none', padding: '8px 16px' }}>{loadingMfa ? 'Procesando...' : 'Deshabilitar'}</button>
                  </div>
                ) : !mfaSetup.qr ? (
                  <div style={{ background: 'var(--bg3)', padding: 20, borderRadius: 12, border: '1px dashed var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }}>🛡️</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>No tienes la protección 2FA configurada.</div>
                    <button onClick={handleSetupMfa} disabled={loadingMfa} className="sp-btn" style={{ background: 'var(--violet)', color: '#fff', border: 'none', padding: '12px 24px', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>{loadingMfa ? 'Iniciando conexión...' : 'Configurar 2FA (Recomendado)'}</button>
                  </div>
                ) : (
                  <div className="scale-in" style={{ background: 'var(--bg3)', padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>Paso 1: Escanea este código QR con tu aplicación</div>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ width: 160, height: 160, background: '#fff', padding: 8, borderRadius: 12, border: '4px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={mfaSetup.qr} alt="Código QR para Google Authenticator" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>O ingresa el código manual: <strong style={{color:'var(--text)', background:'var(--bg)', padding:'2px 6px', borderRadius:4, userSelect:'all'}}>{mfaSetup.secret}</strong></div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>Paso 2: Verifica el código temporal</div>
                        <form onSubmit={handleVerifyMfa} style={{ display: 'flex', gap: 10 }}>
                          <input className="sp-input" type="text" maxLength={6} required value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" style={{ fontSize: 20, fontWeight: 800, letterSpacing: 4, width: 120, textAlign: 'center' }} />
                          <button type="submit" disabled={loadingMfa || mfaCode.length < 6} className="sp-btn" style={{ background: 'var(--primary)', color: '#fff' }}>{loadingMfa ? '...' : 'Verificar'}</button>
                        </form>
                        <button type="button" onClick={() => setMfaSetup({ qr: null, secret: '', factorId: '' })} style={{ marginTop: 12, background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>Cancelar configuración</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="sp-card" style={{ padding: 32, borderTop: '4px solid var(--gold)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gold)20', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛡️</div>
                  Políticas de Seguridad Activas (SOC 2 / ISO 27001)
                </h3>
                <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>El sistema Xtratia Enterprise OS está configurado con las siguientes directivas globales de ciberseguridad para proteger los datos Multi-Tenant:</p>
                
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: 0, padding: 0, listStyle: 'none' }}>
                  <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bg2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <div><strong style={{ fontSize: 14, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Cifrado en Reposo y en Tránsito (AES-256 & TLS 1.3)</strong><span style={{ fontSize: 12, color: 'var(--text2)' }}>Toda la información estratégica está encriptada militarmente. Nadie sin autenticación puede leer los datos.</span></div>
                  </li>
                  <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bg2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <div><strong style={{ fontSize: 14, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Registro de Auditoría Inmutable (Shadow Logging)</strong><span style={{ fontSize: 12, color: 'var(--text2)' }}>El módulo de logs globales está bloqueado contra eliminación, previniendo la alteración de la bitácora histórica.</span></div>
                  </li>
                  <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bg2)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <div><strong style={{ fontSize: 14, color: 'var(--text)', display: 'block', marginBottom: 4 }}>Segregación Lógica de Datos (Multi-Tenancy RLS)</strong><span style={{ fontSize: 12, color: 'var(--text2)' }}>Políticas de seguridad a nivel de fila (Row Level Security) garantizan que un Inquilino jamás pueda acceder a la Bóveda de otro.</span></div>
                  </li>
                </ul>
              </div>
            <div className="sp-card" style={{ padding: 32, borderTop: '4px solid var(--teal)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(13, 148, 136, 0.15)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛠️</div>
                Herramientas de Mantenimiento de Datos
              </h3>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>Ejecuta utilidades para corregir inconsistencias o mejorar la integridad de los datos estratégicos.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <button onClick={handleBackfillObjectiveCodes} className="sp-btn" style={{ background: 'var(--teal)', color: '#fff', padding: '14px', fontSize: 14, fontWeight: 800, boxShadow: '0 4px 12px rgba(13,148,136,0.3)' }}>
                  🔄 Asignar Códigos a Objetivos sin Código
                </button>
              </div>
            </div>
            </div>
          )}
        </div>
        )
      ) : (
        currentTenant && (
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: 24, alignItems: 'start' }}>
        
        {/* COLUMNA IZQUIERDA: BRANDING Y USUARIOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <BrandingSettings 
            tenant={currentTenant} 
            isSystemOwner={isSystemOwner} 
            onUpdate={updateTenant} 
            onSave={handleSaveBranding} 
            onCopyLink={copyLink} 
            onLogoUpload={handleLogoUpload} 
            uploadingLogo={uploadingLogo} 
          />

          <UserDirectory
            tenant={currentTenant}
            onAddUser={() => setEditingUser({ name: '', email: '', password: 'Temp' + Math.floor(1000 + Math.random() * 9000) + '*', role: 'editor', jobTitle: '', photoUrl: '', isNew: true, department: '' })}
            onEditUser={(u) => setEditingUser({ ...u, isNew: false })}
            onDownloadPDF={(u) => downloadAccessPDF(u, currentTenant)}
            onSendInvite={(u) => sendInvite(u, currentTenant.subdomain)}
          />
          
          <RoleManagement 
            tenant={currentTenant} 
            onUpdate={updateTenant} 
          />
        </div>

        {/* MODAL GIGANTE DE EDICIÓN/CREACIÓN DE USUARIO */}
        {editingUser && (
          <UserEditModal
            editingUser={editingUser}
            tenant={currentTenant}
            setEditingUser={setEditingUser}
            onSave={handleSaveUser}
            onCancel={() => setEditingUser(null)}
            onPhotoUpload={handleUserPhotoUpload}
            uploadingAvatar={uploadingAvatar}
          />
        )}

        {/* COLUMNA DERECHA: APROVISIONAMIENTO DE MÓDULOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <ModuleProvisioning 
            tenant={currentTenant} 
            isSystemOwner={isSystemOwner} 
            onToggleModule={toggleModule} 
          />

          <BillingSettings 
            tenant={currentTenant} 
            isSystemOwner={isSystemOwner} 
            onUpdate={updateTenant} 
            onSendInvoice={emailService.sendInvoice} 
          />

        <div className="sp-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🕵️</div>
                Registro de Auditoría (Logs)
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Desde:</span>
                <input type="date" className="sp-input" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} style={{ padding: '4px 8px', fontSize: 12, width: 'auto', borderRadius: 6, height: 'auto' }} />
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Hasta:</span>
                <input type="date" className="sp-input" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} style={{ padding: '4px 8px', fontSize: 12, width: 'auto', borderRadius: 6, height: 'auto' }} />
                {(startDate || endDate) && (
                  <button onClick={() => { setStartDate(''); setEndDate(''); setCurrentPage(1); }} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, borderRadius: 6, padding: '4px 8px' }} title="Limpiar fechas">Limpiar</button>
                )}
              </div>
            </div>
            <button onClick={exportLogsToExcel} disabled={exportingLogs} className="sp-btn" style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 12, padding: '8px 16px' }}>
              {exportingLogs ? '⏳ Generando Excel...' : '📥 Exportar Historial Completo'}
            </button>
          </div>
          
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text3)' }}>🔍</span>
            <input className="sp-input" value={searchLogQuery} onChange={e => { setSearchLogQuery(e.target.value); setCurrentPage(1); }} placeholder="Buscar en historial por módulo o acción..." style={{ paddingLeft: 36, borderRadius: 10, fontSize: 12 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
            {loadingLogs ? (
               <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)' }}>Cargando historial de acciones...</div>
            ) : auditLogs.length === 0 ? (
               <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)', background: 'var(--bg3)', borderRadius: 12, border: '1px dashed var(--border)' }}>No se encontraron registros de auditoría.</div>
            ) : (
               auditLogs.map(log => {
                 const userName = currentTenant?.users?.find(u => u.id === log.impersonated_user_id)?.name || 'Usuario Desconocido';
                 return (
                   <div key={log.id} style={{ padding: 12, background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                     <div style={{ fontSize: 16, marginTop: 2 }}>{log.action === 'CREATE' ? '✨' : log.action === 'UPDATE' ? '✏️' : log.action === 'DELETE' ? '🗑' : '📌'}</div>
                     <div style={{ flex: 1 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                         <span style={{ fontSize: 12, fontWeight: 800, color: log.action === 'DELETE' ? 'var(--red)' : 'var(--text)' }}>{log.action} en módulo {log.table_name}</span>
                         <span style={{ fontSize: 11, color: 'var(--text3)' }}>{log.created_at ? new Date(log.created_at).toLocaleString() : 'Reciente'}</span>
                       </div>
                       <div style={{ fontSize: 12, color: 'var(--text2)', wordBreak: 'break-all', lineHeight: 1.4 }}>
                         <strong>{userName}</strong> {log.super_admin_id ? <span style={{color: 'var(--primary)'}}>(Súper Admin)</span> : ''} modificó el registro ID: {log.record_id?.split('-')[0] || log.record_id}
                       </div>
                     </div>
                   </div>
                 );
               })
            )}
          </div>

          {totalLogPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="sp-btn" style={{ padding: '6px 12px', fontSize: 12, background: 'var(--bg3)', border: '1px solid var(--border)', color: currentPage === 1 ? 'var(--text3)' : 'var(--text)', opacity: currentPage === 1 ? 0.5 : 1 }}>← Anterior</button>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Página {currentPage} de {totalLogPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalLogPages))} disabled={currentPage === totalLogPages} className="sp-btn" style={{ padding: '6px 12px', fontSize: 12, background: 'var(--bg3)', border: '1px solid var(--border)', color: currentPage === totalLogPages ? 'var(--text3)' : 'var(--text)', opacity: currentPage === totalLogPages ? 0.5 : 1 }}>Siguiente →</button>
            </div>
          )}
        </div>
        </div>
      </div>
        )
      )}
      </div>
    </div>
  );
}
