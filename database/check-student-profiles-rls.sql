-- ============================================================================
-- SQL DIAGNOSTIC & FIX SCRIPT: Student Profiles RLS Check
-- ============================================================================
-- Dit script controleert of de RLS policies correct zijn ingesteld
-- en voegt ontbrekende policies toe.
--
-- Voer dit uit in de Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STAP 1: DIAGNOSE - Controleer huidige RLS status
-- ============================================================================

-- Check of RLS is ingeschakeld op student_profiles
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'student_profiles';

-- Bekijk alle bestaande policies op student_profiles
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'student_profiles';

-- ============================================================================
-- STAP 2: DIAGNOSE - Check tabel structuur
-- ============================================================================

-- Bekijk kolommen en constraints
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'student_profiles'
ORDER BY ordinal_position;

-- Check primary key en unique constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'student_profiles';

-- Check indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'student_profiles';

-- ============================================================================
-- STAP 3: FIX - Voeg ontbrekende DELETE policy toe
-- ============================================================================

-- Drop existing delete policy if it exists (safe to run)
DROP POLICY IF EXISTS "Allow public delete access to student_profiles" ON student_profiles;

-- Maak DELETE policy aan
CREATE POLICY "Allow public delete access to student_profiles" ON student_profiles
    FOR DELETE USING (true);

-- ============================================================================
-- STAP 4: FIX - Voeg unique constraint toe op email (als die ontbreekt)
-- ============================================================================

-- Voeg een unique index toe op email (als die niet bestaat)
-- Dit is nodig omdat de applicatie email gebruikt voor identificatie
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_email_unique
ON student_profiles(email)
WHERE email IS NOT NULL;

-- ============================================================================
-- STAP 5: FIX - Zorg dat alle policies bestaan
-- ============================================================================

-- Recreate alle policies om zeker te zijn dat ze bestaan

-- SELECT policy
DROP POLICY IF EXISTS "Allow public read access to student_profiles" ON student_profiles;
CREATE POLICY "Allow public read access to student_profiles" ON student_profiles
    FOR SELECT USING (true);

-- INSERT policy
DROP POLICY IF EXISTS "Allow public insert access to student_profiles" ON student_profiles;
CREATE POLICY "Allow public insert access to student_profiles" ON student_profiles
    FOR INSERT WITH CHECK (true);

-- UPDATE policy
DROP POLICY IF EXISTS "Allow public update access to student_profiles" ON student_profiles;
CREATE POLICY "Allow public update access to student_profiles" ON student_profiles
    FOR UPDATE USING (true);

-- DELETE policy (was missing!)
DROP POLICY IF EXISTS "Allow public delete access to student_profiles" ON student_profiles;
CREATE POLICY "Allow public delete access to student_profiles" ON student_profiles
    FOR DELETE USING (true);

-- ============================================================================
-- STAP 6: VERIFICATIE - Controleer of alles goed is
-- ============================================================================

-- Final check: alle policies moeten nu bestaan
SELECT
    policyname,
    cmd,
    CASE
        WHEN qual = 'true' THEN 'PUBLIC ACCESS'
        ELSE qual::text
    END as access_rule
FROM pg_policies
WHERE tablename = 'student_profiles'
ORDER BY cmd;

-- Verwachte output:
-- +---------------------------------------------+--------+---------------+
-- | policyname                                  | cmd    | access_rule   |
-- +---------------------------------------------+--------+---------------+
-- | Allow public delete access to student_profiles | DELETE | PUBLIC ACCESS |
-- | Allow public insert access to student_profiles | INSERT | PUBLIC ACCESS |
-- | Allow public read access to student_profiles   | SELECT | PUBLIC ACCESS |
-- | Allow public update access to student_profiles | UPDATE | PUBLIC ACCESS |
-- +---------------------------------------------+--------+---------------+

-- ============================================================================
-- STAP 7: TEST - Probeer een test insert en delete
-- ============================================================================

-- Test insert (uncomment om te testen)
-- INSERT INTO student_profiles (name, email, password, level, is_active)
-- VALUES ('Test Student', 'test@test.nl', 'testpass', 'HAVO', true);

-- Test delete (uncomment om te testen)
-- DELETE FROM student_profiles WHERE email = 'test@test.nl';

-- ============================================================================
-- STAP 8: EXTRA CHECK - Bekijk service role permissions
-- ============================================================================

-- De service role key zou RLS moeten omzeilen, maar check toch:
-- Als je de service role key gebruikt zou RLS geen probleem moeten zijn.
--
-- Als je TOCH problemen hebt met service role:
-- 1. Check of SUPABASE_SERVICE_ROLE_KEY correct is ingesteld in je .env
-- 2. Check of je de juiste Supabase URL gebruikt
-- 3. Kijk in de Supabase logs voor meer details

-- ============================================================================
-- DONE!
-- ============================================================================
-- Als dit script succesvol is uitgevoerd, zou het toevoegen en verwijderen
-- van studenten nu moeten werken.
--
-- Als het nog steeds niet werkt, controleer:
-- 1. De SUPABASE_SERVICE_ROLE_KEY in je environment variables
-- 2. De Vercel function logs voor foutmeldingen
-- 3. De browser console voor netwerk errors
-- ============================================================================
