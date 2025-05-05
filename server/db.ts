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

// Create connection pool with proper error handling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000 // 5 second timeout
});

// Test the database connection
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(1);
});

// Initialize Drizzle ORM with the schema
export const db = drizzle(pool, { schema });