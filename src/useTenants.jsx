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
    setLoadingData(true);
    try {
      let query = supabase.from('organizations').select('*, profiles(*)', { count: 'exact' });

      if (!isSystemOwner) {
        query = query.eq('id', profile?.organization_id);
      }

      if (searchTenantQuery) {
        query = query.or(`name.ilike.%${searchTenantQuery}%,subdomain.ilike.%${searchTenantQuery}%`);
      }

      const { data, count, error } = await query
        .order('name', { ascending: true })
        .range((tenantPage - 1) * tenantsPerPage, tenantPage * tenantsPerPage - 1);

      if (error) throw error;

      const formattedTenants = data.map(org => ({
        id: org.id,
        name: org.name,
        subdomain: org.subdomain,
        industry: org.industry,
        size: org.size,
        logoUrl: org.logo_url,
        themeColor: org.theme_color,
        maxUsers: org.max_users,
        language: org.language,
        modules: org.modules,
        billingEmail: org.billing_email,
        priceBasic: org.price_basic,
        pricePremium: org.price_premium,
        isPaid: org.is_paid,
        users: org.profiles.map(p => ({
          id: p.id,
          name: p.full_name,
          email: p.email,
          role: p.role,
          jobTitle: p.job_title,
          photoUrl: p.photo_url,
          department: p.department,
          createdAt: p.created_at,
        })),
        roles: org.roles
      }));

      setTenants(formattedTenants);
      setTotalTenantPages(Math.ceil(count / tenantsPerPage));
    } catch (error) {
      console.error("Error loading tenants:", error);
      notificationService.error("Error al cargar las organizaciones: " + error.message);
    } finally {
      setLoadingData(false);
    }
  }, [isSystemOwner, profile, searchTenantQuery, tenantPage]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const updateTenant = useCallback(async (key, value, tenantId = selectedTenantId) => {
    if (!tenantId) return;
    try {
      const payload = { [key]: value };
      await organizationService.update(tenantId, payload);
      setTenants(prevTenants =>
        prevTenants.map(t => (t.id === tenantId ? { ...t, [key]: value } : t))
      );
      notificationService.success("Organización actualizada.");
    } catch (error) {
      console.error("Error updating tenant:", error);
      notificationService.error("Error al actualizar la organización: " + error.message);
    }
  }, [selectedTenantId]);

  return {
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
    updateTenant,
  };
}