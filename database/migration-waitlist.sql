-- Migration: Add waitlist table
-- Registration is disabled; prospective users sign up for a waitlist instead.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text,
  level text CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),
  note text,
  source text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can insert into the waitlist
CREATE POLICY "Anyone can join waitlist" ON public.waitlist
  FOR INSERT WITH CHECK (true);

-- No public SELECT/UPDATE/DELETE; admins use the service role key to read/manage.

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist (email);
