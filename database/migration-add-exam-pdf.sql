-- Migration: Add PDF tekstboekje support for exams (Nederlands, Engels, Geschiedenis)
-- This adds exam-level PDF URL and per-question page references

-- Add exam PDF URL column (shared across all questions in one exam)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam_pdf_url TEXT;

-- Add PDF page number column (per-question page reference)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS pdf_page INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN questions.exam_pdf_url IS 'URL to exam PDF tekstboekje in Supabase Storage - shared across all questions in one exam';
COMMENT ON COLUMN questions.pdf_page IS 'Specific page number in the PDF tekstboekje to show for this question';
