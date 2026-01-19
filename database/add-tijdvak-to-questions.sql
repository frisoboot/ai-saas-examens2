-- Migration: Add exam_year, exam_type, and tijdvak fields to questions table
-- Created: 2026-01-19

-- Add exam_year column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'exam_year'
  ) THEN
    ALTER TABLE questions ADD COLUMN exam_year INTEGER;
  END IF;
END $$;

-- Add exam_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'exam_type'
  ) THEN
    ALTER TABLE questions ADD COLUMN exam_type TEXT CHECK (exam_type IN ('practice', 'official_exam'));
  END IF;
END $$;

-- Add tijdvak column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'tijdvak'
  ) THEN
    ALTER TABLE questions ADD COLUMN tijdvak INTEGER CHECK (tijdvak IN (1, 2, 3));
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_exam_year ON questions(exam_year);
CREATE INDEX IF NOT EXISTS idx_questions_exam_type ON questions(exam_type);
CREATE INDEX IF NOT EXISTS idx_questions_tijdvak ON questions(tijdvak);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_questions_year_tijdvak ON questions(exam_year, tijdvak);
CREATE INDEX IF NOT EXISTS idx_questions_subject_year_tijdvak ON questions(subject, exam_year, tijdvak);

-- Add comment for documentation
COMMENT ON COLUMN questions.exam_year IS 'Year of the exam (e.g., 2024, 2023)';
COMMENT ON COLUMN questions.exam_type IS 'Type of exam: practice or official_exam';
COMMENT ON COLUMN questions.tijdvak IS 'Exam period: 1 (main), 2 (second period), or 3 (resit)';
