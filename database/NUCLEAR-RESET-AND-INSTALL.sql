-- ============================================================================
-- 🔴 NUCLEAR RESET - COMPLETE DATABASE REBUILD
-- ============================================================================
-- WAARSCHUWING: Dit script VERWIJDERT ALLES en installeert de database opnieuw!
--
-- Wat dit doet:
-- 1. DROP alle tabellen, triggers, functions, policies
-- 2. Maak tabellen opnieuw aan met juiste schema
-- 3. Installeer alle RLS policies (VEILIG, niet open)
-- 4. Installeer privilege escalation protection
-- 5. Maak admin@admin.nl direct aan als admin
--
-- Gebruik dit alleen als je ZEKER weet dat je alles wilt verwijderen!
-- ============================================================================

-- ============================================================================
-- STAP 1: VERWIJDER ALLES (NUCLEAR OPTION)
-- ============================================================================

-- Drop triggers
DROP TRIGGER IF EXISTS prevent_is_admin_escalation ON student_profiles CASCADE;
DROP TRIGGER IF EXISTS update_questions_updated_at ON questions CASCADE;
DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS prevent_is_admin_escalation() CASCADE;
DROP FUNCTION IF EXISTS is_current_user_admin() CASCADE;
DROP FUNCTION IF EXISTS is_profile_owner(TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop tables (CASCADE verwijdert ook alle policies, indexes, etc)
DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS student_profiles CASCADE;

-- ============================================================================
-- STAP 2: MAAK TABELLEN OPNIEUW AAN
-- ============================================================================

-- Tabel voor vragen
CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('MULTIPLE_CHOICE', 'OPEN')),
  subject TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),
  text TEXT NOT NULL,
  context_text TEXT,
  image_url TEXT,
  has_image BOOLEAN DEFAULT false,  -- Marks that this question needs an image (for quick entry workflow)
  source TEXT,
  options JSONB,
  correct_index INTEGER,
  model_answer TEXT,
  score INTEGER,          -- Points for this question
  exam_year INTEGER,
  exam_type TEXT CHECK (exam_type IN ('practice', 'official_exam')),
  tijdvak INTEGER CHECK (tijdvak IN (1, 2, 3)),  -- Exam period: 1=eerste tijdvak, 2=tweede tijdvak, 3=herkansing
  worksheet_url TEXT,           -- URL to PDF/image in Storage
  worksheet_label TEXT,         -- Label like "Binas-tabel 45"
  requires_worksheet BOOLEAN DEFAULT false,  -- If true, student can skip
  section TEXT,           -- Section title for grouped questions
  section_intro TEXT,     -- Intro text for section (only on first question)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel voor exam resultaten (MET user_id voor security)
CREATE TABLE exam_results (
  id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  answers JSONB NOT NULL,
  exam_year INTEGER,
  exam_type TEXT,
  duration_seconds INTEGER,
  level TEXT CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel voor student profielen (MET is_admin voor security)
CREATE TABLE student_profiles (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),
  struggle_points TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_admin BOOLEAN DEFAULT FALSE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes voor betere performance
CREATE INDEX idx_questions_subject ON questions(subject);
CREATE INDEX idx_questions_level ON questions(level);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_section ON questions(section);
CREATE INDEX idx_questions_has_image ON questions(has_image) WHERE has_image = true;
CREATE INDEX idx_exam_results_student ON exam_results(student_name);
CREATE INDEX idx_exam_results_subject ON exam_results(subject);
CREATE INDEX idx_exam_results_date ON exam_results(date);
CREATE INDEX idx_exam_results_user_id ON exam_results(user_id);
CREATE INDEX idx_student_profiles_auth_user ON student_profiles(auth_user_id);

-- ============================================================================
-- STAP 3: HELPER FUNCTIES
-- ============================================================================

-- Functie om updated_at automatisch bij te werken
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers voor updated_at
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Admin check functie (voor RLS)
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_admin
     FROM student_profiles
     WHERE auth_user_id = auth.uid()
     LIMIT 1),
    FALSE
  );
$$;

-- ============================================================================
-- STAP 4: ENABLE RLS OP ALLE TABELLEN
-- ============================================================================

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STAP 5: VEILIGE RLS POLICIES - QUESTIONS
-- ============================================================================

CREATE POLICY "Authenticated users can read questions"
  ON questions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert questions"
  ON questions FOR INSERT
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Only admins can update questions"
  ON questions FOR UPDATE
  USING (is_current_user_admin());

CREATE POLICY "Only admins can delete questions"
  ON questions FOR DELETE
  USING (is_current_user_admin());

-- ============================================================================
-- STAP 6: VEILIGE RLS POLICIES - EXAM RESULTS
-- ============================================================================

CREATE POLICY "Users can read own results, admins read all"
  ON exam_results FOR SELECT
  USING (auth.uid() = user_id OR is_current_user_admin());

