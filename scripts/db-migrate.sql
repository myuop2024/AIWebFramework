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
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT,
  trn TEXT,
  bank_name TEXT,
  bank_account TEXT,
  id_type TEXT,
  id_number TEXT,
  profile_photo_url TEXT,
  id_photo_url TEXT
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
  country TEXT NOT NULL DEFAULT 'Jamaica',
  coordinates JSONB,
  constituency TEXT,
  division TEXT,
  station_code TEXT UNIQUE,
  station_type TEXT,
  capacity INTEGER,
  notes TEXT,
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