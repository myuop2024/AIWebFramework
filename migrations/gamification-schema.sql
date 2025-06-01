-- Create user_points table
CREATE TABLE IF NOT EXISTS user_points (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL, -- Assuming users.id is INTEGER
    points_earned INTEGER NOT NULL,
    action_type VARCHAR(255) NOT NULL,
    action_details_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon_url VARCHAR(255),
    criteria JSONB
);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    badge_id INTEGER NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    UNIQUE (user_id, badge_id)
);

-- Create leaderboard_weekly table (consider if this should be a materialized view or managed by application logic)
CREATE TABLE IF NOT EXISTS leaderboard_weekly (
    user_id INTEGER NOT NULL PRIMARY KEY,
    total_points_this_week INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    week_start_date DATE NOT NULL, -- To identify the week
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create leaderboard_overall table (consider if this should be a materialized view or managed by application logic)
CREATE TABLE IF NOT EXISTS leaderboard_overall (
    user_id INTEGER NOT NULL PRIMARY KEY,
    total_points_all_time INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_weekly_points ON leaderboard_weekly(total_points_this_week DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_overall_points ON leaderboard_overall(total_points_all_time DESC);

-- Modify users table
-- Ensure the users table and its id column exist before attempting to alter it or add foreign keys.
-- This script assumes 'users' table with an 'id' primary key of type INTEGER.
-- If 'users.id' is a different type (e.g., UUID), change FOREIGN KEY definitions above accordingly.

-- Check if the total_gamification_points column exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='total_gamification_points') THEN
        ALTER TABLE users ADD COLUMN total_gamification_points INTEGER DEFAULT 0;
    END IF;
END $$;

-- Check if the last_login_for_gamification column exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_for_gamification') THEN
        ALTER TABLE users ADD COLUMN last_login_for_gamification DATE;
    END IF;
END $$;

-- Insert initial badge data (examples)
-- This assumes the badges table is empty or these specific badges don't exist.
INSERT INTO badges (name, description, icon_url, criteria) VALUES
('Training Novice', 'Completed your first training module.', '/assets/badges/training_novice.png', '{"modules_completed": 1}'),
('Training Intermediate', 'Completed 5 training modules.', '/assets/badges/training_intermediate.png', '{"modules_completed": 5}'),
('Training Expert', 'Mastered all training modules.', '/assets/badges/training_expert.png', '{"modules_completed": "all"}'),
('Reporting Star - Bronze', 'Submitted 10 verified reports.', '/assets/badges/reporter_bronze.png', '{"reports_verified": 10}'),
('Reporting Star - Silver', 'Submitted 50 verified reports.', '/assets/badges/reporter_silver.png', '{"reports_verified": 50}'),
('Reporting Star - Gold', 'Submitted 100 verified reports.', '/assets/badges/reporter_gold.png', '{"reports_verified": 100}'),
('Perfect Attendance', 'Logged in 7 days in a row.', '/assets/badges/perfect_attendance.png', '{"consecutive_logins": 7}'),
('Profile Pro', 'Completed your user profile.', '/assets/badges/profile_pro.png', '{"profile_complete": true}'),
('Streak Starter', 'Maintained a 3-day activity streak.', '/assets/badges/streak_starter.png', '{"consecutive_activity_days": 3}'),
('Streak Keeper', 'Maintained a 7-day activity streak.', '/assets/badges/streak_keeper.png', '{"consecutive_activity_days": 7}'),
('Streak Master', 'Maintained a 14-day activity streak.', '/assets/badges/streak_master.png', '{"consecutive_activity_days": 14}')
ON CONFLICT (name) DO NOTHING; -- Avoid errors if badges are already seeded
