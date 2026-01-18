-- ============================================================================
-- COMPLETE SUPABASE RESET SCRIPT
-- ============================================================================
-- WAARSCHUWING: Dit verwijdert ALLE data! Alleen gebruiken voor fresh start.
-- Voer dit uit in Supabase SQL Editor
-- ============================================================================

-- Drop alle bestaande policies eerst
DROP POLICY IF EXISTS "Allow public read access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public insert access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public update access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public delete access to student_profiles" ON student_profiles;

DROP POLICY IF EXISTS "Allow public read access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public insert access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public update access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public delete access to questions" ON questions;

DROP POLICY IF EXISTS "Allow public read access to exam_results" ON exam_results;
DROP POLICY IF EXISTS "Allow public insert access to exam_results" ON exam_results;

DROP POLICY IF EXISTS "Allow public read access to student_progress" ON student_progress;
DROP POLICY IF EXISTS "Allow public insert access to student_progress" ON student_progress;
DROP POLICY IF EXISTS "Allow public update access to student_progress" ON student_progress;

DROP POLICY IF EXISTS "Allow admin login queries" ON admin_users;
DROP POLICY IF EXISTS "Allow public access to import_history" ON import_history;

-- Drop alle tabellen
DROP TABLE IF EXISTS import_history CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS student_progress CASCADE;
DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS student_profiles CASCADE;
DROP TABLE IF EXISTS questions CASCADE;

-- Drop triggers en functies
DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
DROP TRIGGER IF EXISTS update_student_progress_updated_at ON student_progress;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================================
-- NIEUWE TABELLEN AANMAKEN
-- ============================================================================

-- Functie voor auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Questions tabel
CREATE TABLE questions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('MULTIPLE_CHOICE', 'OPEN')),
    subject TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),
    text TEXT NOT NULL,
    context_text TEXT,
    image_url TEXT,
    source TEXT,
    options JSONB,
    correct_index INTEGER,
    model_answer TEXT,
    exam_year INTEGER,
    exam_type TEXT DEFAULT 'practice',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student Profiles - NU MET EMAIL ALS PRIMARY KEY
CREATE TABLE student_profiles (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),
    struggle_points TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exam Results
CREATE TABLE exam_results (
    id TEXT PRIMARY KEY,
    student_email TEXT NOT NULL REFERENCES student_profiles(email) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    level TEXT,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    answers JSONB NOT NULL,
    exam_year INTEGER,
    exam_type TEXT,
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student Progress
CREATE TABLE student_progress (
    id TEXT PRIMARY KEY,
    student_email TEXT NOT NULL REFERENCES student_profiles(email) ON DELETE CASCADE,
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
    UNIQUE(student_email, subject)
);

-- Import History
CREATE TABLE import_history (
    id TEXT PRIMARY KEY,
    admin_username TEXT NOT NULL,
    import_type TEXT NOT NULL,
    file_name TEXT,
    questions_imported INTEGER DEFAULT 0,
    questions_failed INTEGER DEFAULT 0,
    error_log JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_questions_subject ON questions(subject);
CREATE INDEX idx_questions_level ON questions(level);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_year_subject ON questions(exam_year, subject, level);

CREATE INDEX idx_student_profiles_name ON student_profiles(name);
CREATE INDEX idx_student_profiles_level ON student_profiles(level);

CREATE INDEX idx_exam_results_student ON exam_results(student_email);
CREATE INDEX idx_exam_results_subject ON exam_results(subject);
CREATE INDEX idx_exam_results_date ON exam_results(date);

CREATE INDEX idx_progress_student ON student_progress(student_email);
CREATE INDEX idx_progress_subject ON student_progress(subject);

CREATE INDEX idx_import_history_date ON import_history(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_progress_updated_at
    BEFORE UPDATE ON student_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Questions policies
CREATE POLICY "Allow public read access to questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to questions" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to questions" ON questions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to questions" ON questions FOR DELETE USING (true);

-- Student Profiles policies (ALLE OPERATIES)
CREATE POLICY "Allow public read access to student_profiles" ON student_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to student_profiles" ON student_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to student_profiles" ON student_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to student_profiles" ON student_profiles FOR DELETE USING (true);

-- Exam Results policies
CREATE POLICY "Allow public read access to exam_results" ON exam_results FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to exam_results" ON exam_results FOR INSERT WITH CHECK (true);

-- Student Progress policies
CREATE POLICY "Allow public read access to student_progress" ON student_progress FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to student_progress" ON student_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to student_progress" ON student_progress FOR UPDATE USING (true);

-- Import History policies
CREATE POLICY "Allow public access to import_history" ON import_history FOR ALL USING (true);

-- ============================================================================
-- VERIFICATIE
-- ============================================================================

SELECT 'Tabellen aangemaakt:' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('questions', 'student_profiles', 'exam_results', 'student_progress', 'import_history');

SELECT 'RLS Policies:' as status;
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, cmd;
