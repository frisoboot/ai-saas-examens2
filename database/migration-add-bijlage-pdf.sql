-- Migration: Add bijlage PDF fields to questions table
-- These fields support a separate attachment/bijlage PDF per exam (e.g., Binas, atlas, bronnenboekje)
-- The examBijlageUrl is shared across all questions in one exam, bijlagePdfPage is per-question

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS exam_bijlage_url TEXT,
ADD COLUMN IF NOT EXISTS bijlage_pdf_page INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN questions.exam_bijlage_url IS 'URL to bijlage PDF in Supabase Storage - shared across all questions in one exam';
COMMENT ON COLUMN questions.bijlage_pdf_page IS 'Specific page number in the bijlage PDF to show for this question (1-indexed)';
