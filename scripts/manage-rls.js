#!/usr/bin/env node

/**
 * RLS Management Script for Election Observer Platform
 * This script provides utilities to manage Row-Level Security
 */

import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class RLSManager {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async checkRLSStatus() {
    console.log('🔍 Checking RLS status...\n');
    
    const query = `
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `;
    
    const result = await this.pool.query(query);
    
    console.log('Table Name'.padEnd(30) + 'RLS Enabled');
    console.log('-'.repeat(45));
    
    result.rows.forEach(row => {
      const status = row.rowsecurity ? '✅ Yes' : '❌ No';
      console.log(row.tablename.padEnd(30) + status);
    });
    
    console.log('\n');
  }

  async listPolicies() {
    console.log('📋 Listing RLS policies...\n');
    
    const query = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        cmd,
        roles
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    const result = await this.pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('No RLS policies found.');
      return;
    }
    
    let currentTable = '';
    result.rows.forEach(row => {
      if (row.tablename !== currentTable) {
        console.log(`\n📊 Table: ${row.tablename}`);
        console.log('-'.repeat(40));
        currentTable = row.tablename;
      }
      console.log(`  Policy: ${row.policyname}`);
      console.log(`  Command: ${row.cmd}`);
      console.log(`  Roles: ${row.roles ? row.roles.join(', ') : 'All'}`);
      console.log('');
    });
  }

  async testUserContext() {
    console.log('🧪 Testing user context functions...\n');
    
    try {
      // Test setting user context
      await this.pool.query("SELECT auth.set_user_context(2, 'admin')");
      console.log('✅ Set user context successfully');
      
      // Test getting user ID
      const userIdResult = await this.pool.query('SELECT auth.user_id()');
      console.log(`✅ Current user ID: ${userIdResult.rows[0].user_id}`);
      
      // Test getting user role
      const userRoleResult = await this.pool.query('SELECT auth.user_role()');
      console.log(`✅ Current user role: ${userRoleResult.rows[0].user_role}`);
      
      // Test admin check
      const isAdminResult = await this.pool.query('SELECT auth.is_admin()');
      console.log(`✅ Is admin: ${isAdminResult.rows[0].is_admin}`);
      
      // Clear context
      await this.pool.query("SELECT set_config('app.current_user_id', '', true)");
      await this.pool.query("SELECT set_config('app.current_user_role', '', true)");
      console.log('✅ Cleared user context');
      
    } catch (error) {
      console.error('❌ Error testing user context:', error.message);
    }
  }

  async enableRLSForTable(tableName) {
    console.log(`🔒 Enabling RLS for table: ${tableName}`);
    
    try {
      await this.pool.query(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
      console.log(`✅ RLS enabled for ${tableName}`);
    } catch (error) {
      console.error(`❌ Error enabling RLS for ${tableName}:`, error.message);
    }
  }

  async disableRLSForTable(tableName) {
    console.log(`🔓 Disabling RLS for table: ${tableName}`);
    
    try {
      await this.pool.query(`ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY`);
      console.log(`✅ RLS disabled for ${tableName}`);
    } catch (error) {
      console.error(`❌ Error disabling RLS for ${tableName}:`, error.message);
    }
  }

  async createBackupPolicies() {
    console.log('💾 Creating backup of current policies...');
    
    const query = `
      SELECT 
        'CREATE POLICY ' || policyname || ' ON ' || schemaname || '.' || tablename ||
        ' FOR ' || cmd ||
        CASE 
          WHEN roles IS NOT NULL THEN ' TO ' || array_to_string(roles, ', ')
          ELSE ''
        END ||
        CASE 
          WHEN qual IS NOT NULL THEN ' USING (' || qual || ')'
          ELSE ''
        END ||
        CASE 
          WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')'
          ELSE ''
        END || ';' as policy_sql
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    const result = await this.pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('No policies to backup.');
      return;
    }
    
    const backupContent = [
      '-- RLS Policies Backup',
      `-- Generated on: ${new Date().toISOString()}`,
      '',
      ...result.rows.map(row => row.policy_sql),
    ].join('\n');
    
    const fs = await import('fs');
    const backupPath = path.join(__dirname, `rls-backup-${Date.now()}.sql`);
    fs.writeFileSync(backupPath, backupContent);
    
    console.log(`✅ Policies backed up to: ${backupPath}`);
  }

  async close() {
    await this.pool.end();
  }
}

async function main() {
  const action = process.argv[2];
  const manager = new RLSManager();
  
  try {
    switch (action) {
      case 'status':
        await manager.checkRLSStatus();
        break;
        
      case 'policies':
        await manager.listPolicies();
        break;
        
      case 'test':
        await manager.testUserContext();
        break;
        
      case 'enable':
        const enableTable = process.argv[3];
        if (!enableTable) {
          console.error('Please provide a table name: npm run rls enable <table_name>');
          process.exit(1);
        }
        await manager.enableRLSForTable(enableTable);
        break;
        
      case 'disable':
        const disableTable = process.argv[3];
        if (!disableTable) {
          console.error('Please provide a table name: npm run rls disable <table_name>');
          process.exit(1);
        }
        await manager.disableRLSForTable(disableTable);
        break;
        
      case 'backup':
        await manager.createBackupPolicies();
        break;
        
      default:
        console.log(`
🔒 RLS Management Tool for Election Observer Platform

Usage: node scripts/manage-rls.js <command>

Commands:
  status     - Check RLS status for all tables
  policies   - List all RLS policies
  test       - Test user context functions
  enable     - Enable RLS for a specific table
  disable    - Disable RLS for a specific table
  backup     - Create backup of current policies

Examples:
  node scripts/manage-rls.js status
  node scripts/manage-rls.js enable users
  node scripts/manage-rls.js policies
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await manager.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { RLSManager };