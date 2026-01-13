-- ============================================================================
-- SUPABASE AUTH + RLS SECURITY MIGRATION
-- Dit script implementeert veilige Row Level Security met Supabase Auth JWT
-- ============================================================================
--
-- Voer dit script uit in je Supabase SQL Editor
-- Dit zorgt voor:
-- 1. Auth user ID kolom in student_profiles
-- 2. Veilige RLS policies gebaseerd op JWT tokens
-- 3. Role-based access control (admin vs student)
-- 4. Admin user account aanmaken
--
-- ============================================================================

-- ============================================================================
-- STAP 1: Update student_profiles tabel
-- ============================================================================

-- Voeg auth_user_id toe om te linken naar Supabase Auth
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Maak oude password kolommen optioneel (voor backward compatibility)
-- Deze kunnen later verwijderd worden na volledige migratie
-- ALTER TABLE student_profiles DROP COLUMN IF EXISTS password;
-- ALTER TABLE student_profiles DROP COLUMN IF EXISTS password_hash;

-- Index voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_student_profiles_auth_user_id ON student_profiles(auth_user_id);

-- ============================================================================
-- STAP 2: Helper functies voor RLS policies
-- ============================================================================

-- Functie om user role uit JWT te halen
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    'anonymous'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om te checken of user admin is
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om te checken of user student is
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'student';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Functie om student naam uit JWT te halen
CREATE OR REPLACE FUNCTION public.get_student_name()
RETURNS TEXT AS $$
BEGIN
  RETURN auth.jwt() -> 'user_metadata' ->> 'name';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STAP 3: Verwijder oude onveilige policies
-- ============================================================================

-- Questions table
DROP POLICY IF EXISTS "Allow public read access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public insert access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public update access to questions" ON questions;
DROP POLICY IF EXISTS "Allow public delete access to questions" ON questions;

-- Exam results table
DROP POLICY IF EXISTS "Allow public read access to exam_results" ON exam_results;
DROP POLICY IF EXISTS "Allow public insert access to exam_results" ON exam_results;

-- Student profiles table
DROP POLICY IF EXISTS "Allow public read access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public insert access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public update access to student_profiles" ON student_profiles;

-- Student progress table
DROP POLICY IF EXISTS "Allow public read access to student_progress" ON student_progress;
DROP POLICY IF EXISTS "Allow public insert access to student_progress" ON student_progress;
DROP POLICY IF EXISTS "Allow public update access to student_progress" ON student_progress;

-- Admin users table
DROP POLICY IF EXISTS "Allow admin login queries" ON admin_users;

-- Import history table
DROP POLICY IF EXISTS "Allow public access to import_history" ON import_history;

-- ============================================================================
-- STAP 4: Veilige RLS policies voor QUESTIONS tabel
-- ============================================================================

-- Iedereen (authenticated users) kan vragen lezen
CREATE POLICY "Authenticated users can read questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

-- Alleen admins kunnen vragen toevoegen
CREATE POLICY "Admins can insert questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Alleen admins kunnen vragen updaten
CREATE POLICY "Admins can update questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Alleen admins kunnen vragen verwijderen
CREATE POLICY "Admins can delete questions"
  ON questions FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- STAP 5: Veilige RLS policies voor EXAM_RESULTS tabel
-- ============================================================================

-- Studenten kunnen alleen hun eigen resultaten zien
CREATE POLICY "Students can read own results"
  ON exam_results FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    (is_student() AND student_name = get_student_name())
  );

-- Studenten kunnen alleen hun eigen resultaten toevoegen
CREATE POLICY "Students can insert own results"
  ON exam_results FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR
    (is_student() AND student_name = get_student_name())
  );

-- Alleen admins kunnen resultaten updaten
CREATE POLICY "Admins can update results"
  ON exam_results FOR UPDATE
  TO authenticated
  USING (is_admin());

-- Alleen admins kunnen resultaten verwijderen
CREATE POLICY "Admins can delete results"
  ON exam_results FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- STAP 6: Veilige RLS policies voor STUDENT_PROFILES tabel
-- ============================================================================

-- Studenten kunnen alleen hun eigen profiel zien, admins alles
CREATE POLICY "Students can read own profile, admins read all"
  ON student_profiles FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    (is_student() AND name = get_student_name())
  );

-- Alleen admins kunnen studenten aanmaken (via service role key in code)
-- Deze policy is voor extra beveiliging - in de praktijk gebeurt dit via supabaseAdmin
CREATE POLICY "Only service role can insert students"
  ON student_profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Studenten kunnen hun eigen profiel updaten, admins alles
CREATE POLICY "Students can update own profile, admins update all"
  ON student_profiles FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR
    (is_student() AND name = get_student_name())
  );

