-- ============================================================================
-- SECURITY MIGRATION V2: Fix kritieke RLS beveiligingslekken
-- ============================================================================
-- VERBETERD: Dit script is idempotent en kan veilig meerdere keren uitgevoerd worden
--
-- Dit script lost de open RLS policies op door:
-- 1. User ownership tracking toe te voegen aan exam_results
-- 2. Admin role tracking toe te voegen
-- 3. Restrictieve RLS policies te implementeren
--
-- BELANGRIJK: Voer dit uit in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STAP 1: Schema aanpassingen (idempotent)
-- ============================================================================

-- Voeg user_id toe aan exam_results voor ownership tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exam_results' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE exam_results
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

    RAISE NOTICE 'Kolom exam_results.user_id toegevoegd';
  ELSE
    RAISE NOTICE 'Kolom exam_results.user_id bestaat al';
  END IF;
END $$;

-- Voeg is_admin toe aan student_profiles voor role-based access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE student_profiles
      ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

    RAISE NOTICE 'Kolom student_profiles.is_admin toegevoegd';
  ELSE
    RAISE NOTICE 'Kolom student_profiles.is_admin bestaat al';
  END IF;
END $$;

-- Index voor snelle user_id lookups (idempotent)
CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON exam_results(user_id);

-- ============================================================================
-- STAP 2: Verwijder ALLE bestaande policies (oude EN nieuwe)
-- ============================================================================

-- Questions policies (verwijder ALLES)
DROP POLICY IF EXISTS "Allow public read access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public insert access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public update access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public delete access to questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can read questions" ON questions;
DROP POLICY IF EXISTS "Only admins can insert questions" ON questions;
DROP POLICY IF EXISTS "Only admins can update questions" ON questions;
DROP POLICY IF EXISTS "Only admins can delete questions" ON questions;

-- Exam results policies (verwijder ALLES)
DROP POLICY IF EXISTS "Allow public read access to exam_results" ON exam_results;
DROP POLICY IF EXISTS "Allow public insert access to exam_results" ON exam_results;
DROP POLICY IF EXISTS "Allow public update access to exam_results" ON exam_results;
DROP POLICY IF EXISTS "Allow public delete access to exam_results" ON exam_results;
DROP POLICY IF EXISTS "Users can read own results, admins read all" ON exam_results;
DROP POLICY IF EXISTS "Users can insert own results" ON exam_results;
DROP POLICY IF EXISTS "Only admins can update exam results" ON exam_results;
DROP POLICY IF EXISTS "Only admins can delete exam results" ON exam_results;

-- Student profiles policies (verwijder ALLES)
DROP POLICY IF EXISTS "Allow public read access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public insert access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public update access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public delete access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Users can read own profile, admins read all" ON student_profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON student_profiles;
DROP POLICY IF EXISTS "Users can update own profile, admins update all" ON student_profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON student_profiles;

-- ============================================================================
-- STAP 3: Helper functies voor RLS (idempotent)
-- ============================================================================

-- Functie: Check of huidige user een admin is
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM student_profiles
    WHERE auth_user_id = auth.uid()
    AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie: Check of huidige user eigenaar is van een student profile
