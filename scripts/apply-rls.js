#!/usr/bin/env node

/**
 * Script to apply Row-Level Security (RLS) policies to the database
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applyRLS() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔒 Applying Row-Level Security policies...');

    // Read the RLS SQL file
    const rlsSQL = fs.readFileSync(path.join(__dirname, 'enable-rls.sql'), 'utf8');

    // Create auth schema if it doesn't exist
    await pool.query('CREATE SCHEMA IF NOT EXISTS auth;');

    // Execute the RLS setup
    await pool.query(rlsSQL);

    console.log('✅ Row-Level Security policies applied successfully!');

    // Create a special user role for application connections if it doesn't exist
    try {
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
            CREATE ROLE authenticated;
          END IF;
        END
        $$;
      `);
      console.log('✅ Created authenticated role');
    } catch (error) {
      console.log('ℹ️  Authenticated role already exists or could not be created');
    }

    // Grant necessary permissions
    await pool.query(`
      GRANT USAGE ON SCHEMA public TO authenticated;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    `);

    console.log('✅ Granted permissions to authenticated role');

  } catch (error) {
    console.error('❌ Error applying RLS policies:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applyRLS().catch((error) => {
    console.error('Failed to apply RLS:', error);
    process.exit(1);
  });
}

export { applyRLS };