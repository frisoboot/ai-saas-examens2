-- ============================================================================
-- SECURITY MIGRATION V3 FINAL: Fix kritieke RLS beveiligingslekken
-- ============================================================================
-- TESTED & WORKING VERSION
--
-- Dit script lost de open RLS policies op door:
-- 1. User ownership tracking toe te voegen aan exam_results
-- 2. Admin role tracking toe te voegen
-- 3. Restrictieve RLS policies te implementeren
-- 4. FIX: Werkende admin check voor student_profiles SELECT
--
-- BELANGRIJK: Voer dit uit in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STAP 1: Schema aanpassingen (idempotent)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_results' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE exam_results ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Kolom exam_results.user_id toegevoegd';
  ELSE
    RAISE NOTICE 'Kolom exam_results.user_id bestaat al';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE student_profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Kolom student_profiles.is_admin toegevoegd';
  ELSE
    RAISE NOTICE 'Kolom student_profiles.is_admin bestaat al';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON exam_results(user_id);

-- ============================================================================
-- STAP 2: Verwijder ALLE bestaande policies
-- ============================================================================

-- Questions
DROP POLICY IF EXISTS "Allow public read access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public insert access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public update access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public delete access to questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can read questions" ON questions;
DROP POLICY IF EXISTS "Only admins can insert questions" ON questions;
DROP POLICY IF EXISTS "Only admins can update questions" ON questions;
DROP POLICY IF EXISTS "Only admins can delete questions" ON questions;

-- Exam results
DROP POLICY IF EXISTS "Allow public read access to exam_results" ON exam_results;
DROP POLICY IF EXISTS "Allow public insert access to exam_results" ON exam_results;
DROP POLICY IF EXISTS "Allow public update access to exam_results" ON exam_results;
DROP POLICY IF EXISTS "Allow public delete access to exam_results" ON exam_results;
DROP POLICY IF EXISTS "Users can read own results, admins read all" ON exam_results;
DROP POLICY IF EXISTS "Users can insert own results" ON exam_results;
DROP POLICY IF EXISTS "Only admins can update exam results" ON exam_results;
DROP POLICY IF EXISTS "Only admins can delete exam results" ON exam_results;

-- Student profiles
DROP POLICY IF EXISTS "Allow public read access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public insert access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public update access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public delete access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Users can read own profile, admins read all" ON student_profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON student_profiles;
DROP POLICY IF EXISTS "Users can update own profile, admins update all" ON student_profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON student_profiles;
DROP POLICY IF EXISTS "Admin sees all, users see self" ON student_profiles;
DROP POLICY IF EXISTS "student_profiles_select_policy" ON student_profiles;

-- ============================================================================
-- STAP 3: Helper functies voor RLS (WORKING VERSION)
-- ============================================================================

-- Functie: Check of huidige user een admin is
-- FIXED: Gebruikt SQL ipv PLPGSQL voor betere performance in RLS context
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
-- STAP 4: VEILIGE RLS Policies - QUESTIONS
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
-- STAP 5: VEILIGE RLS Policies - EXAM RESULTS
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
-- STAP 6: VEILIGE RLS Policies - STUDENT PROFILES (FIXED)
-- ============================================================================

-- FIX: Werkende SELECT policy zonder recursive issues
CREATE POLICY "student_profiles_select_policy"
  ON student_profiles FOR SELECT
  USING (
    -- Eigen profiel
    auth.uid() = auth_user_id
    OR
    -- Admin check via functie
    is_current_user_admin()
  );

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
-- STAP 7: Data migratie
-- ============================================================================

UPDATE exam_results er
SET user_id = sp.auth_user_id
FROM student_profiles sp
WHERE er.user_id IS NULL
  AND (er.student_name = sp.email OR er.student_name = sp.name)
  AND sp.auth_user_id IS NOT NULL;

-- ============================================================================
-- VERIFICATIE
-- ============================================================================

DO $$
DECLARE
  rls_count INTEGER;
  policy_count INTEGER;
  admin_count INTEGER;
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('questions', 'exam_results', 'student_profiles')
    AND rowsecurity = TRUE;

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('questions', 'exam_results', 'student_profiles');

  SELECT COUNT(*) INTO admin_count
  FROM student_profiles WHERE is_admin = TRUE;

  SELECT COUNT(*) INTO orphaned_count
  FROM exam_results WHERE user_id IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '================================';
  RAISE NOTICE 'DATABASE SECURITY AUDIT';
  RAISE NOTICE '================================';
  RAISE NOTICE '1. RLS Enabled: %/3 %', rls_count, CASE WHEN rls_count = 3 THEN '✅' ELSE '❌' END;
  RAISE NOTICE '2. Policies: % (expected: 12) %', policy_count, CASE WHEN policy_count = 12 THEN '✅' ELSE '⚠️' END;
  RAISE NOTICE '3. Admin users: % %', admin_count, CASE WHEN admin_count > 0 THEN '✅' ELSE '❌ CREATE ADMIN!' END;
  RAISE NOTICE '4. Orphaned results: % %', orphaned_count, CASE WHEN orphaned_count = 0 THEN '✅' ELSE '⚠️' END;
  RAISE NOTICE '';

  IF rls_count = 3 AND policy_count >= 12 AND admin_count > 0 THEN
    RAISE NOTICE '✅ DATABASE SECURITY: FULLY CONFIGURED';
  ELSE
    RAISE NOTICE '⚠️ ACTION REQUIRED - See messages above';
  END IF;

  RAISE NOTICE '================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- ✅ VOLGENDE STAPPEN
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Create admin: UPDATE student_profiles SET is_admin = TRUE WHERE email = ''your@email.com'';';
  RAISE NOTICE '2. Test in app: Log in as admin and verify you can see all students';
  RAISE NOTICE '3. Test as student: Log in as student and verify you only see own data';
  RAISE NOTICE '';
END $$;
