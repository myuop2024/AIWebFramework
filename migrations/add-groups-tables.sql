-- Migration: Add Groups and Group Memberships tables
-- Date: 2024-01-XX

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

-- Create group_memberships table
CREATE TABLE IF NOT EXISTS group_memberships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  added_by INTEGER REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS group_memberships_user_id_group_id_idx ON group_memberships(user_id, group_id);
CREATE INDEX IF NOT EXISTS group_memberships_group_id_idx ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS group_memberships_user_id_idx ON group_memberships(user_id);

-- Create unique constraint to prevent duplicate memberships
ALTER TABLE group_memberships 
ADD CONSTRAINT group_memberships_user_group_unique 
UNIQUE (user_id, group_id);

-- Add comments for documentation
COMMENT ON TABLE groups IS 'User groups for organizing users and managing permissions at group level';
COMMENT ON TABLE group_memberships IS 'Many-to-many relationship between users and groups';
COMMENT ON COLUMN groups.permissions IS 'Array of permission strings that apply to all members of this group';
COMMENT ON COLUMN group_memberships.added_by IS 'User ID of who added this member to the group';

-- Insert some default groups if they don't exist
INSERT INTO groups (name, description, permissions, created_by) 
VALUES 
  ('Administrators', 'System administrators with full access', '["admin:all", "users:manage", "roles:manage", "groups:manage", "reports:approve"]', NULL),
  ('Supervisors', 'Field supervisors with oversight responsibilities', '["reports:view", "reports:approve", "users:view", "assignments:manage"]', NULL),
  ('Field Observers', 'Standard field observers', '["reports:create", "reports:edit", "assignments:view"]', NULL)
ON CONFLICT (name) DO NOTHING; 