-- Alleen admins kunnen studenten verwijderen
CREATE POLICY "Admins can delete students"
  ON student_profiles FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- STAP 7: Veilige RLS policies voor STUDENT_PROGRESS tabel
-- ============================================================================

-- Studenten kunnen alleen hun eigen progress zien
CREATE POLICY "Students can read own progress"
  ON student_progress FOR SELECT
  TO authenticated
  USING (
    is_admin() OR
    (is_student() AND student_name = get_student_name())
  );

-- Studenten kunnen hun eigen progress toevoegen/updaten
CREATE POLICY "Students can insert own progress"
  ON student_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR
    (is_student() AND student_name = get_student_name())
  );

CREATE POLICY "Students can update own progress"
  ON student_progress FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR
    (is_student() AND student_name = get_student_name())
  );

-- Alleen admins kunnen progress verwijderen
CREATE POLICY "Admins can delete progress"
  ON student_progress FOR DELETE
  TO authenticated
  USING (is_admin());

-- ============================================================================
-- STAP 8: Veilige RLS policies voor IMPORT_HISTORY tabel
-- ============================================================================

-- Alleen admins kunnen import history zien
CREATE POLICY "Admins can read import history"
  ON import_history FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert import history"
  ON import_history FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- ============================================================================
-- STAP 9: Admin user aanmaken in Supabase Auth
-- ============================================================================
--
-- BELANGRIJK: Deze stap moet je HANDMATIG doen via Supabase Dashboard of met onderstaande instructies
--
-- Optie 1: Via Supabase Dashboard
-- ---------------------------------
-- 1. Ga naar Authentication > Users
-- 2. Klik "Add user"
-- 3. Email: admin@admin.local
-- 4. Password: admin123 (of je eigen wachtwoord)
-- 5. Auto Confirm User: YES
-- 6. Klik "Create user"
-- 7. Klik op de nieuwe user
-- 8. Ga naar "User Metadata" tab
-- 9. Voeg toe: {"role": "admin", "username": "admin"}
-- 10. Save
--
-- Optie 2: Via SQL (als je auth.users directe toegang hebt)
-- ----------------------------------------------------------
-- Normaal gesproken kun je auth.users niet direct benaderen vanuit SQL Editor.
-- Gebruik in plaats daarvan de Supabase Dashboard zoals hierboven beschreven.
--
-- Of gebruik deze TypeScript code in je console:
-- ```typescript
-- import { createClient } from '@supabase/supabase-js'
--
-- const supabaseUrl = 'YOUR_SUPABASE_URL'
-- const serviceRoleKey = 'YOUR_SERVICE_ROLE_KEY'
--
-- const supabase = createClient(supabaseUrl, serviceRoleKey, {
--   auth: {
--     autoRefreshToken: false,
--     persistSession: false
--   }
-- })
--
-- await supabase.auth.admin.createUser({
--   email: 'admin@admin.local',
--   password: 'admin123',
--   email_confirm: true,
--   user_metadata: {
--     role: 'admin',
--     username: 'admin'
--   }
-- })
-- ```
--
-- ============================================================================
-- STAP 10: Verwijder oude admin_users tabel (optioneel - na migratie)
-- ============================================================================
--
-- De admin_users tabel is niet meer nodig omdat we Supabase Auth gebruiken
-- Verwijder deze pas NADAT je de nieuwe admin user hebt aangemaakt en getest!
--
-- DROP TABLE IF EXISTS admin_users CASCADE;
--
-- ============================================================================

-- ============================================================================
-- VERIFICATIE QUERIES
-- ============================================================================
-- Test of de policies werken door deze queries uit te voeren als verschillende users:

-- 1. Check of helper functies werken:
-- SELECT get_user_role(), is_admin(), is_student(), get_student_name();

-- 2. Test als admin (login als admin eerst):
-- SELECT * FROM questions LIMIT 5;
-- SELECT * FROM student_profiles LIMIT 5;
-- SELECT * FROM exam_results LIMIT 5;

-- 3. Test als student (login als student eerst):
-- SELECT * FROM questions LIMIT 5; -- Should work
-- SELECT * FROM student_profiles WHERE name = get_student_name(); -- Should only see own profile
-- SELECT * FROM exam_results WHERE student_name = get_student_name(); -- Should only see own results

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Volgende stappen:
-- 1. Voer dit script uit in Supabase SQL Editor
-- 2. Maak admin user aan via Dashboard (zie STAP 9)
-- 3. Voeg je Supabase credentials toe aan .env.local:
--    - VITE_SUPABASE_URL
--    - VITE_SUPABASE_ANON_KEY
--    - VITE_SUPABASE_SERVICE_ROLE_KEY
-- 4. Test de nieuwe login flows
-- 5. Als alles werkt, verwijder oude tabellen/kolommen
--
-- ============================================================================