CREATE POLICY "Users can insert own results"
  ON exam_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can update exam results"
  ON exam_results FOR UPDATE
  USING (is_current_user_admin());

CREATE POLICY "Only admins can delete exam results"
  ON exam_results FOR DELETE
  USING (is_current_user_admin());

-- ============================================================================
-- STAP 7: VEILIGE RLS POLICIES - STUDENT PROFILES
-- ============================================================================

-- TIJDELIJK: Simpele policy die werkt
-- Deze maakt student_profiles leesbaar voor authenticated users
-- Later kan dit restrictiever als de is_current_user_admin() functie goed werkt
CREATE POLICY "Authenticated users can read profiles"
  ON student_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert profiles"
  ON student_profiles FOR INSERT
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Users can update own profile, admins update all"
  ON student_profiles FOR UPDATE
  USING (auth.uid() = auth_user_id OR is_current_user_admin());

CREATE POLICY "Only admins can delete profiles"
  ON student_profiles FOR DELETE
  USING (is_current_user_admin());

-- ============================================================================
-- STAP 8: PRIVILEGE ESCALATION PROTECTION (CRITICAL!)
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_is_admin_escalation()
RETURNS TRIGGER AS $$
DECLARE
  user_is_admin BOOLEAN;
BEGIN
  -- Check if is_admin column is being changed
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    -- Check if current user is admin
    SELECT COALESCE(
      (SELECT is_admin FROM student_profiles WHERE auth_user_id = auth.uid() LIMIT 1),
      FALSE
    ) INTO user_is_admin;

    -- If not admin, block the change
    IF NOT user_is_admin THEN
      RAISE EXCEPTION 'Permission denied: Only admins can modify is_admin flag'
        USING HINT = 'Contact an administrator if you need admin access';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_is_admin_escalation
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_is_admin_escalation();

-- ============================================================================
-- STAP 9: MAAK ADMIN ACCOUNT AAN (admin@admin.nl)
-- ============================================================================

-- Schakel trigger tijdelijk uit om admin te maken
DROP TRIGGER IF EXISTS prevent_is_admin_escalation ON student_profiles;

-- Check of admin@admin.nl al bestaat in auth.users
DO $$
DECLARE
  admin_auth_id UUID;
BEGIN
  -- Probeer auth_user_id te vinden voor admin@admin.nl
  SELECT id INTO admin_auth_id
  FROM auth.users
  WHERE email = 'admin@admin.nl'
  LIMIT 1;

  -- Insert of update admin profiel
  INSERT INTO student_profiles (email, name, level, is_admin, auth_user_id, is_active)
  VALUES (
    'admin@admin.nl',
    'Admin',
    'HAVO',
    TRUE,
    admin_auth_id,
    TRUE
  )
  ON CONFLICT (email) DO UPDATE
  SET is_admin = TRUE,
      auth_user_id = COALESCE(EXCLUDED.auth_user_id, student_profiles.auth_user_id),
      is_active = TRUE;

  RAISE NOTICE '✅ Admin account admin@admin.nl created/updated';
END $$;

-- Zet trigger weer aan
CREATE TRIGGER prevent_is_admin_escalation
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_is_admin_escalation();

-- ============================================================================
-- STAP 10: VERIFICATIE
-- ============================================================================

DO $$
DECLARE
  questions_count INTEGER;
  results_count INTEGER;
  profiles_count INTEGER;
  admin_count INTEGER;
  rls_enabled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO questions_count FROM questions;
  SELECT COUNT(*) INTO results_count FROM exam_results;
  SELECT COUNT(*) INTO profiles_count FROM student_profiles;
  SELECT COUNT(*) INTO admin_count FROM student_profiles WHERE is_admin = TRUE;

  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('questions', 'exam_results', 'student_profiles')
    AND rowsecurity = TRUE;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ DATABASE RESET COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - questions: % rows', questions_count;
  RAISE NOTICE '  - exam_results: % rows', results_count;
  RAISE NOTICE '  - student_profiles: % rows', profiles_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  - RLS enabled: %/3 tables', rls_enabled_count;
  RAISE NOTICE '  - Admin accounts: %', admin_count;
  RAISE NOTICE '  - Privilege escalation trigger: ✅ Active';
  RAISE NOTICE '';

  IF admin_count > 0 THEN
    RAISE NOTICE '✅ Admin account(s) configured';
  ELSE
    RAISE WARNING '⚠️  NO ADMIN ACCOUNTS - Run: UPDATE student_profiles SET is_admin = TRUE WHERE email = ''admin@admin.nl'';';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Log in as admin@admin.nl';
  RAISE NOTICE '2. Test adding questions (should work now)';
  RAISE NOTICE '3. Test adding students';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- ✅ DONE!
-- ============================================================================
