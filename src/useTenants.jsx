import { useState, useEffect, useCallback } from 'react';
import { organizationService } from './services.js';
import { supabase } from './supabase.js';
import { notificationService } from "./services.js";

export function useTenants(isSystemOwner, profile) {
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTenantQuery, setSearchTenantQuery] = useState('');
  const [tenantPage, setTenantPage] = useState(1);
  const [totalTenantPages, setTotalTenantPages] = useState(1);
  const tenantsPerPage = 10;

  const loadTenants = useCallback(async () => {
    if (!isSystemOwner) { setLoadingData(false); return; }
    setLoadingData(true);
    try {
      // Usar la vista enriquecida que incluye user_count, okr_count, kpi_count
      const { data: orgs, error } = await supabase
        .from('organizations_with_stats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback a tabla principal si la vista no está disponible
        const { data: orgsSimple } = await supabase
          .from('organizations')
          .select('id, name, subdomain, industry, size, logo_url, theme_color, modules, max_users, status, plan, billing_email, price_basic, price_premium, is_paid, trial_ends_at, max_api_calls, api_calls_used')
          .order('created_at', { ascending: false });
        
        setTenants((orgsSimple || []).map(org => ({
          id: org.id,
          name: org.name,
          subdomain: org.subdomain,
          industry: org.industry,
          size: org.size,
          logoUrl: org.logo_url,
          themeColor: org.theme_color,
          modules: org.modules,
          maxUsers: org.max_users,
          status: org.status || 'active',
          plan: org.plan || 'basic',
          billingEmail: org.billing_email,
          priceBasic: org.price_basic,
          pricePremium: org.price_premium,
          isPaid: org.is_paid,
          trialEndsAt: org.trial_ends_at,
          maxApiCalls: org.max_api_calls,
          apiCallsUsed: org.api_calls_used,
          userCount: 0,
          okrCount: 0,
          kpiCount: 0,
        })));
        setTotalTenantPages(1);
        return;
      }

      const mapped = (orgs || []).map(org => ({
        id: org.id,
        name: org.name,
        subdomain: org.subdomain,
        industry: org.industry,
        size: org.size,
        logoUrl: org.logo_url,
        themeColor: org.theme_color,
        modules: org.modules,
        maxUsers: org.max_users,
        status: org.status || 'active',
        plan: org.plan || 'basic',
        billingEmail: org.billing_email,
        priceBasic: org.price_basic,
        pricePremium: org.price_premium,
        isPaid: org.is_paid || false,
        trialEndsAt: org.trial_ends_at,
        maxApiCalls: org.max_api_calls || 1000,
        apiCallsUsed: org.api_calls_used || 0,
        userCount: parseInt(org.user_count) || 0,
        okrCount: parseInt(org.okr_count) || 0,
        kpiCount: parseInt(org.kpi_count) || 0,
      }));

      setTenants(mapped);
      setTotalTenantPages(Math.max(1, Math.ceil(mapped.length / tenantsPerPage)));
      if (mapped.length > 0 && !selectedTenantId) {
        setSelectedTenantId(mapped[0].id);
      }
    } catch (e) {
      notificationService.error('Error cargando organizaciones: ' + e.message);
    } finally {
      setLoadingData(false);
    }
  }, [isSystemOwner]);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const filteredTenants = tenants.filter(t =>
    !searchTenantQuery ||
    (t.name || '').toLowerCase().includes(searchTenantQuery.toLowerCase()) ||
    (t.subdomain || '').toLowerCase().includes(searchTenantQuery.toLowerCase()) ||
    (t.industry || '').toLowerCase().includes(searchTenantQuery.toLowerCase()) ||
    (t.status || '').toLowerCase().includes(searchTenantQuery.toLowerCase()) ||
    (t.plan || '').toLowerCase().includes(searchTenantQuery.toLowerCase())
  );

  const paginatedTenants = filteredTenants.slice(
    (tenantPage - 1) * tenantsPerPage,
    tenantPage * tenantsPerPage
  );

  const currentTenant = tenants.find(t => t.id === selectedTenantId) || null;

  return {
    tenants,
    filteredTenants,
    paginatedTenants,
    currentTenant,
    selectedTenantId,
    setSelectedTenantId,
    loadingData,
    searchTenantQuery,
    setSearchTenantQuery,
    tenantPage,
    setTenantPage,
    totalTenantPages,
    loadTenants,
  };
}
