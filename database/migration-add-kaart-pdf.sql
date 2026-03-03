-- Migration: Add kaartboekje PDF support to questions table
-- For exams like Aardrijkskunde that have a separate maps booklet

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS exam_kaart_url TEXT,
ADD COLUMN IF NOT EXISTS kaart_pdf_page INTEGER;

COMMENT ON COLUMN questions.exam_kaart_url IS 'URL to kaartboekje PDF in Supabase Storage - shared across all questions in one exam (e.g. Aardrijkskunde maps booklet)';
COMMENT ON COLUMN questions.kaart_pdf_page IS 'Specific page number in the kaartboekje PDF to show for this question (1-indexed)';
