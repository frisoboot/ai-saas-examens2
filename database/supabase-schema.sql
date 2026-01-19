-- ⚠️⚠️⚠️ WAARSCHUWING: DIT SCHEMA IS ONVEILIG ⚠️⚠️⚠️
-- Dit originele schema heeft OPEN RLS policies die iedereen toegang geven!
--
-- GEBRUIK NIET IN PRODUCTIE!
-- Gebruik in plaats daarvan: database/migration-secure-rls.sql
--
-- Voor meer info: database/SECURITY-FIX-README.md
-- ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️

-- Supabase Database Schema voor AI Examentrainer
-- Voer dit script uit in de SQL Editor van je Supabase project

-- Tabel voor vragen
CREATE TABLE IF NOT EXISTS questions (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel voor exam resultaten
CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel voor student profielen (EMAIL is primaire sleutel)
CREATE TABLE IF NOT EXISTS student_profiles (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),
  struggle_points TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index voor auth_user_id lookups
CREATE INDEX IF NOT EXISTS idx_student_profiles_auth_user ON student_profiles(auth_user_id);

-- Indexen voor betere performance
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_level ON questions(level);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_name);
CREATE INDEX IF NOT EXISTS idx_exam_results_subject ON exam_results(subject);
CREATE INDEX IF NOT EXISTS idx_exam_results_date ON exam_results(date);

-- Functie om updated_at automatisch bij te werken
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers voor updated_at
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Maak tabellen publiek toegankelijk voor anon gebruikers
-- Pas dit aan naar jouw security requirements
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Policies voor publieke toegang (pas aan naar jouw behoeften)
CREATE POLICY "Allow public read access to questions" ON questions
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to questions" ON questions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to questions" ON questions
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to questions" ON questions
    FOR DELETE USING (true);

CREATE POLICY "Allow public read access to exam_results" ON exam_results
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to exam_results" ON exam_results
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to student_profiles" ON student_profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to student_profiles" ON student_profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to student_profiles" ON student_profiles
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to student_profiles" ON student_profiles
    FOR DELETE USING (true);
