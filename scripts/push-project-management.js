import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Initialize dotenv
dotenv.config();

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * This script migrates the project management tables to the database.
 * It creates the necessary tables and constraints for the project management system.
 */
async function migrateTables() {
  console.log('Starting project management tables migration');

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  try {
    // Find the migrations folder - go up one level from __dirname (scripts) to project root
    const projectRoot = path.join(__dirname, '..');
    const migrationsFolder = path.join(projectRoot, 'migrations');

    // Create the folder if it doesn't exist
    if (!fs.existsSync(migrationsFolder)) {
      fs.mkdirSync(migrationsFolder, { recursive: true });
      console.log(`Created migrations folder at ${migrationsFolder}`);
    }

    // Copy the SQL contents to create the project management tables
    fs.writeFileSync(
      path.join(migrationsFolder, 'project-management.sql'),
      getProjectManagementSQL(),
      'utf8'
    );

    console.log('Running migration for project management tables');
    
    // Use migrate to automatically generate and apply migrations
    await migrate(db, { migrationsFolder });
    
    console.log('Project management tables migrated successfully');
  } catch (error) {
    console.error('Error migrating project management tables:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

function getProjectManagementSQL() {
  return `
-- Create project management enums if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('backlog', 'to_do', 'in_progress', 'in_review', 'done');
    END IF;
END $$;

-- Create project management tables if they don't exist
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status project_status NOT NULL DEFAULT 'planning',
    owner_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    priority INTEGER DEFAULT 0,
    code TEXT
);

CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS task_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#808080',
    description TEXT,
    project_id INTEGER REFERENCES projects(id),
    is_global BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'backlog',
    priority task_priority NOT NULL DEFAULT 'medium',
    project_id INTEGER NOT NULL REFERENCES projects(id),
    assignee_id INTEGER REFERENCES users(id),
    reporter_id INTEGER NOT NULL REFERENCES users(id),
    milestone_id INTEGER REFERENCES milestones(id),
    parent_task_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    start_date TIMESTAMP,
    due_date TIMESTAMP,
    estimated_hours REAL,
    actual_hours REAL,
    completed_at TIMESTAMP,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB,
    station_id INTEGER REFERENCES polling_stations(id)
);

-- Add self-reference for parent tasks
ALTER TABLE tasks 
ADD CONSTRAINT IF NOT EXISTS tasks_parent_task_id_fkey 
FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS task_category_assignments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES task_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_private BOOLEAN DEFAULT FALSE,
    mentioned_user_ids INTEGER[]
);

CREATE TABLE IF NOT EXISTS task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    description TEXT,
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS task_history (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    field TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for improved performance
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
  `;
}

// Run the migration
migrateTables().catch(err => {
  console.error("Unhandled error in migration:", err);
  process.exit(1);
});