import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { jwtDecode } from 'https://esm.sh/jwt-decode@4.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Rate Limiting Utility
 * Prevents abuse by limiting requests per IP address
 * Configuration: 30 requests per 60-second window
 */
const rateLimit = {
  requests: new Map<string, number[]>(),
  limit: 30,
  window: 60000, // 1 minute in milliseconds

  /**
   * Check if a request from the given key (IP address) is within rate limits
   * Returns true if request is allowed, false if rate limit exceeded
   */
  check: (key: string): boolean => {
    const now = Date.now()
    const userReqs = rateLimit.requests.get(key) || []

    // Filter out requests older than the window
    const recent = userReqs.filter((timestamp: number) => now - timestamp < rateLimit.window)

    // Check if limit exceeded
    if (recent.length >= rateLimit.limit) {
      return false
    }

    // Add current request timestamp
    recent.push(now)
    rateLimit.requests.set(key, recent)

    // Cleanup: remove old entries to prevent memory leak
    // Clean up this IP if no recent requests
    if (recent.length === 0) {
      rateLimit.requests.delete(key)
    }

    return true
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Extract client IP from x-forwarded-for header (set by Supabase edge network)
    // Falls back to a default if header is not present
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'

    // Check rate limit
    if (!rateLimit.check(clientIP)) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Maximum 30 requests per minute allowed.'
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        }
      )
    }

    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.substring(7)

    // Decode JWT to get user ID
    let decodedToken: any
    try {
      decodedToken = jwtDecode(token)
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JWT token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = decodedToken.sub
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid token: missing user ID' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role for database queries
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Query user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        `
        id,
        email,
        full_name,
        role,
        is_super_admin,
        organization_roles,
        profile_organizations(
          id,
          organization_id,
          role,
          organization:organizations(
            id,
            name
          )
        )
      `
      )
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Profile query error:', profileError)
      // Return minimal context if profile not found
      return new Response(
        JSON.stringify({
          data: {
            user_id: userId,
            email: decodedToken.email || '',
            is_super_admin: false,
            organizations: [],
            enterprise_features: {
              api_access: false,
              audit_logs: false,
              sso: false,
              advanced_analytics: false
            },
            password_rotation_due: false,
            session_info: {
              expires_at: new Date(decodedToken.exp * 1000).toISOString(),
              last_activity: new Date().toISOString()
            }
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build organization context
    const organizations = (profile?.profile_organizations || []).map((po: any) => ({
      id: po.organization_id,
      name: po.organization?.name,
      role: po.role
    }))

    // Determine enterprise features based on role
    const isAdmin = profile?.role === 'admin' || profile?.is_super_admin
    const enterpriseFeatures = {
      api_access: isAdmin,
      audit_logs: isAdmin,
      sso: isAdmin,
      advanced_analytics: isAdmin
    }

    // Build auth context response
    const authContext = {
      data: {
        user_id: userId,
        email: profile?.email,
        full_name: profile?.full_name,
        role: profile?.role,
        is_super_admin: profile?.is_super_admin || false,
        organizations: organizations,
        enterprise_features: enterpriseFeatures,
        password_rotation_due: false, // Can be extended with organization policy
        session_info: {
          expires_at: new Date(decodedToken.exp * 1000).toISOString(),
          last_activity: new Date().toISOString(),
          token_issued_at: new Date(decodedToken.iat * 1000).toISOString()
        },
        permissions: {
          can_create_projects: isAdmin,
          can_delete_projects: profile?.is_super_admin || false,
          can_manage_users: isAdmin,
          can_manage_roles: profile?.is_super_admin || false
        }
      }
    }

    return new Response(JSON.stringify(authContext), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
