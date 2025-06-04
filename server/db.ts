import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import logger from './utils/logger';

// Configure neon to use WebSockets
neonConfig.webSocketConstructor = ws;

// Check for required environment variable
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with proper error handling and conservative settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // 10 second timeout
  max: 5, // Reduce max connections to avoid overwhelming the server
  idleTimeoutMillis: 30000, // 30 seconds before idle connections are closed
  maxUses: 100, // Max number of times a client can be used before being recycled
  allowExitOnIdle: false, // Prevent pool from shutting down on idle
});

// Handle connection errors
pool.on('error', (err: Error) => {
  logger.error('Unexpected error on database client', err);
  // Log only standard error properties to avoid TypeScript errors
  logger.error('Error message:', err.message);
  logger.error('Error stack:', err.stack);
  // Don't crash the server, just log the error
  // process.exit(1);
});

// Monitor pool events
pool.on('connect', () => {
  logger.info('New client connected to database');
});

pool.on('remove', () => {
  logger.info('Client removed from pool');
});

// Initialize Drizzle ORM with the schema
export const db = drizzle(pool, { 
  schema,
  logger: process.env.NODE_ENV === 'development' ? {
    logQuery: (query: string, params?: unknown[]) => {
      // Only log query without the params to avoid character-by-character JSON streaming
      logger.debug('[DB Query]', { query: query.substring(0, 200) + (query.length > 200 ? '...' : '') });
    }
  } : false 
});

// Export a function to check db connectivity
export async function checkDbConnection() {
  let client;
  let retries = 3;

  while (retries > 0) {
    try {
      client = await pool.connect();
      const result = await client.query('SELECT version()');
      logger.info('Database connection successful');
      logger.info('PostgreSQL version:', result.rows[0].version);
      return true;
    } catch (err) {
      logger.error(`Database connection attempt ${4 - retries} failed:`, err);
      retries--;
      if (retries === 0) {
        logger.error('All database connection attempts failed');
        return false;
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      if (client) {
        client.release(true); // Force release
      }
    }
  }
  return false;
}