-- ============================================================================
-- MIGRATION: Fix student_profiles tabel voor email-based authentication
-- ============================================================================
-- BELANGRIJK: Voer dit script uit in de Supabase SQL Editor!
-- Dit lost de problemen op met het toevoegen en verwijderen van studenten.
-- ============================================================================

-- ============================================================================
-- STAP 1: Maak password kolom optioneel
-- ============================================================================
-- De password kolom was verplicht (NOT NULL) maar wordt nu optioneel
-- omdat we Supabase Auth gebruiken voor authenticatie in plaats van
-- lokale wachtwoorden in de student_profiles tabel.

ALTER TABLE student_profiles ALTER COLUMN password DROP NOT NULL;

-- Zet lege string voor bestaande null passwords
UPDATE student_profiles SET password = '' WHERE password IS NULL;

-- ============================================================================
-- STAP 2: Zorg dat email kolom bestaat en UNIQUE is
-- ============================================================================
-- Email is nodig voor het koppelen van Supabase Auth users aan profielen

-- Voeg email kolom toe als die nog niet bestaat
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Maak een unieke index op email (alleen voor niet-null waarden)
-- Dit is nodig voor de delete operatie op basis van email
DROP INDEX IF EXISTS idx_student_profiles_email_unique;
CREATE UNIQUE INDEX idx_student_profiles_email_unique
ON student_profiles(email)
WHERE email IS NOT NULL;

-- ============================================================================
-- STAP 3: Voeg is_active kolom toe indien nodig
-- ============================================================================
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ============================================================================
-- STAP 4: Fix Row Level Security (RLS) policies
-- ============================================================================
-- Zorg dat er policies zijn voor SELECT, INSERT, UPDATE en DELETE

-- Drop bestaande policies om dubbelen te voorkomen
DROP POLICY IF EXISTS "Allow public read access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public insert access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public update access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public delete access to student_profiles" ON student_profiles;

-- Maak policies opnieuw aan
CREATE POLICY "Allow public read access to student_profiles" ON student_profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to student_profiles" ON student_profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to student_profiles" ON student_profiles
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to student_profiles" ON student_profiles
    FOR DELETE USING (true);

-- ============================================================================
-- STAP 5: Voeg index toe voor betere email lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON student_profiles(email);

-- ============================================================================
-- VERIFICATIE - Voer deze queries uit om te controleren
-- ============================================================================
--
-- 1. Check of password nullable is:
-- SELECT column_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'student_profiles' AND column_name = 'password';
-- (Moet "YES" zijn)
--
-- 2. Check of email unique index bestaat:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'student_profiles' AND indexname LIKE '%email%';
--
-- 3. Check alle policies:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'student_profiles';
-- (Moet SELECT, INSERT, UPDATE, DELETE hebben)
--
-- 4. Check tabel structuur:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'student_profiles'
-- ORDER BY ordinal_position;
--
-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Na het uitvoeren van dit script zou het toevoegen en verwijderen van
-- studenten via het admin panel moeten werken!
-- ============================================================================
