-- Enable Row-Level Security (RLS) for Election Observer Platform
-- This script enables RLS and creates security policies for all tables

-- First, create a function to get the current user's role and ID
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS INTEGER AS $$
BEGIN
    -- This will be implemented based on your authentication system
    -- For now, we'll use a session variable or JWT claim
    RETURN COALESCE(
        NULLIF(current_setting('app.current_user_id', true), '')::INTEGER,
        0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
BEGIN
    -- Get user role from session or database
    RETURN COALESCE(
        NULLIF(current_setting('app.current_user_role', true), ''),
        'observer'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.user_role() IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_supervisor() RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.user_role() IN ('admin', 'super_admin', 'supervisor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_user_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Enable RLS on project management tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES
-- Users can view their own record, admins can view all
CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (
        id = auth.user_id() OR 
        auth.is_admin()
    );

-- Users can update their own record, admins can update all
CREATE POLICY users_update_policy ON users
    FOR UPDATE
    USING (
        id = auth.user_id() OR 
        auth.is_admin()
    );

-- Only admins can insert new users
CREATE POLICY users_insert_policy ON users
    FOR INSERT
    WITH CHECK (auth.is_admin());

-- Only admins can delete users
CREATE POLICY users_delete_policy ON users
    FOR DELETE
    USING (auth.is_admin());

-- USER PROFILES TABLE POLICIES
-- Users can view their own profile, admins and supervisors can view all
CREATE POLICY user_profiles_select_policy ON user_profiles
    FOR SELECT
    USING (
        user_id = auth.user_id() OR 
        auth.is_supervisor()
    );

-- Users can update their own profile, admins can update all
CREATE POLICY user_profiles_update_policy ON user_profiles
    FOR UPDATE
    USING (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

-- Users can insert their own profile, admins can insert for anyone
CREATE POLICY user_profiles_insert_policy ON user_profiles
    FOR INSERT
    WITH CHECK (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

-- DOCUMENTS TABLE POLICIES
-- Users can view their own documents, admins and supervisors can view all
CREATE POLICY documents_select_policy ON documents
    FOR SELECT
    USING (
        user_id = auth.user_id() OR 
        auth.is_supervisor()
    );

-- Users can insert their own documents, admins can insert for anyone
CREATE POLICY documents_insert_policy ON documents
    FOR INSERT
    WITH CHECK (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

-- Users can update their own documents, admins can update all
CREATE POLICY documents_update_policy ON documents
    FOR UPDATE
    USING (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

-- ASSIGNMENTS TABLE POLICIES
-- Users can view their own assignments, admins and supervisors can view all
CREATE POLICY assignments_select_policy ON assignments
    FOR SELECT
    USING (
        user_id = auth.user_id() OR 
        auth.is_supervisor()
    );

-- Only admins can manage assignments
CREATE POLICY assignments_insert_policy ON assignments
    FOR INSERT
    WITH CHECK (auth.is_admin());

CREATE POLICY assignments_update_policy ON assignments
    FOR UPDATE
    USING (auth.is_admin());

CREATE POLICY assignments_delete_policy ON assignments
    FOR DELETE
    USING (auth.is_admin());

-- REPORTS TABLE POLICIES
-- Users can view their own reports, admins and supervisors can view all
CREATE POLICY reports_select_policy ON reports
    FOR SELECT
    USING (
        user_id = auth.user_id() OR 
        auth.is_supervisor()
    );

-- Users can insert their own reports
CREATE POLICY reports_insert_policy ON reports
    FOR INSERT
    WITH CHECK (user_id = auth.user_id());

-- Users can update their own unreviewed reports, admins can update all
CREATE POLICY reports_update_policy ON reports
    FOR UPDATE
    USING (
        (user_id = auth.user_id() AND reviewed_at IS NULL) OR 
        auth.is_admin()
    );

-- REPORT ATTACHMENTS TABLE POLICIES
-- Users can view attachments for their own reports, admins and supervisors can view all
CREATE POLICY report_attachments_select_policy ON report_attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM reports r 
            WHERE r.id = report_id AND (
                r.user_id = auth.user_id() OR 
                auth.is_supervisor()
            )
        )
    );

-- Users can insert attachments for their own reports
CREATE POLICY report_attachments_insert_policy ON report_attachments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM reports r 
            WHERE r.id = report_id AND r.user_id = auth.user_id()
        )
    );

-- MESSAGES TABLE POLICIES
-- Users can view messages they sent or received, admins can view all
CREATE POLICY messages_select_policy ON messages
    FOR SELECT
    USING (
        sender_id = auth.user_id() OR 
        receiver_id = auth.user_id() OR 
        auth.is_admin()
    );

-- Users can send messages
CREATE POLICY messages_insert_policy ON messages
    FOR INSERT
    WITH CHECK (sender_id = auth.user_id());

-- Users can update messages they sent, admins can update all
CREATE POLICY messages_update_policy ON messages
    FOR UPDATE
    USING (
        sender_id = auth.user_id() OR 
        auth.is_admin()
    );

-- PHOTO APPROVALS TABLE POLICIES
-- Users can view their own photo approvals, admins can view all
CREATE POLICY photo_approvals_select_policy ON photo_approvals
    FOR SELECT
    USING (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

-- Users can submit their own photo approvals
CREATE POLICY photo_approvals_insert_policy ON photo_approvals
    FOR INSERT
    WITH CHECK (user_id = auth.user_id());

-- Only admins can approve/reject photos
CREATE POLICY photo_approvals_update_policy ON photo_approvals
    FOR UPDATE
    USING (auth.is_admin());

-- GAMIFICATION POLICIES
-- Users can view their own points, admins can view all
CREATE POLICY user_points_select_policy ON user_points
    FOR SELECT
    USING (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

-- Only system can insert points (through application logic)
CREATE POLICY user_points_insert_policy ON user_points
    FOR INSERT
    WITH CHECK (auth.is_admin());

-- Similar policies for other gamification tables
CREATE POLICY user_achievements_select_policy ON user_achievements
    FOR SELECT
    USING (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

CREATE POLICY user_achievements_insert_policy ON user_achievements
    FOR INSERT
    WITH CHECK (auth.is_admin());

CREATE POLICY user_game_profile_select_policy ON user_game_profile
    FOR SELECT
    USING (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

CREATE POLICY user_game_profile_insert_policy ON user_game_profile
    FOR INSERT
    WITH CHECK (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

CREATE POLICY user_game_profile_update_policy ON user_game_profile
    FOR UPDATE
    USING (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

CREATE POLICY achievement_progress_select_policy ON achievement_progress
    FOR SELECT
    USING (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

CREATE POLICY achievement_progress_insert_policy ON achievement_progress
    FOR INSERT
    WITH CHECK (auth.is_admin());

CREATE POLICY achievement_progress_update_policy ON achievement_progress
    FOR UPDATE
    USING (auth.is_admin());

-- PROJECT MANAGEMENT POLICIES
-- Users can view projects they're members of, admins can view all
CREATE POLICY projects_select_policy ON projects
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = id AND pm.user_id = auth.user_id()
        ) OR 
        auth.is_admin()
    );

-- Only admins can create projects
CREATE POLICY projects_insert_policy ON projects
    FOR INSERT
    WITH CHECK (auth.is_admin());

-- Project members with admin role or system admins can update projects
CREATE POLICY projects_update_policy ON projects
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = id AND pm.user_id = auth.user_id() 
            AND pm.role IN ('admin', 'manager')
        ) OR 
        auth.is_admin()
    );

-- PROJECT MEMBERS POLICIES
-- Users can view members of projects they're part of
CREATE POLICY project_members_select_policy ON project_members
    FOR SELECT
    USING (
        user_id = auth.user_id() OR
        EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = project_id AND pm.user_id = auth.user_id()
        ) OR 
        auth.is_admin()
    );

-- Only project admins or system admins can manage project members
CREATE POLICY project_members_insert_policy ON project_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = project_id AND pm.user_id = auth.user_id() 
            AND pm.role IN ('admin', 'manager')
        ) OR 
        auth.is_admin()
    );

-- TASKS POLICIES
-- Users can view tasks in projects they're members of
CREATE POLICY tasks_select_policy ON tasks
    FOR SELECT
    USING (
        assigned_to = auth.user_id() OR
        created_by = auth.user_id() OR
        EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = project_id AND pm.user_id = auth.user_id()
        ) OR 
        auth.is_admin()
    );

-- Project members can create tasks
CREATE POLICY tasks_insert_policy ON tasks
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = project_id AND pm.user_id = auth.user_id()
        ) OR 
        auth.is_admin()
    );

