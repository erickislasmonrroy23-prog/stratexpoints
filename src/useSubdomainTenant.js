/**
 * useSubdomainTenant
 *
 * Detecta el subdominio del URL actual y carga el tenant correspondiente
 * de la base de datos. Esto permite que:
 *
 *   https://acme.xtratia.com  →  Login con branding de Acme Corp
 *
 * Para que los subdominios funcionen en producción debes:
 *   1. DNS:     Agregar registro CNAME wildcard en tu proveedor de dominio:
 *                 *.xtratia.com  →  cname.vercel-dns.com
 *   2. Vercel:  En Settings → Domains, agregar "*.xtratia.com" al proyecto
 *
 * En localhost y en vercel.app de staging NO se activa la detección.
 */

import { useEffect } from 'react';
import { supabase } from './supabase.js';
import { useStore } from './store.js';

/** Extrae el slug del tenant del hostname actual, o null si no aplica. */
export function getSubdomainSlug() {
  const hostname = window.location.hostname;

  // Ignorar localhost, IPs y el dominio raíz sin subdominio
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    !hostname.includes('.')
  ) return null;

  const parts = hostname.split('.');

  // Solo activar para *.xtratia.com (no para stratexpoints.vercel.app u otros)
  if (!hostname.endsWith('.xtratia.com')) return null;

  // acme.xtratia.com → ['acme', 'xtratia', 'com'] → slug = 'acme'
  if (parts.length < 3) return null;

  const slug = parts[0].toLowerCase();

  // Excluir subdominios reservados que no son tenants
  const RESERVED = ['www', 'app', 'api', 'admin', 'staging', 'dev', 'mail', 'smtp', 'ftp'];
  if (RESERVED.includes(slug)) return null;

  return slug;
}

/** Hook que detecta el subdominio una vez al montar y carga el tenant en el store. */
export function useSubdomainTenant() {
  const setCurrentOrganization = useStore(s => s.setCurrentOrganization);

  useEffect(() => {
    const slug = getSubdomainSlug();
    if (!slug) return; // URL principal — sin tenant específico

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
          console.warn('[SubdomainTenant] Error al cargar tenant:', error.message);
          return;
        }

        if (!data) {
          console.warn(`[SubdomainTenant] No se encontró tenant con subdominio "${slug}"`);
          return;
        }

        if (data.status === 'suspended') {
          console.warn(`[SubdomainTenant] Tenant "${slug}" está suspendido`);
          return;
        }

        // Inyectar en el store — Login.jsx lo leerá automáticamente para mostrar el branding
        setCurrentOrganization(data);

        // Aplicar color primario del tenant si tiene uno configurado
        if (data.theme_color) {
          document.documentElement.style.setProperty('--primary', data.theme_color);
          document.documentElement.style.setProperty(
            '--primary-light',
            data.theme_color + '22'
          );
        }

        // Actualizar favicon y title de la pestaña del navegador
        document.title = `${data.name} — Xtratia`;
      } catch (e) {
        console.warn('[SubdomainTenant] Excepción:', e.message);
      }
    }

    loadTenant();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar — el slug es fijo para la vida de la pestaña
}
