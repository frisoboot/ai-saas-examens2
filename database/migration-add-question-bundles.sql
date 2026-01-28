-- ============================================================================
-- MIGRATION: Add Question Bundles Support
-- Groups multiple questions under one context/topic (like real exams)
-- ============================================================================

-- Create question_bundles table
CREATE TABLE IF NOT EXISTS question_bundles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,                    -- e.g., "Kwaliteitscontrole voor straight whiskey"
  context_text TEXT NOT NULL,             -- The introductory text/source material
  subject TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),
  exam_year INTEGER,
  exam_type TEXT DEFAULT 'official_exam',
  image_url TEXT,                         -- Optional image for the bundle
  worksheet_url TEXT,                     -- Optional worksheet for the entire bundle
  worksheet_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add bundle_id, question_number, and image_caption to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS bundle_id TEXT REFERENCES question_bundles(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_number INTEGER;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_caption TEXT;

-- Add score column if it doesn't exist (points per question)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 1;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_bundles_subject ON question_bundles(subject);
CREATE INDEX IF NOT EXISTS idx_bundles_level ON question_bundles(level);
CREATE INDEX IF NOT EXISTS idx_bundles_year ON question_bundles(exam_year);
CREATE INDEX IF NOT EXISTS idx_questions_bundle ON questions(bundle_id);
CREATE INDEX IF NOT EXISTS idx_questions_bundle_number ON questions(bundle_id, question_number);

-- Trigger for auto-updating timestamp
CREATE TRIGGER update_question_bundles_updated_at BEFORE UPDATE ON question_bundles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

ALTER TABLE question_bundles ENABLE ROW LEVEL SECURITY;

-- Policies for question_bundles (same as questions table)
CREATE POLICY "Allow public read access to question_bundles" ON question_bundles
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to question_bundles" ON question_bundles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to question_bundles" ON question_bundles
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to question_bundles" ON question_bundles
    FOR DELETE USING (true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify success:

-- Check if question_bundles table exists
-- SELECT tablename FROM pg_tables WHERE tablename = 'question_bundles';

-- Check if bundle_id column exists on questions
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'questions' AND column_name IN ('bundle_id', 'question_number');
