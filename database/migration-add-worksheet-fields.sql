-- Migration: Add worksheet/attachment fields to questions table
-- Date: 2026-01-27
-- Purpose: Allow questions to have PDF attachments (e.g., Binas tables, worksheets)
--          that students can download. Questions can be marked as requiring the
--          worksheet, allowing students to skip if they can't access it.

-- Add worksheet_url column for storing the URL to the PDF in Supabase Storage
ALTER TABLE questions ADD COLUMN IF NOT EXISTS worksheet_url TEXT;

-- Add worksheet_label column for a friendly name (e.g., "Binas-tabel 45")
ALTER TABLE questions ADD COLUMN IF NOT EXISTS worksheet_label TEXT;

-- Add requires_worksheet flag - if true, students can skip this question
ALTER TABLE questions ADD COLUMN IF NOT EXISTS requires_worksheet BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN questions.worksheet_url IS 'URL to PDF worksheet in Supabase Storage (exam-worksheets bucket)';
COMMENT ON COLUMN questions.worksheet_label IS 'Display name for the worksheet (e.g., "Binas-tabel 45", "Uitwerkpapier")';
COMMENT ON COLUMN questions.requires_worksheet IS 'If true, students can skip this question if they cannot access the worksheet';


-- IMPORTANT: You also need to create the storage bucket in Supabase Dashboard:
-- 1. Go to https://app.supabase.com and select your project
-- 2. Navigate to "Storage" in the menu
-- 3. Click "New bucket"
-- 4. Name: exam-worksheets
-- 5. Public: Yes (so students can download PDFs)
-- 6. Click "Create bucket"
--
-- Optional: Add storage policies for upload/delete access:
--
-- CREATE POLICY "Public can read worksheets"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'exam-worksheets');
--
-- CREATE POLICY "Authenticated users can upload worksheets"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'exam-worksheets' AND auth.role() = 'authenticated');
--
-- CREATE POLICY "Authenticated users can delete worksheets"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'exam-worksheets' AND auth.role() = 'authenticated');
