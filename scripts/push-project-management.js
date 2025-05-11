// Database migration script for Project Management System
// Created on May 11, 2025
// Run with: node scripts/push-project-management.js

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

const main = async () => {
  console.log('🚀 Starting the Project Management System schema migration...');
  
  // Database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  // Initialize Drizzle
  const db = drizzle(pool);
  
  try {
    // First, check if any tables already exist
    const queryResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'projects'
      );
    `);
    
    const projectsTableExists = queryResult.rows[0].exists;
    
    if (projectsTableExists) {
      console.log('⚠️ Projects table already exists, skipping SQL migration');
    } else {
      // Read and execute the SQL migration file
      console.log('📄 Executing SQL migration file...');
      const sql = fs.readFileSync('./scripts/project-management-migration.sql', 'utf8');
      await pool.query(sql);
      console.log('✅ SQL migration completed successfully');
    }
    
    console.log('🔄 Initializing Drizzle schema synchronization...');
    
    // Create a migrations folder if it doesn't exist
    if (!fs.existsSync('./migrations')) {
      fs.mkdirSync('./migrations');
    }
    
    // Run Drizzle migrations to ensure schema is in sync
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('✅ Schema synchronization completed successfully');
    console.log('🎉 Project Management System database schema is ready!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main().catch(console.error);