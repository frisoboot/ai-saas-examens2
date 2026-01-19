-- Fix RLS Policies voor Questions Tabel
-- Probleem: "new row violates row-level security policy for table questions"
-- Dit script verwijdert alle bestaande policies en maakt nieuwe aan

-- ============================================================================
-- STAP 1: Verwijder alle bestaande policies voor questions tabel
-- ============================================================================
DROP POLICY IF EXISTS "Allow public read access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public insert access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public update access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public delete access to questions" ON questions;

-- Voor de zekerheid ook andere mogelijke policy namen
DROP POLICY IF EXISTS "Enable read access for all users" ON questions;
DROP POLICY IF EXISTS "Enable insert access for all users" ON questions;
DROP POLICY IF EXISTS "Enable update access for all users" ON questions;
DROP POLICY IF EXISTS "Enable delete access for all users" ON questions;

-- ============================================================================
-- STAP 2: Maak nieuwe publieke policies aan
-- Deze policies geven volledige toegang aan alle gebruikers (authenticated én anonymous)
-- ============================================================================

-- SELECT policy - iedereen kan vragen lezen
CREATE POLICY "Allow public read access to questions" ON questions
    FOR SELECT
    USING (true);

-- INSERT policy - iedereen kan vragen toevoegen
CREATE POLICY "Allow public insert access to questions" ON questions
    FOR INSERT
    WITH CHECK (true);

-- UPDATE policy - iedereen kan vragen bijwerken
CREATE POLICY "Allow public update access to questions" ON questions
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- DELETE policy - iedereen kan vragen verwijderen
CREATE POLICY "Allow public delete access to questions" ON questions
    FOR DELETE
    USING (true);

-- ============================================================================
-- STAP 3: Verifieer dat RLS ingeschakeld is
-- ============================================================================
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATIE QUERIES
-- ============================================================================
-- Run deze queries na het uitvoeren van het script om te verifiëren:

-- 1. Check of RLS enabled is
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'questions';

-- 2. Check welke policies er zijn
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'questions';

-- ============================================================================
-- ALTERNATIEVE OPTIE: Disable RLS (alleen voor development/testing)
-- ============================================================================
-- Als je tijdens development geen RLS wilt gebruiken, gebruik dit:
-- ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
--
-- WAARSCHUWING: Dit is NIET veilig voor productie!
-- Gebruik alleen in development omgeving.
