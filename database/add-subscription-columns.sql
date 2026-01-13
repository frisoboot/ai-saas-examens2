-- ============================================================================
-- SUBSCRIPTION COLUMNS: Voeg abonnement kolommen toe aan student_profiles
-- ============================================================================
--
-- Dit script voegt subscription management toe voor Mollie betalingen
-- Voer dit uit in je Supabase SQL Editor voordat je de subscription features gebruikt
--
-- ============================================================================

-- STAP 1: Voeg subscription kolommen toe aan student_profiles
-- ----------------------------------------------------------------------------

-- Subscription status tracking
ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT
CHECK (subscription_status IN ('trial', 'active', 'inactive', 'expired', 'cancelled'))
DEFAULT 'inactive';

-- Subscription timestamps
ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Mollie integration IDs
ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS mollie_customer_id TEXT;

ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS mollie_subscription_id TEXT;

-- Trial tracking
ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Index for quick subscription checks
CREATE INDEX IF NOT EXISTS idx_student_subscription_status
ON student_profiles(subscription_status, subscription_expires_at);

-- STAP 2: Maak subscription_events tabel voor logging
-- ----------------------------------------------------------------------------

-- Track subscription changes for auditing and debugging
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT REFERENCES student_profiles(name) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'trial_started',
    'subscription_created',
    'payment_success',
    'payment_failed',
    'subscription_cancelled',
    'subscription_expired'
  )),
  mollie_payment_id TEXT,
  mollie_subscription_id TEXT,
  amount DECIMAL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick event lookups
CREATE INDEX IF NOT EXISTS idx_subscription_events_student
ON subscription_events(student_name, created_at DESC);

-- RLS policy: alleen admins en de student zelf kunnen events zien
CREATE POLICY "Students can read own subscription events"
  ON subscription_events FOR SELECT
  USING (
    is_admin() OR
    (is_student() AND student_name = get_student_name())
  );

-- STAP 3: Update RLS policies voor nieuwe kolommen
-- ----------------------------------------------------------------------------

-- De bestaande RLS policies op student_profiles dekken al de nieuwe kolommen
-- Geen extra policies nodig

-- ============================================================================
-- VERIFICATIE
-- ============================================================================

-- Check of alle kolommen zijn toegevoegd
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'student_profiles'
  AND column_name LIKE '%subscription%'
     OR column_name LIKE '%mollie%'
     OR column_name LIKE '%trial%'
ORDER BY ordinal_position;

-- Check of subscription_events tabel bestaat
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'subscription_events';

-- ============================================================================
-- KLAAR!
-- ============================================================================
-- Na het uitvoeren van dit script:
-- - student_profiles heeft subscription tracking kolommen
-- - subscription_events tabel logt alle subscription wijzigingen
-- - RLS policies beschermen subscription data
-- - Database is klaar voor Mollie integratie
-- ============================================================================
