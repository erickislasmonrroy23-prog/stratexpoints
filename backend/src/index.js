/**
 * StratexPoints Express Backend
 * FASE 6: Secrets Management API Server
 * FASE 7: Key Rotation Management
 */

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { initializeDatabase, closeDatabase, healthCheck } from './utils/database.js';
import {
  authMiddleware,
  organizationMiddleware,
  auditAuthMiddleware,
} from './middleware/auth.js';
import {
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler.js';
import secretsRoutes from './routes/secretsRoutes.js';
import rotationRoutes from './routes/rotationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { initializeScheduler, startScheduler } from './services/schedulerService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// Middleware Setup
// ============================================================================

// CORS Configuration
app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ============================================================================
// Health Check Endpoints (before auth)
// ============================================================================

app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await healthCheck();
    const status = dbHealthy ? 'ok' : 'degraded';
    const code = dbHealthy ? 200 : 503;

    res.status(code).json({
      status,
      timestamp: new Date(),
      database: dbHealthy ? 'connected' : 'disconnected',
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const dbHealthy = await healthCheck();
    res.json({
      healthy: dbHealthy,
      timestamp: new Date(),
      version: '1.0.0',
      services: {
        database: dbHealthy ? 'ok' : 'error',
        api: 'ok',
      },
    });
  } catch (error) {
    res.status(500).json({ healthy: false, error: error.message });
  }
});

// ============================================================================
// API Routes
// ============================================================================

// Authentication middleware - applies to all /api routes
app.use('/api', authMiddleware);

// Organization middleware - ensures org_id matches
app.use('/api', organizationMiddleware);

// Audit logging
app.use('/api', auditAuthMiddleware);

// Secrets Management Routes
app.use('/api/secrets', secretsRoutes);

// Key Rotation Management Routes (FASE 7)
app.use('/api/keys', rotationRoutes);

// Notification Management Routes (FASE 7)
app.use('/api/notifications', notificationRoutes);

// ============================================================================
// Status Endpoint
// ============================================================================

app.get('/api/status', (req, res) => {
  res.json({
    service: 'StratexPoints Backend',
    status: 'running',
    version: '1.0.0',
    phase: 'FASE 7 - Key Rotation Management',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date(),
    user: {
      id: req.user?.userId,
      organizationId: req.user?.organizationId,
      role: req.user?.role,
    },
  });
});

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler for non-existent routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// Server Initialization
// ============================================================================

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized');

    // Initialize and start rotation scheduler
    initializeScheduler();
    startScheduler();
    console.log('✅ Rotation Scheduler initialized and started');

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════╗
║  StratexPoints Backend - FASE 7                      ║
║  Secrets Management & Key Rotation API               ║
╠══════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}
║  Environment: ${process.env.NODE_ENV || 'development'}
║  Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}
╠══════════════════════════════════════════════════════╣
║  SECRETS MANAGEMENT (FASE 6):                        ║
║  • POST   /api/secrets                               ║
║  • GET    /api/secrets                               ║
║  • GET    /api/secrets/:id                           ║
║  • GET    /api/secrets/:id/value                     ║
║  • PUT    /api/secrets/:id                           ║
║  • DELETE /api/secrets/:id                           ║
║  • GET    /api/secrets/:id/audit                     ║
╠══════════════════════════════════════════════════════╣
║  KEY ROTATION MANAGEMENT (FASE 7):                   ║
║  • GET    /api/keys/:secretId/policy                 ║
║  • POST   /api/keys/:secretId/policy                 ║
║  • GET    /api/keys/:secretId/preview                ║
║  • POST   /api/keys/:secretId/rotate                 ║
║  • GET    /api/keys/:secretId/history                ║
║  • GET    /api/keys/scheduled                        ║
║  SCHEDULE MANAGEMENT:                                ║
║  • POST   /api/keys/:secretId/schedule               ║
║  • GET    /api/keys/:secretId/schedules              ║
║  • GET    /api/keys/:secretId/schedule/:scheduleId   ║
║  • PUT    /api/keys/:secretId/schedule/:scheduleId   ║
║  • DELETE /api/keys/:secretId/schedule/:scheduleId   ║
╠══════════════════════════════════════════════════════╣
║  NOTIFICATION MANAGEMENT (FASE 7):                   ║
║  • GET    /api/notifications                         ║
║  • GET    /api/notifications/:id                     ║
║  • GET    /api/notifications/stats                   ║
║  • PATCH  /api/notifications/:id                     ║
║  • DELETE /api/notifications/:id                     ║
║  • POST   /api/notifications/actions/mark-all-read   ║
║  • DELETE /api/notifications                         ║
╠══════════════════════════════════════════════════════╣
║  SYSTEM ENDPOINTS:                                   ║
║  • GET    /health                                    ║
║  • GET    /api/health                                ║
║  • GET    /api/status                                ║
╚══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

// Start the server
startServer();

export default app;
