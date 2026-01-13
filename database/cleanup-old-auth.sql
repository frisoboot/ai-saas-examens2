-- ============================================================================
-- CLEANUP: Verwijder oude authenticatie kolommen
-- ============================================================================
--
-- ⚠️  BELANGRIJK: Voer dit script ALLEEN uit als:
-- 1. Alle studenten zijn gemigreerd naar Supabase Auth
-- 2. Je hebt getest dat login werkt voor alle studenten
-- 3. Je hebt een backup van je database
--
-- Dit script verwijdert:
-- - De oude 'password' kolom uit student_profiles
-- - De oude 'password_hash' kolom uit student_profiles (als die bestaat)
-- - De oude 'admin_users' tabel (als die bestaat)
--
-- ============================================================================

-- STAP 1: Verwijder oude password kolommen uit student_profiles
-- ----------------------------------------------------------------------------

-- Verwijder plaintext password kolom (als die bestaat)
ALTER TABLE student_profiles
DROP COLUMN IF EXISTS password CASCADE;

-- Verwijder password_hash kolom (als die bestaat)
ALTER TABLE student_profiles
DROP COLUMN IF EXISTS password_hash CASCADE;

-- STAP 2: Verwijder oude admin_users tabel
-- ----------------------------------------------------------------------------

-- Verwijder de oude admin_users tabel (als die bestaat)
-- Admin users zijn nu in auth.users met role='admin'
DROP TABLE IF EXISTS admin_users CASCADE;

-- STAP 3: Maak auth_user_id kolom verplicht
-- ----------------------------------------------------------------------------

-- Nu alle studenten een auth_user_id hebben, kunnen we dit verplicht maken
-- (Doe dit alleen als je zeker weet dat ALLE studenten een auth_user_id hebben!)

-- Uncomment de volgende regel als je dit wilt afdwingen:
-- ALTER TABLE student_profiles
-- ALTER COLUMN auth_user_id SET NOT NULL;

-- ============================================================================
-- VERIFICATIE
-- ============================================================================

-- Check hoeveel studenten GEEN auth_user_id hebben
-- Dit zou 0 moeten zijn voordat je de cleanup uitvoert!
SELECT
    COUNT(*) as students_without_auth,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ Alle studenten gemigreerd!'
        ELSE '⚠️  Er zijn nog studenten zonder auth_user_id'
    END as status
FROM student_profiles
WHERE auth_user_id IS NULL;

-- Check alle studenten
SELECT
    name,
    level,
    CASE
        WHEN auth_user_id IS NOT NULL THEN '✅ Gemigreerd'
        ELSE '❌ Niet gemigreerd'
    END as auth_status,
    created_by_admin
FROM student_profiles
ORDER BY name;

-- ============================================================================
-- KLAAR!
-- ============================================================================
-- Na het uitvoeren van dit script:
-- - Oude password kolommen zijn verwijderd
-- - Admin users tabel is verwijderd
-- - Alle authenticatie gebeurt via Supabase Auth
-- - Database is schoner en veiliger
-- ============================================================================
