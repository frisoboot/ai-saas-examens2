-- RESET ALLEEN STUDENT_PROFILES TABEL
-- Veilig script dat geen errors geeft

-- Drop policies (IF EXISTS voorkomt errors)
DROP POLICY IF EXISTS "Allow public read access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public insert access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public update access to student_profiles" ON student_profiles;
DROP POLICY IF EXISTS "Allow public delete access to student_profiles" ON student_profiles;

-- Drop en recreate tabel
DROP TABLE IF EXISTS student_profiles CASCADE;

CREATE TABLE student_profiles (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),
    struggle_points TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index op naam voor zoeken
CREATE INDEX idx_student_profiles_name ON student_profiles(name);

-- RLS inschakelen
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Alle policies aanmaken
CREATE POLICY "Allow public read access to student_profiles" ON student_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to student_profiles" ON student_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to student_profiles" ON student_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to student_profiles" ON student_profiles FOR DELETE USING (true);

-- Klaar
SELECT 'student_profiles tabel succesvol gereset!' as status;
