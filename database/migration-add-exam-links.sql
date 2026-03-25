-- Migration: Add exam links support to questions table
-- For exams that need external links (e.g., online atlas for Aardrijkskunde)

ALTER TABLE questions
ADD COLUMN IF NOT EXISTS exam_links JSONB;

COMMENT ON COLUMN questions.exam_links IS 'Array of external links for the exam, e.g. [{"title": "Bosatlas Online", "url": "https://..."}] - shared across all questions in one exam';