CREATE OR REPLACE FUNCTION is_profile_owner(profile_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_email TEXT;
BEGIN
  -- Haal email op van huidige auth user
  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = auth.uid();

  RETURN current_user_email = profile_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STAP 4: VEILIGE RLS Policies - QUESTIONS
-- ============================================================================

-- Questions: Iedereen (authenticated) kan lezen - dit is OK voor een exam systeem
CREATE POLICY "Authenticated users can read questions"
  ON questions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Questions: Alleen admins kunnen toevoegen
CREATE POLICY "Only admins can insert questions"
  ON questions
  FOR INSERT
  WITH CHECK (is_current_user_admin());

-- Questions: Alleen admins kunnen wijzigen
CREATE POLICY "Only admins can update questions"
  ON questions
  FOR UPDATE
  USING (is_current_user_admin());

-- Questions: Alleen admins kunnen verwijderen
CREATE POLICY "Only admins can delete questions"
  ON questions
  FOR DELETE
  USING (is_current_user_admin());

-- ============================================================================
-- STAP 5: VEILIGE RLS Policies - EXAM RESULTS
-- ============================================================================

-- Exam Results: Users kunnen alleen hun EIGEN resultaten zien, admins zien alles
CREATE POLICY "Users can read own results, admins read all"
  ON exam_results
  FOR SELECT
  USING (
    auth.uid() = user_id OR is_current_user_admin()
  );

-- Exam Results: Users kunnen alleen resultaten invoegen voor zichzelf
CREATE POLICY "Users can insert own results"
  ON exam_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Exam Results: Alleen admins kunnen wijzigen
CREATE POLICY "Only admins can update exam results"
  ON exam_results
  FOR UPDATE
  USING (is_current_user_admin());

-- Exam Results: Alleen admins kunnen verwijderen
CREATE POLICY "Only admins can delete exam results"
  ON exam_results
  FOR DELETE
  USING (is_current_user_admin());

-- ============================================================================
-- STAP 6: VEILIGE RLS Policies - STUDENT PROFILES
-- ============================================================================

-- Student Profiles: Users kunnen eigen profiel zien, admins zien alles
CREATE POLICY "Users can read own profile, admins read all"
  ON student_profiles
  FOR SELECT
  USING (
    auth.uid() = auth_user_id OR is_current_user_admin()
  );

-- Student Profiles: Alleen admins kunnen nieuwe profielen aanmaken
CREATE POLICY "Only admins can insert profiles"
  ON student_profiles
  FOR INSERT
  WITH CHECK (is_current_user_admin());

-- Student Profiles: Users kunnen eigen profiel wijzigen (behalve is_admin), admins kunnen alles
CREATE POLICY "Users can update own profile, admins update all"
  ON student_profiles
  FOR UPDATE
  USING (
    auth.uid() = auth_user_id OR is_current_user_admin()
  );

-- Student Profiles: Alleen admins kunnen verwijderen
CREATE POLICY "Only admins can delete profiles"
  ON student_profiles
  FOR DELETE
  USING (is_current_user_admin());

-- ============================================================================
-- STAP 6B: CRITICAL - Prevent is_admin Privilege Escalation
-- ============================================================================
-- SECURITY: RLS works at ROW level, not COLUMN level. Users who can UPDATE
-- their own profile could also change is_admin to TRUE, escalating privileges.
-- Solution: BEFORE UPDATE trigger blocks non-admins from changing is_admin.

DROP TRIGGER IF EXISTS prevent_is_admin_escalation ON student_profiles;
DROP FUNCTION IF EXISTS prevent_is_admin_escalation();

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
-- STAP 7: Data migratie - koppel bestaande exam_results aan users
-- ============================================================================

-- Probeer bestaande exam_results te koppelen aan users via email matching
-- Dit werkt alleen als student_name overeenkomt met de email prefix of exacte email
UPDATE exam_results er
SET user_id = sp.auth_user_id
FROM student_profiles sp
WHERE er.user_id IS NULL
  AND (
    er.student_name = sp.email
    OR er.student_name = sp.name
    OR er.student_name ILIKE sp.email || '%'
  )
  AND sp.auth_user_id IS NOT NULL;

-- ============================================================================
-- VERIFICATIE QUERIES
-- ============================================================================

-- Controleer hoeveel exam_results nog geen user_id hebben
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM exam_results
  WHERE user_id IS NULL;

  RAISE NOTICE 'Exam results zonder user_id: %', orphaned_count;
END $$;

-- Controleer hoeveel admins er zijn
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM student_profiles
  WHERE is_admin = TRUE;

  RAISE NOTICE 'Aantal admins: %', admin_count;

  IF admin_count = 0 THEN
    RAISE WARNING '⚠️  GEEN ADMINS GEVONDEN! Maak minimaal 1 admin aan met: UPDATE student_profiles SET is_admin = TRUE WHERE email = ''jouw-email@example.com'';';
  END IF;
END $$;

-- Test of RLS policies actief zijn
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'RLS Status Check:';
  FOR rec IN
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('questions', 'exam_results', 'student_profiles')
    ORDER BY tablename
  LOOP
    RAISE NOTICE '  - %: RLS = %', rec.tablename,
      CASE WHEN rec.rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END;
  END LOOP;
END $$;

-- Toon overzicht van policies
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE 'Policies per tabel:';
  FOR rec IN
    SELECT schemaname, tablename, COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('questions', 'exam_results', 'student_profiles')
    GROUP BY schemaname, tablename
    ORDER BY tablename
  LOOP
    RAISE NOTICE '  - %: % policies', rec.tablename, rec.policy_count;
  END LOOP;
END $$;

-- ============================================================================
-- ✅ MIGRATIE VOLTOOID
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '✅ DATABASE SECURITY MIGRATIE VOLTOOID';
  RAISE NOTICE '✅ ============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 VOLGENDE STAPPEN:';
  RAISE NOTICE '1. Maak je eerste admin aan:';
  RAISE NOTICE '   UPDATE student_profiles SET is_admin = TRUE WHERE email = ''jouw-admin@example.com'';';
  RAISE NOTICE '';
  RAISE NOTICE '2. Test de security policies:';
  RAISE NOTICE '   - Log in als student → kan alleen eigen data zien';
  RAISE NOTICE '   - Log in als admin → kan alle data zien';
  RAISE NOTICE '';
  RAISE NOTICE '3. Cleanup orphaned exam_results (optioneel):';
  RAISE NOTICE '   DELETE FROM exam_results WHERE user_id IS NULL;';
  RAISE NOTICE '';
END $$;
