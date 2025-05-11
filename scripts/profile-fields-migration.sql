-- Migration script to add new profile fields to the database

-- Rename zipCode to postOfficeRegion
ALTER TABLE user_profiles 
  ADD COLUMN post_office_region VARCHAR;

-- Copy existing zipCode data to postOfficeRegion
UPDATE user_profiles 
SET post_office_region = zip_code 
WHERE zip_code IS NOT NULL;

-- Add bank branch location
ALTER TABLE user_profiles 
  ADD COLUMN bank_branch_location VARCHAR;

-- Add account type (Savings/Checking)
ALTER TABLE user_profiles 
  ADD COLUMN account_type VARCHAR DEFAULT 'Savings';

-- Add currency field
ALTER TABLE user_profiles 
  ADD COLUMN account_currency VARCHAR DEFAULT 'JMD';

-- Add encryption fields
ALTER TABLE user_profiles 
  ADD COLUMN encryption_iv VARCHAR,
  ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE;