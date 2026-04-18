/**
 * useSubdomainTenant
 *
 * Detecta el tenant de tres formas, en orden de prioridad:
 *
 *  1. QUERY PARAM (testing gratuito, sin dominio propio):
 *       https://stratexpoints.vercel.app/?org=acme
 *       → Funciona hoy, sin DNS ni Vercel Domains
 *
 *  2. SUBDOMINIO (producción con dominio propio):
 *       https://acme.xtratia.com
 *       → Requiere: DNS wildcard *.xtratia.com → cname.vercel-dns.com
 *                   Vercel Settings → Domains → agregar *.xtratia.com
 *
 *  3. Sin slug → login genérico de Xtratia (URL principal)
 *
 * En todos los casos el Login.jsx muestra automáticamente el branding
 * del tenant (logo, nombre, color) sin ningún cambio adicional.
 */

import { useEffect } from 'react';
import { supabase } from './supabase.js';
import { useStore } from './store.js';

/**
 * Resuelve el slug del tenant desde la URL actual.
 * Prioridad: ?org= > subdominio *.xtratia.com
 */
export function getTenantSlug() {
  // 1. Query param — para testing sin dominio propio
  //    URL: https://stratexpoints.vercel.app/?org=acme
  const params = new URLSearchParams(window.location.search);
  const orgParam = params.get('org')?.toLowerCase().trim();
  if (orgParam) return orgParam;

  // 2. Subdominio — para producción con xtratia.com
  const hostname = window.location.hostname;
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    !hostname.includes('.')
  ) return null;

  if (!hostname.endsWith('.xtratia.com')) return null;

  const parts = hostname.split('.');
  if (parts.length < 3) return null;

  const slug = parts[0].toLowerCase();
  const RESERVED = ['www', 'app', 'api', 'admin', 'staging', 'dev', 'mail', 'smtp', 'ftp'];
  if (RESERVED.includes(slug)) return null;

  return slug;
}

/**
 * Aplica la identidad visual del tenant al documento.
 */
function applyTenantBranding(tenant) {
  if (tenant.theme_color) {
    document.documentElement.style.setProperty('--primary', tenant.theme_color);
    document.documentElement.style.setProperty('--primary-light', tenant.theme_color + '22');
    // Guardar para restaurar si se desmonta
    document._xtratiaOriginalPrimary =
      document.documentElement.style.getPropertyValue('--primary') || '';
  }
  document.title = `${tenant.name} — Xtratia`;
}

/** Hook principal — detecta slug y carga tenant en el store. */
export function useSubdomainTenant() {
  const setCurrentOrganization = useStore(s => s.setCurrentOrganization);

  useEffect(() => {
    const slug = getTenantSlug();
    if (!slug) return;

    let cancelled = false;

    async function loadTenant() {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, subdomain, logo_url, theme_color, modules, status')
          .eq('subdomain', slug)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn('[TenantRouter] Error:', error.message);
          return;
        }
        if (!data) {
          console.warn(`[TenantRouter] Tenant "${slug}" no encontrado`);
          return;
        }
        if (data.status === 'suspended') {
          console.warn(`[TenantRouter] Tenant "${slug}" suspendido`);
          return;
        }

        setCurrentOrganization(data);
        applyTenantBranding(data);
      } catch (e) {
        console.warn('[TenantRouter] Excepción:', e.message);
      }
    }

    loadTenant();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
