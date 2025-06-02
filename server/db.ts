import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

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
  console.error('Unexpected error on database client', err);
  // Log only standard error properties to avoid TypeScript errors
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  // Don't crash the server, just log the error
  // process.exit(1);
});

// Monitor pool events
pool.on('connect', () => {
  console.log('New client connected to database');
});

pool.on('remove', () => {
  console.log('Client removed from pool');
});

// Initialize Drizzle ORM with the schema
export const db = drizzle(pool, { 
  schema,
  logger: process.env.NODE_ENV === 'development' ? console : false 
});

// Export a function to check db connectivity
export async function checkDbConnection() {
  let client;
  let retries = 3;

  while (retries > 0) {
    try {
      client = await pool.connect();
      const result = await client.query('SELECT version()');
      console.log('Database connection successful');
      console.log('PostgreSQL version:', result.rows[0].version);
      return true;
    } catch (err) {
      console.error(`Database connection attempt ${4 - retries} failed:`, err);
      retries--;
      if (retries === 0) {
        console.error('All database connection attempts failed');
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