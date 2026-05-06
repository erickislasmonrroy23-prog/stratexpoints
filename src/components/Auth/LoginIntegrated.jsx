import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase.js';
import { useStore } from '../../store.js';
import { initializeJWTMonitoring } from '../../utils/jwtUtils.js';
import './LoginIntegrated.css';

/**
 * LoginIntegrated Component
 *
 * Complete JWT + auth-context authentication flow:
 * 1. User enters email/password
 * 2. supabase.auth.signInWithPassword() generates JWT tokens
 * 3. Load profile from profiles table
 * 4. setAuth(user, profile) initializes state + triggers loadAuthContext()
 * 5. loadAuthContext() calls auth-context Edge Function
 * 6. Check passwordRotationDue and redirect to /change-password or /dashboard
 */

const TEST_USERS = [
  { email: 'admin@acme.test', label: 'ACME Admin' },
  { email: 'editor@acme.test', label: 'ACME Editor' },
  { email: 'viewer@acme.test', label: 'ACME Viewer' },
  { email: 'admin@techcorp.test', label: 'TechCorp Admin' },
  { email: 'viewer@techcorp.test', label: 'TechCorp Viewer' },
  { email: 'superadmin@platform.test', label: 'Platform Super Admin' }
];

export const LoginIntegrated = () => {
  const navigate = useNavigate();
  const setAuth = useStore((state) => state.setAuth);
  const checkPasswordRotation = useStore((state) => state.checkPasswordRotation);
  const getAuthContext = useStore((state) => state.getAuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('credentials'); // credentials, authenticating, loading-context, redirecting

  /**
   * Step 1-2: Sign in with email/password
   * Generates JWT access and refresh tokens
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStep('authenticating');

    try {
      logger.log('[Login] Step 1-2: Authenticating with Supabase...');

      // Sign in with Supabase Auth (generates JWT tokens)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        throw new Error(authError.message || 'Authentication failed');
      }

      if (!authData.user) {
        throw new Error('No user returned from authentication');
      }

      logger.log('[Login] Step 3: Loading user profile...');
      setStep('loading-context');

      // Step 3: Load user profile from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          is_super_admin,
          organization_roles,
          organizations:profile_organizations(
            id,
            name,
            role
          )
        `)
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        logger.warn('[Login] Profile load warning:', profileError);
        // Profile might not exist yet, but we can still proceed
      }

      const profile = profileData || {
        id: authData.user.id,
        email: authData.user.email,
        full_name: authData.user.user_metadata?.full_name || '',
        role: 'viewer',
        is_super_admin: false,
        organizations: []
      };

      logger.log('[Login] Step 4: Setting auth state and triggering loadAuthContext...');

      // Step 4: Initialize auth state
      // This automatically triggers loadAuthContext() inside setAuth
      setAuth(authData.user, profile);

      // Wait for auth context to load (with timeout)
      logger.log('[Login] Step 5: Waiting for auth context to load...');
      const maxRetries = 5;
      let contextLoaded = false;

      for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, 500));
        const state = useStore.getState();
        if (!state.authContextLoading) {
          contextLoaded = true;
          logger.log('[Login] Auth context loaded');
          break;
        }
      }

      if (!contextLoaded) {
        logger.warn('[Login] Auth context loading timeout, proceeding anyway');
      }

      // Step 5: Check password rotation requirement
      logger.log('[Login] Step 6: Checking password rotation requirement...');
      setStep('redirecting');

      const state = useStore.getState();
      if (state.passwordRotationDue) {
        logger.log('[Login] Password rotation due, redirecting to /change-password');
        navigate('/change-password', {
          state: { fromLogin: true }
        });
      } else {
        logger.log('[Login] Password rotation not required, redirecting to /dashboard');
        navigate('/dashboard');
      }

      // Initialize JWT monitoring
      await initializeJWTMonitoring();

    } catch (err) {
      logger.error('[Login] Error:', err);
      setError(err.message || 'Login failed. Please try again.');
      setStep('credentials');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Pre-fill with test user credentials
   */
  const handleTestUserSelect = (testEmail) => {
    setEmail(testEmail);
    setPassword('Test@123456'); // Default test password
    setError('');
  };

  return (
    <div className="login-integrated-container">
      <div className="login-integrated-card">
        <h1 className="login-title">StratexPoints</h1>
        <p className="login-subtitle">Enterprise Strategic Planning Platform</p>

        {/* Status Indicator */}
        <div className={`login-status ${step}`}>
          <span className="status-indicator"></span>
          <span className="status-text">
            {step === 'credentials' && 'Ready to login'}
            {step === 'authenticating' && 'Authenticating with Supabase...'}
            {step === 'loading-context' && 'Loading authentication context...'}
            {step === 'redirecting' && 'Redirecting...'}
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="login-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading || !email || !password}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="login-divider">
          <span>Test Users</span>
        </div>

        {/* Test User Quick Links */}
        <div className="test-users">
          {TEST_USERS.map((testUser) => (
            <button
              key={testUser.email}
              type="button"
              className="test-user-button"
              onClick={() => handleTestUserSelect(testUser.email)}
              disabled={loading}
              title={testUser.email}
            >
              {testUser.label}
            </button>
          ))}
        </div>

        {/* Debug Info */}
        <div className="login-debug">
          <details>
            <summary>Debug: Auth Context</summary>
            <DebugAuthContext />
          </details>
        </div>
      </div>
    </div>
  );
};

/**
 * Debug Component: Show current auth context
 */
const DebugAuthContext = () => {
  const user = useStore.use.user();
  const profile = useStore.use.profile();
  const enterpriseFeatures = useStore.use.enterpriseFeatures();
  const passwordRotationDue = useStore.use.passwordRotationDue();
  const sessionInfo = useStore.use.sessionInfo();

  return (
    <pre className="debug-info">
{JSON.stringify({
  user: user ? {
    id: user.id,
    email: user.email
  } : null,
  profile: profile ? {
    email: profile.email,
    role: profile.role,
    is_super_admin: profile.is_super_admin,
    organization: profile.organizations?.[0]?.name
  } : null,
  enterprise_features: enterpriseFeatures,
  password_rotation_due: passwordRotationDue,
  session_info: sessionInfo
}, null, 2)}
    </pre>
  );
};

export default LoginIntegrated;
