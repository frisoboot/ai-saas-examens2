-- Migration: Add user_feedback table for platform feedback
-- Users can submit feedback about the platform (bugs, feature requests, general feedback)

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('bug', 'feature_request', 'content', 'general')),
  message text NOT NULL,
  page_context text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can insert feedback
CREATE POLICY "Anyone can submit feedback" ON public.user_feedback
  FOR INSERT WITH CHECK (true);

-- Users can only read their own feedback
CREATE POLICY "Users can read own feedback" ON public.user_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Admins use service role key (bypasses RLS) to read all feedback

-- Index for admin queries (sorted by date)
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_category ON public.user_feedback (category);
