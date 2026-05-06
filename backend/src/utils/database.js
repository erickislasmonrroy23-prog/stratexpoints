/**
 * Database Connection Pool Manager
 * FASE 6: Multi-tenant database with connection pooling
 * FASE 7: Key Rotation Management
 */

import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stratexpoints',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  min: parseInt(process.env.DB_POOL_MIN) || 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute SQL query with automatic error handling
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<any>} Query result
 */
export async function query(query, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(query, params);
    const duration = Date.now() - start;

    // Log slow queries (> 1000ms)
    if (duration > 1000) {
      console.warn(`Slow query detected (${duration}ms): ${query.substring(0, 100)}`);
    }

    return result;
  } catch (error) {
    console.error('Database query error:', {
      error: error.message,
      query: query.substring(0, 200),
      params: params.length,
    });
    throw error;
  }
}

/**
 * Get a client for transaction management
 * @returns {Promise<PoolClient>} Database client
 */
export async function getClient() {
  return await pool.connect();
}

/**
 * Health check for database connection
 * @returns {Promise<boolean>} Database connectivity status
 */
export async function healthCheck() {
  try {
    const result = await pool.query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return false;
  }
}

/**
 * Initialize database (create schema if not exists)
 * Executes all migrations in sequence
 * @returns {Promise<void>}
 */
export async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');

    // Read and execute migrations
    const fs = await import('fs').then(m => m.default);
    const path = await import('path').then(m => m.default);
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    // List of migrations to execute in order
    const migrations = [
      '001_create_schema.sql',
      '002_add_key_rotation.sql',
    ];

    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, '../../migrations', migrationFile);
      try {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute migration
        await pool.query(migrationSQL);
        console.log(`✅ Migration ${migrationFile} executed successfully`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`⚠️  Migration file ${migrationFile} not found, skipping...`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

/**
 * Close database connection pool
 * @returns {Promise<void>}
 */
export async function closeDatabase() {
  await pool.end();
  console.log('Database connection pool closed');
}

export default pool;
