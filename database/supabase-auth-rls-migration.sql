-- Supabase Auth + RLS migratie
-- Voer dit script uit in de SQL Editor van je Supabase project

-- Voeg auth_user_id toe aan student_profiles en maak het verplicht
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE student_profiles ALTER COLUMN auth_user_id SET NOT NULL;

-- Zorg voor eenduidige koppeling tussen auth user en profiel
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_auth_user_id
  ON student_profiles(auth_user_id);

ALTER TABLE student_profiles
  ADD CONSTRAINT student_profiles_auth_user_fk
  FOREIGN KEY (auth_user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
