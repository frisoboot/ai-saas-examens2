-- VOLLEDIGE DIAGNOSE SCRIPT
-- Voer elke sectie apart uit om te zien waar het probleem zit

-- =====================================================
-- TEST 1: Check student_profiles tabel structuur
-- =====================================================
SELECT 'TEST 1: Tabel structuur' as test;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'student_profiles';

-- =====================================================
-- TEST 2: Check primary key
-- =====================================================
SELECT 'TEST 2: Primary key' as test;
SELECT constraint_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'student_profiles';

-- =====================================================
-- TEST 3: Check RLS policies (moet 4 zijn)
-- =====================================================
SELECT 'TEST 3: RLS Policies' as test;
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'student_profiles';

-- =====================================================
-- TEST 4: Direct INSERT test
-- =====================================================
SELECT 'TEST 4: INSERT test' as test;
INSERT INTO student_profiles (email, name, level, is_active)
VALUES ('diagnose-test@test.nl', 'Diagnose Test', 'HAVO', true)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- TEST 5: SELECT test
-- =====================================================
SELECT 'TEST 5: SELECT test' as test;
SELECT * FROM student_profiles WHERE email = 'diagnose-test@test.nl';

-- =====================================================
-- TEST 6: UPDATE test
-- =====================================================
SELECT 'TEST 6: UPDATE test' as test;
UPDATE student_profiles SET name = 'Updated Name' WHERE email = 'diagnose-test@test.nl';

-- =====================================================
-- TEST 7: DELETE test
-- =====================================================
SELECT 'TEST 7: DELETE test' as test;
DELETE FROM student_profiles WHERE email = 'diagnose-test@test.nl';

-- =====================================================
-- TEST 8: Confirm delete worked
-- =====================================================
SELECT 'TEST 8: Confirm delete' as test;
SELECT COUNT(*) as remaining FROM student_profiles WHERE email = 'diagnose-test@test.nl';

-- =====================================================
-- RESULTAAT
-- =====================================================
SELECT 'Als alle tests GEEN errors geven, ligt het probleem NIET bij Supabase Database maar bij Supabase AUTH' as conclusie;