-- Task assignees, creators, or project managers can update tasks
CREATE POLICY tasks_update_policy ON tasks
    FOR UPDATE
    USING (
        assigned_to = auth.user_id() OR
        created_by = auth.user_id() OR
        EXISTS (
            SELECT 1 FROM project_members pm 
            WHERE pm.project_id = project_id AND pm.user_id = auth.user_id() 
            AND pm.role IN ('admin', 'manager')
        ) OR 
        auth.is_admin()
    );

-- TRAINING AND EVENT PARTICIPATION POLICIES
-- Users can view their own participation records
CREATE POLICY event_participation_select_policy ON event_participation
    FOR SELECT
    USING (
        user_id = auth.user_id() OR 
        auth.is_supervisor()
    );

CREATE POLICY event_participation_insert_policy ON event_participation
    FOR INSERT
    WITH CHECK (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

CREATE POLICY training_progress_select_policy ON training_progress
    FOR SELECT
    USING (
        user_id = auth.user_id() OR 
        auth.is_supervisor()
    );

CREATE POLICY training_progress_insert_policy ON training_progress
    FOR INSERT
    WITH CHECK (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

CREATE POLICY training_progress_update_policy ON training_progress
    FOR UPDATE
    USING (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

-- EXTERNAL USER MAPPINGS POLICIES
-- Users can view their own mappings, admins can view all
CREATE POLICY external_user_mappings_select_policy ON external_user_mappings
    FOR SELECT
    USING (
        user_id = auth.user_id() OR 
        auth.is_admin()
    );

CREATE POLICY external_user_mappings_insert_policy ON external_user_mappings
    FOR INSERT
    WITH CHECK (auth.is_admin());

CREATE POLICY external_user_mappings_update_policy ON external_user_mappings
    FOR UPDATE
    USING (auth.is_admin());

-- LEADERBOARD ENTRIES POLICIES
-- All users can view leaderboard entries (public information)
CREATE POLICY leaderboard_entries_select_policy ON leaderboard_entries
    FOR SELECT
    USING (true);

-- Only admins can manage leaderboard entries
CREATE POLICY leaderboard_entries_insert_policy ON leaderboard_entries
    FOR INSERT
    WITH CHECK (auth.is_admin());

CREATE POLICY leaderboard_entries_update_policy ON leaderboard_entries
    FOR UPDATE
    USING (auth.is_admin());

-- PUBLIC TABLES (No RLS needed, but can be restricted by role)
-- polling_stations, events, faq_entries, news_entries, form_templates, etc.
-- These are generally readable by all authenticated users

-- Create a helper function to set user context for RLS
CREATE OR REPLACE FUNCTION auth.set_user_context(user_id INTEGER, user_role TEXT) RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', user_id::TEXT, true);
    PERFORM set_config('app.current_user_role', user_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage to authenticated users
-- Note: You'll need to adjust these grants based on your specific role structure
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_supervisor() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.set_user_context(INTEGER, TEXT) TO authenticated;

-- Create indexes for better RLS performance
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_user ON project_members(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_assigned ON tasks(project_id, assigned_to);

-- Add comments for documentation
COMMENT ON FUNCTION auth.user_id() IS 'Returns the current authenticated user ID from session';
COMMENT ON FUNCTION auth.user_role() IS 'Returns the current authenticated user role from session';
COMMENT ON FUNCTION auth.is_admin() IS 'Returns true if current user has admin privileges';
COMMENT ON FUNCTION auth.is_supervisor() IS 'Returns true if current user has supervisor or admin privileges';
COMMENT ON FUNCTION auth.set_user_context(INTEGER, TEXT) IS 'Sets the user context for RLS policies';