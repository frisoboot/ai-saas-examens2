-- Migration: Add context group fields to questions table
-- Date: 2026-01-27
-- Purpose: Allow questions to be grouped together under shared context/intro text
--          Questions with the same context_group_id share the same introductory text
--          and are shown together during exams.

-- Add context_group_id column for linking questions that share context
ALTER TABLE questions ADD COLUMN IF NOT EXISTS context_group_id TEXT;

-- Add context_group_title for the section title (e.g., "Stikstofoxiden")
ALTER TABLE questions ADD COLUMN IF NOT EXISTS context_group_title TEXT;

-- Create index for efficient lookups of grouped questions
CREATE INDEX IF NOT EXISTS idx_questions_context_group
ON questions(context_group_id) WHERE context_group_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN questions.context_group_id IS 'ID to group questions that share the same context text (e.g., "stikstof-2024-t1")';
COMMENT ON COLUMN questions.context_group_title IS 'Title of the question group/section (e.g., "Stikstofoxiden")';


-- USAGE NOTES:
--
-- Questions with the same context_group_id share the same contextText.
-- Only one question in the group needs to have the contextText filled in.
--
-- Example:
-- Question 1: context_group_id='stikstof', context_group_title='Stikstofoxiden', context_text='Bij verbranding...'
-- Question 2: context_group_id='stikstof', context_group_title='Stikstofoxiden', context_text=NULL (inherits from Q1)
-- Question 3: context_group_id='stikstof', context_group_title='Stikstofoxiden', context_text=NULL (inherits from Q1)
--
-- In the ExamTaker, the context stays visible while navigating within the same group.
