import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function migrateTables() {
  try {
    // Create all tables if they don't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        observer_id TEXT NOT NULL UNIQUE,
        phone_number TEXT,
        role TEXT NOT NULL DEFAULT 'observer',
        verification_status TEXT NOT NULL DEFAULT 'pending',
        device_id TEXT,
        training_status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        two_factor_secret TEXT,
        two_factor_enabled BOOLEAN DEFAULT false,
        two_factor_verified BOOLEAN DEFAULT false,
        recovery_codes JSONB
      );

      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        address TEXT,
        city TEXT,
        state TEXT,
        post_office_region TEXT,
        country TEXT,
        trn TEXT,
        bank_name TEXT,
        bank_branch_location TEXT,
        bank_account TEXT,
        account_type TEXT,
        account_currency TEXT DEFAULT 'JMD',
        id_type TEXT,
        id_number TEXT,
        profile_photo_url TEXT,
        id_photo_url TEXT,
        verification_status TEXT,
        verification_id TEXT,
        verified_at TIMESTAMP,
        encryption_iv TEXT,
        is_encrypted BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        document_type TEXT NOT NULL,
        document_url TEXT NOT NULL,
        ocr_text TEXT,
        verification_status TEXT NOT NULL DEFAULT 'pending',
        uploaded_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS polling_stations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip_code TEXT,
        post_office_region TEXT,
        country TEXT NOT NULL DEFAULT 'Jamaica',
        coordinates TEXT,
        constituency TEXT,
        division TEXT,
        station_code TEXT UNIQUE,
        station_type TEXT,
        capacity INTEGER DEFAULT 5,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        notes TEXT,
        status TEXT DEFAULT 'active' NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        station_id INTEGER NOT NULL REFERENCES polling_stations(id),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        check_in_time TIMESTAMP,
        check_out_time TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER REFERENCES users(id),
        priority TEXT
      );

      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        station_id INTEGER NOT NULL REFERENCES polling_stations(id),
        assignment_id INTEGER REFERENCES assignments(id),
        report_type TEXT NOT NULL,
        content JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'submitted',
        content_hash TEXT NOT NULL,
        location JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        updated_by INTEGER REFERENCES users(id),
        review_notes TEXT
      );

      CREATE TABLE IF NOT EXISTS report_attachments (
        id SERIAL PRIMARY KEY,
        report_id INTEGER NOT NULL REFERENCES reports(id),
        attachment_url TEXT NOT NULL,
        attachment_type TEXT NOT NULL,
        content_hash TEXT,
        ocr_text TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS registration_forms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        fields JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER REFERENCES users(id),
        version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS user_import_logs (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        imported_by INTEGER REFERENCES users(id),
        total_records INTEGER NOT NULL,
        success_count INTEGER NOT NULL,
        failure_count INTEGER NOT NULL,
        imported_at TIMESTAMP DEFAULT NOW(),
        status TEXT NOT NULL,
        errors JSONB,
        options JSONB,
        source_type TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS training_integrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        systems JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS training_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        training_id INTEGER NOT NULL REFERENCES training_integrations(id),
        course_id TEXT,
        course_name TEXT,
        status TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        score DOUBLE PRECISION,
        completion_date TIMESTAMP,
        certificate_url TEXT,
        external_data JSONB,
        last_updated TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS external_user_mappings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        external_system TEXT NOT NULL,
        external_id TEXT NOT NULL,
        username TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        last_synced TIMESTAMP DEFAULT NOW(),
        UNIQUE(external_system, external_id)
      );

      CREATE TABLE IF NOT EXISTS form_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        template_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER REFERENCES users(id),
        version INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS id_card_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        template_data JSONB NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT false,
        security_features JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value JSONB NOT NULL,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        updated_by INTEGER REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS photo_approvals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        photo_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP,
        notes TEXT
      );

      -- Add missing columns to existing tables if they don't exist
      ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
        ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS two_factor_verified BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS recovery_codes JSONB;

      ALTER TABLE IF EXISTS user_profiles
        ADD COLUMN IF NOT EXISTS post_office_region TEXT,
        ADD COLUMN IF NOT EXISTS bank_branch_location TEXT,
        ADD COLUMN IF NOT EXISTS account_type TEXT,
        ADD COLUMN IF NOT EXISTS account_currency TEXT DEFAULT 'JMD',
        ADD COLUMN IF NOT EXISTS verification_status TEXT,
        ADD COLUMN IF NOT EXISTS verification_id TEXT,
        ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS encryption_iv TEXT,
        ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

      ALTER TABLE IF EXISTS polling_stations
        ADD COLUMN IF NOT EXISTS post_office_region TEXT,
        ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    `);

    console.log('All tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error migrating tables:', error);
    process.exit(1);
  }
}

migrateTables();