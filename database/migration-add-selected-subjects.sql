-- Migration: Add selected_subjects to student_profiles
-- This allows students to choose which subjects appear on their dashboard.
-- NULL or empty array means "show all subjects".

ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS selected_subjects JSONB DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN student_profiles.selected_subjects IS 'JSON array of subject names the student wants to see. NULL = show all subjects.';
