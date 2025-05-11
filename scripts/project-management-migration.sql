-- Create project management system schema
-- Created on May 11, 2025

-- Create enum types
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('backlog', 'to_do', 'in_progress', 'in_review', 'done');

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  status project_status DEFAULT 'planning' NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  priority INTEGER DEFAULT 0,
  code TEXT
);

-- Project members
CREATE TABLE IF NOT EXISTS project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Task categories
CREATE TABLE IF NOT EXISTS task_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#808080',
  description TEXT,
  project_id INTEGER REFERENCES projects(id),
  is_global BOOLEAN DEFAULT FALSE
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  status TEXT DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  sort_order INTEGER DEFAULT 0
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'backlog' NOT NULL,
  priority task_priority DEFAULT 'medium' NOT NULL,
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

-- Add self-reference to parent_task_id after table creation
ALTER TABLE tasks
ADD CONSTRAINT tasks_parent_task_id_fkey
FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
ON DELETE SET NULL;

-- Task category assignments
CREATE TABLE IF NOT EXISTS task_category_assignments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  category_id INTEGER NOT NULL REFERENCES task_categories(id)
);

-- Task comments
CREATE TABLE IF NOT EXISTS task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_private BOOLEAN DEFAULT FALSE,
  mentioned_user_ids INTEGER[],
  attachments JSONB
);

-- Task attachments
CREATE TABLE IF NOT EXISTS task_attachments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  description TEXT,
  metadata JSONB
);

-- Task history
CREATE TABLE IF NOT EXISTS task_history (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  field TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_reporter_id ON tasks(reporter_id);
CREATE INDEX idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_task_categories_project_id ON task_categories(project_id);
CREATE INDEX idx_task_category_assignments_task_id ON task_category_assignments(task_id);
CREATE INDEX idx_task_category_assignments_category_id ON task_category_assignments(category_id);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX idx_task_attachments_user_id ON task_attachments(user_id);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_task_history_task_id ON task_history(task_id);
CREATE INDEX idx_task_history_user_id ON task_history(user_id);

-- Create some default task categories
INSERT INTO task_categories (name, color, is_global)
VALUES 
('Bug', '#F87171', TRUE),
('Feature', '#60A5FA', TRUE),
('Documentation', '#34D399', TRUE),
('Infrastructure', '#A78BFA', TRUE),
('Security', '#F97316', TRUE);