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
});

// Handle connection errors
pool.on('error', (err) => {
  console.error('Unexpected error on database client', err);
  // Don't crash the server, just log the error
  // process.exit(1);
});

// Initialize Drizzle ORM with the schema
export const db = drizzle(pool, { schema });

// Export a function to check db connectivity
export async function checkDbConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    console.log('Database connection successful');
    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    return false;
  } finally {
    if (client) client.release();
  }
}