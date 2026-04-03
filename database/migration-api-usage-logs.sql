-- Migration: API Usage Logs
-- Logt elke AI API call voor inzicht in verbruik (tokens, acties, modellen)
-- Voer uit in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action TEXT NOT NULL,              -- 'chat', 'gradeOpenQuestion', 'generateFlashcards', etc.
  model TEXT NOT NULL,               -- 'google/gemini-2.0-flash' of pro variant
  user_email TEXT,                   -- welke gebruiker (optioneel, uit auth token)
  subject TEXT,                      -- vak (indien van toepassing)
  level TEXT,                        -- niveau VMBO-TL/HAVO/VWO (indien van toepassing)
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  duration_ms INTEGER                -- response tijd in milliseconden
);

-- Index voor snelle queries per datum en actie
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_action ON api_usage_logs(action);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_model ON api_usage_logs(model);

-- RLS: alleen service role kan schrijven/lezen (logging gebeurt server-side)
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Geen publieke toegang - alleen via service role key (server-side)
-- (geen policies nodig: zonder policy blokkeert RLS alles voor anon/authenticated)
