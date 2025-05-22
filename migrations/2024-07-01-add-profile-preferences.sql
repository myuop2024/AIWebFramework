-- Add notifications, language, and region fields to user_profiles
ALTER TABLE user_profiles ADD COLUMN notifications JSONB;
ALTER TABLE user_profiles ADD COLUMN language TEXT;
ALTER TABLE user_profiles ADD COLUMN region TEXT; 