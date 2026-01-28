-- Migration: Add has_image field to questions table
-- This field allows marking questions that need an image during quick entry workflow
-- Date: 2026-01-28

-- Add has_image column to questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS has_image BOOLEAN DEFAULT false;

-- Create index for efficient filtering of questions that need images
CREATE INDEX IF NOT EXISTS idx_questions_has_image ON questions(has_image) WHERE has_image = true;

-- Comment explaining the field
COMMENT ON COLUMN questions.has_image IS 'Marks that this question needs an image (for quick entry workflow). Used to show overview of questions pending image upload.';
