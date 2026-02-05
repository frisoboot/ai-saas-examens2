-- Migration: Create ai_study_feedback table
-- Stores AI-generated study feedback per user, refreshed when new exam data is available

-- Create table
CREATE TABLE IF NOT EXISTS ai_study_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personalized_advice TEXT NOT NULL,
  priority_subjects JSONB NOT NULL DEFAULT '[]',
  weekly_goal TEXT NOT NULL,
  last_exam_date_at_generation TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_study_feedback_user_id ON ai_study_feedback(user_id);

-- Auto-update updated_at trigger
CREATE TRIGGER update_ai_study_feedback_updated_at
  BEFORE UPDATE ON ai_study_feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE ai_study_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can manage their own feedback
CREATE POLICY "Users can read own feedback"
  ON ai_study_feedback FOR SELECT
  USING (auth.uid() = user_id OR is_current_user_admin());

CREATE POLICY "Users can insert own feedback"
  ON ai_study_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
  ON ai_study_feedback FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can delete feedback"
  ON ai_study_feedback FOR DELETE
  USING (is_current_user_admin());
