// Revoca el acceso de un usuario: elimina su perfil y su cuenta de autenticación.
// Solo lo puede ejecutar un administrador. Nadie puede eliminarse a sí mismo.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Falta el encabezado de autorización' }, 401);

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await caller.auth.getUser();
    if (userErr || !user) return json({ error: 'Sesión inválida' }, 401);

    const { data: me } = await admin.from('profiles').select('role, is_super_admin').eq('id', user.id).single();
    const isAdmin = !!me && (me.is_super_admin === true || ['admin', 'Admin', 'super_admin'].includes(me.role));
    if (!isAdmin) return json({ error: 'Solo un administrador puede eliminar usuarios' }, 403);

    const { userId } = await req.json();
    if (!userId) return json({ error: 'userId es requerido' }, 400);
    if (userId === user.id) return json({ error: 'No puedes eliminar tu propia cuenta' }, 400);

    await admin.from('profiles').delete().eq('id', userId);
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr && !/not.*found/i.test(delErr.message)) return json({ error: delErr.message }, 400);

    return json({ success: true });
  } catch (err) {
    return json({ error: (err as Error).message || 'Error interno' }, 500);
  }
});
