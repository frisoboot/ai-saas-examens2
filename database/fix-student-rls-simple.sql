-- FIX: Voeg ontbrekende DELETE policy toe voor student_profiles
-- Kopieer en plak dit in Supabase SQL Editor

DROP POLICY IF EXISTS "Allow public delete access to student_profiles" ON student_profiles;

CREATE POLICY "Allow public delete access to student_profiles" ON student_profiles
    FOR DELETE USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_email_unique
ON student_profiles(email)
WHERE email IS NOT NULL;
