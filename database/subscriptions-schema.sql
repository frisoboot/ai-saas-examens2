-- Subscription Schema voor Mollie betalingen
-- Voer dit script uit in de SQL Editor van je Supabase project

-- Tabel voor subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identificatie (kan student_name zijn of email voor individuele users)
  user_email TEXT NOT NULL UNIQUE,
  user_name TEXT,

  -- Mollie IDs
  mollie_customer_id TEXT,
  mollie_subscription_id TEXT,

  -- Subscription status
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'cancelled', 'expired', 'pending')),

  -- Trial informatie
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,

  -- Subscription data
  plan_type TEXT NOT NULL DEFAULT 'individual' CHECK (plan_type IN ('individual', 'school')),
  price_cents INTEGER NOT NULL DEFAULT 1250, -- €12,50 in centen

  -- Timestamps
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel voor betalingsgeschiedenis
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Mollie payment data
  mollie_payment_id TEXT UNIQUE NOT NULL,

  -- Payment info
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),

  -- Metadata
  description TEXT,
  payment_method TEXT,

  -- Timestamps
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexen voor performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_email ON subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mollie_customer ON subscriptions(mollie_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mollie_subscription ON subscriptions(mollie_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_mollie_id ON payments(mollie_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Trigger voor updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Subscriptions: users kunnen alleen hun eigen subscription zien
CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (true); -- Voor nu publiek, later auth toevoegen

-- Service role kan alles (voor webhooks)
CREATE POLICY "Service role full access subscriptions" ON subscriptions
    FOR ALL USING (true);

CREATE POLICY "Service role full access payments" ON payments
    FOR ALL USING (true);

-- Functie om te checken of een user een actieve subscription heeft
CREATE OR REPLACE FUNCTION has_active_subscription(check_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  sub_record RECORD;
BEGIN
  SELECT * INTO sub_record
  FROM subscriptions
  WHERE user_email = check_email
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check trial
  IF sub_record.status = 'trial' AND sub_record.trial_ends_at > NOW() THEN
    RETURN TRUE;
  END IF;

  -- Check active subscription
  IF sub_record.status = 'active' AND sub_record.current_period_end > NOW() THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PENDING REGISTRATIONS TABLE
-- Tijdelijke opslag voor registraties tijdens Mollie checkout
-- ============================================================================

CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User gegevens (alleen email, geen username meer)
  email TEXT NOT NULL,
  -- SECURITY: password wordt tijdelijk versleuteld opgeslagen en na account activatie verwijderd
  password_hash TEXT,
  level TEXT NOT NULL CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),

  -- Mollie IDs
  mollie_customer_id TEXT,
  mollie_payment_id TEXT UNIQUE,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL -- 24 uur na aanmaken
);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_pending_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_mollie_payment ON pending_registrations(mollie_payment_id);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_registrations(status);
CREATE INDEX IF NOT EXISTS idx_pending_expires ON pending_registrations(expires_at);

-- RLS
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access pending" ON pending_registrations
    FOR ALL USING (true);

-- Automatische cleanup van verlopen registraties (optioneel, kan via cron job)
-- DELETE FROM pending_registrations WHERE expires_at < NOW();

-- Update subscriptions status om 'payment_failed' toe te voegen
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('trial', 'active', 'cancelled', 'expired', 'pending', 'payment_failed'));
