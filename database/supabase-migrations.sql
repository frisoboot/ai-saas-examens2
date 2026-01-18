-- Supabase Database Migraties voor AI Examentrainer Upgrade
-- Voer dit script uit in de SQL Editor van je Supabase project
-- Dit script bevat alle 6 migraties voor de nieuwe functionaliteit

-- ============================================================================
-- MIGRATION 1: Add year fields to questions table
-- ============================================================================
ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam_year INTEGER;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'practice';

-- Create composite index for efficient year-based queries
CREATE INDEX IF NOT EXISTS idx_questions_year_subject ON questions(exam_year, subject, level);
CREATE INDEX IF NOT EXISTS idx_questions_exam_type ON questions(exam_type);

-- Update existing questions to have 'practice' type
UPDATE questions SET exam_type = 'practice' WHERE exam_type IS NULL;

-- ============================================================================
-- MIGRATION 2: Create student_progress table
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_progress (
  id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  total_exams_taken INTEGER DEFAULT 0,
  total_questions_answered INTEGER DEFAULT 0,
  total_correct_answers INTEGER DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0.0,
  last_exam_date TIMESTAMP WITH TIME ZONE,
  weakest_topics JSONB,
  improvement_rate DECIMAL(5,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Composite unique constraint per student per subject
  UNIQUE(student_name, subject)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_progress_student ON student_progress(student_name);
CREATE INDEX IF NOT EXISTS idx_progress_subject ON student_progress(subject);
CREATE INDEX IF NOT EXISTS idx_progress_last_exam ON student_progress(last_exam_date DESC);

-- Trigger for auto-updating timestamp
CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON student_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION 3: Create admin_users table
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Insert default admin (password: admin123)
-- Hash generated with: bcrypt.hash('admin123', 10)
INSERT INTO admin_users (id, username, password_hash, email)
VALUES (
  'admin-001',
  'admin',
  '$2b$10$N9qo8uLOickgx2ZMRZoMwOFzZaGLqEdc8Xp0hT5xKqvBnqvC6aOWG',
  'admin@examentrainer.nl'
) ON CONFLICT (username) DO NOTHING;

-- Index for login queries
CREATE INDEX IF NOT EXISTS idx_admin_username ON admin_users(username);

-- ============================================================================
-- MIGRATION 4: Update student_profiles table
-- ============================================================================
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS created_by_admin TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE student_profiles ALTER COLUMN auth_user_id SET NOT NULL;

-- Note: Password migration will happen in application code
-- After migration is complete and verified, run: ALTER TABLE student_profiles DROP COLUMN password;

-- ============================================================================
-- MIGRATION 5: Update exam_results table
-- ============================================================================
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS exam_year INTEGER;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS exam_type TEXT;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS level TEXT;

-- Create indexes for year-based result queries
CREATE INDEX IF NOT EXISTS idx_results_year ON exam_results(exam_year, student_name);
CREATE INDEX IF NOT EXISTS idx_results_exam_type ON exam_results(exam_type);

-- ============================================================================
-- MIGRATION 6: Create import_history table
-- ============================================================================
CREATE TABLE IF NOT EXISTS import_history (
  id TEXT PRIMARY KEY,
  admin_username TEXT NOT NULL,
  import_type TEXT NOT NULL,
  file_name TEXT,
  questions_imported INTEGER DEFAULT 0,
  questions_failed INTEGER DEFAULT 0,
  error_log JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_history_admin ON import_history(admin_username);
CREATE INDEX IF NOT EXISTS idx_import_history_date ON import_history(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Policies for student_progress (allow public access for now - adjust as needed)
CREATE POLICY "Allow public read access to student_progress" ON student_progress
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to student_progress" ON student_progress
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to student_progress" ON student_progress
    FOR UPDATE USING (true);

-- Policies for admin_users (allow login queries)
CREATE POLICY "Allow admin login queries" ON admin_users
    FOR SELECT USING (true);

-- Policies for import_history
CREATE POLICY "Allow public access to import_history" ON import_history
    FOR ALL USING (true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify success:

-- Check if new columns exist on questions
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'questions' AND column_name IN ('exam_year', 'exam_type');

-- Check if new tables exist
-- SELECT tablename FROM pg_tables WHERE tablename IN ('student_progress', 'admin_users', 'import_history');

-- Check if admin user exists
-- SELECT username FROM admin_users WHERE username = 'admin';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
