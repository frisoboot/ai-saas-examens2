-- ============================================================================
-- MIGRATIE: Voeg user_id toe aan student_progress tabel
-- ============================================================================
-- Deze migratie voegt user_id tracking toe aan student_progress
-- zodat RLS policies correct kunnen werken.
--
-- Voer dit uit in Supabase SQL Editor
-- ============================================================================

-- Stap 1: Voeg user_id kolom toe (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_progress' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE student_progress
      ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

    RAISE NOTICE 'Kolom student_progress.user_id toegevoegd';
  ELSE
    RAISE NOTICE 'Kolom student_progress.user_id bestaat al';
  END IF;
END $$;

-- Stap 2: Maak index voor betere performance
CREATE INDEX IF NOT EXISTS idx_student_progress_user_id ON student_progress(user_id);

-- Stap 3: Update RLS policies voor student_progress

-- Verwijder oude policies
DROP POLICY IF EXISTS "Allow public read access to student_progress" ON student_progress;
DROP POLICY IF EXISTS "Allow public insert access to student_progress" ON student_progress;
DROP POLICY IF EXISTS "Allow public update access to student_progress" ON student_progress;
DROP POLICY IF EXISTS "Users can read own progress" ON student_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON student_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON student_progress;

-- Maak nieuwe beveiligde policies
-- Gebruikers kunnen alleen hun eigen progress zien
CREATE POLICY "Users can read own progress" ON student_progress
  FOR SELECT
  USING (user_id = auth.uid());

-- Gebruikers kunnen alleen hun eigen progress invoegen
CREATE POLICY "Users can insert own progress" ON student_progress
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Gebruikers kunnen alleen hun eigen progress updaten
CREATE POLICY "Users can update own progress" ON student_progress
  FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- VERIFICATIE
-- ============================================================================
SELECT 'student_progress kolommen:' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'student_progress'
ORDER BY ordinal_position;

SELECT 'student_progress RLS policies:' as status;
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'student_progress';
