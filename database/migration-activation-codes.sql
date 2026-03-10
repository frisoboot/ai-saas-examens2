-- Migration: Activation Codes
-- Maakt het mogelijk om via activatiecodes een abonnement te activeren
-- zonder betaling via Mollie.

-- Tabel voor activatiecodes
CREATE TABLE IF NOT EXISTS activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- De code zelf (uniek, hoofdletterongevoelig opgeslagen als uppercase)
  code TEXT NOT NULL UNIQUE,

  -- Welk plan wordt geactiveerd
  plan_type TEXT NOT NULL DEFAULT 'monthly' CHECK (plan_type IN ('monthly', 'quarterly', 'yearly')),

  -- Hoe lang het abonnement duurt in dagen (bijv. 30, 90, 365)
  duration_days INTEGER NOT NULL DEFAULT 30,

  -- Hoeveel keer de code gebruikt mag worden (NULL = onbeperkt)
  max_uses INTEGER,

  -- Hoeveel keer de code al is gebruikt
  times_used INTEGER NOT NULL DEFAULT 0,

  -- Of de code actief is (admin kan deactiveren)
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Optionele notitie voor admin (bijv. "School X - 30 leerlingen")
  label TEXT,

  -- Wie de code heeft aangemaakt
  created_by TEXT,

  -- Geldig tot (NULL = geen verloopdatum)
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel voor gebruikshistorie van activatiecodes
CREATE TABLE IF NOT EXISTS activation_code_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Welke code is gebruikt
  activation_code_id UUID NOT NULL REFERENCES activation_codes(id) ON DELETE CASCADE,

  -- Welke gebruiker heeft de code gebruikt
  user_email TEXT NOT NULL,

  -- Welke subscription is aangemaakt/bijgewerkt
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Timestamp
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_active ON activation_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_activation_code_usages_code ON activation_code_usages(activation_code_id);
CREATE INDEX IF NOT EXISTS idx_activation_code_usages_email ON activation_code_usages(user_email);

-- RLS
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_code_usages ENABLE ROW LEVEL SECURITY;

-- Service role kan alles
CREATE POLICY "Service role full access activation_codes" ON activation_codes
    FOR ALL USING (true);

CREATE POLICY "Service role full access activation_code_usages" ON activation_code_usages
    FOR ALL USING (true);

-- Trigger voor updated_at
CREATE TRIGGER update_activation_codes_updated_at BEFORE UPDATE ON activation_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
