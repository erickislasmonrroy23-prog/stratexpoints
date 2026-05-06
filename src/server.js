/**
 * StratexPoints Enterprise Security Framework Backend Server
 * Initializes Express app with security layers and routes
 * FASE 3: Infrastructure Hardening
 * FASE 4: API Security & Threat Detection
 * FASE 5: Secrets Management
 */

import express from 'express';
import logger from './utils/logger.js';
import { authenticateRequest } from './middleware/authMiddleware.js';
import { logSecurityAudit } from './middleware/auditMiddleware.js';

// Import security framework orchestration
import * as securityFramework from './services/securityFrameworkOrchestration.js';

// Import FASE 5 routes
import secretsVaultRoutes from './routes/secretsVaultRoutes.js';
import keyRotationRoutes from './routes/keyRotationRoutes.js';
import secretsLifecycleRoutes from './routes/secretsLifecycleRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Middleware Configuration
 */

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS middleware (adjust origins as needed for production)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('[Server] HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || 'anonymous',
    });
  });

  next();
});

/**
 * Security Framework Initialization
 */
let securityFrameworkInitialized = false;

const initializeSecurityFramework = async () => {
  try {
    logger.info('[Server] Initializing Security Framework...');

    const securityConfig = {
      fase3: {
        enableLoadBalancing: true,
        enableWAF: true,
        enableDDoS: true,
        enableBackup: true,
        enableSSLCert: true,
        enableMonitoring: true,
        enableIaC: true,
      },
      fase4: {
        enableAPIGateway: true,
        enableThreatDetection: true,
        enableAPISecurity: true,
        enableCompliance: true,
      },
      fase5: {
        enableVault: true,
        enableKeyRotation: true,
        enableLifecycle: true,
        masterKey: process.env.SECRETS_MASTER_KEY || 'default-dev-key-change-in-production',
      },
    };

    const result = await securityFramework.initializeSecurityFramework(securityConfig);

    if (result.success) {
      securityFrameworkInitialized = true;
      logger.info('[Server] Security Framework initialized successfully', {
        phasesInitialized: result.phasesInitialized,
        totalPhases: result.totalPhases,
        totalServices: result.totalServices,
        duration: result.duration,
      });
    } else {
      logger.error('[Server] Security Framework initialization failed', {
        error: result.error,
      });
    }

    return result;
  } catch (err) {
    logger.error('[Server] Exception initializing Security Framework', {
      error: err.message,
      stack: err.stack,
    });
    return { success: false, error: err.message };
  }
};

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    securityFramework: securityFrameworkInitialized ? 'initialized' : 'initializing',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Security Framework Status Endpoints
 */
app.get('/security/framework/status', authenticateRequest, (req, res) => {
  try {
    const status = securityFramework.getSecurityFrameworkStatus();
    return res.json(status);
  } catch (err) {
    logger.error('[Server] Exception getting framework status', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get framework status',
    });
  }
});

app.get('/security/framework/health', authenticateRequest, async (req, res) => {
  try {
    const health = await securityFramework.healthCheckSecurityFramework();
    return res.json(health);
  } catch (err) {
    logger.error('[Server] Exception getting framework health', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get framework health',
    });
  }
});

app.get('/security/framework/config', authenticateRequest, (req, res) => {
  try {
    const config = securityFramework.getSecurityFrameworkConfig();
    return res.json(config);
  } catch (err) {
    logger.error('[Server] Exception getting framework config', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get framework config',
    });
  }
});

app.get('/security/framework/services', authenticateRequest, (req, res) => {
  try {
    const services = securityFramework.getAllSecurityServices();
    return res.json(services);
  } catch (err) {
    logger.error('[Server] Exception getting security services', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get security services',
    });
  }
});

app.get('/security/framework/summary', authenticateRequest, (req, res) => {
  try {
    const summary = securityFramework.getSecurityFrameworkSummary();
    return res.json(summary);
  } catch (err) {
    logger.error('[Server] Exception getting framework summary', {
      error: err.message,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to get framework summary',
    });
  }
});

/**
 * Route Registration - FASE 5 Routes
 */

// Secrets Vault Routes
app.use('/api/secrets', secretsVaultRoutes);

// Key Rotation Routes
app.use('/api/keys', keyRotationRoutes);

// Secrets Lifecycle Routes
app.use('/api/lifecycle', secretsLifecycleRoutes);

/**
 * Error Handling Middleware
 */
app.use((err, req, res, next) => {
  logger.error('[Server] Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

/**
 * 404 Handler
 */
app.use((req, res) => {
  logger.warn('[Server] 404 Not Found', {
    path: req.path,
    method: req.method,
  });

  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

/**
 * Server Startup
 */
const startServer = async () => {
  try {
    // Initialize Security Framework first
    const initResult = await initializeSecurityFramework();

    if (!initResult.success) {
      logger.warn('[Server] Security Framework initialization had issues, but server will continue', {
        warning: initResult.error,
      });
    }

    // Start Express server
    app.listen(PORT, () => {
      logger.info('[Server] StratexPoints backend server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        securityFrameworkReady: securityFrameworkInitialized,
        timestamp: new Date().toISOString(),
      });

      console.log(`\n✅ StratexPoints Backend Server Running`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`🔐 Security Framework: ${securityFrameworkInitialized ? 'INITIALIZED' : 'INITIALIZING'}`);
      console.log(`🌐 Health Check: http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    logger.error('[Server] Critical error starting server', {
      error: err.message,
      stack: err.stack,
    });
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('[Server] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('[Server] SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();

export default app;
