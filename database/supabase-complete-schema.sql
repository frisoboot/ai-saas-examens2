-- ============================================================================
-- COMPLEET SUPABASE SCHEMA VOOR AI EXAMENTRAINER
-- ============================================================================
-- Voer dit script uit in de SQL Editor van een NIEUW Supabase project
-- Dit bevat alle tabellen met de juiste configuratie
-- ============================================================================

-- ============================================================================
-- STAP 1: HELPER FUNCTIES
-- ============================================================================

-- Functie om updated_at automatisch bij te werken
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- STAP 2: QUESTIONS TABEL
-- ============================================================================

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('MULTIPLE_CHOICE', 'OPEN')),
  subject TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),
  text TEXT NOT NULL,
  context_text TEXT,
  image_url TEXT,
  source TEXT,
  options JSONB,
  correct_index INTEGER,
  model_answer TEXT,
  exam_year INTEGER,
  exam_type TEXT DEFAULT 'practice',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_level ON questions(level);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_year_subject ON questions(exam_year, subject, level);
CREATE INDEX IF NOT EXISTS idx_questions_exam_type ON questions(exam_type);

-- Trigger
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STAP 3: STUDENT PROFILES TABEL (GEFIXTE VERSIE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_profiles (
  name TEXT PRIMARY KEY,
  email TEXT UNIQUE,                    -- UNIQUE voor admin user management
  password TEXT DEFAULT '',             -- Optioneel (was NOT NULL, nu nullable)
  password_hash TEXT,
  level TEXT NOT NULL CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),
  struggle_points TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by_admin TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON student_profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_profiles_active ON student_profiles(is_active);

-- Trigger
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STAP 4: EXAM RESULTS TABEL
-- ============================================================================

CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  answers JSONB NOT NULL,
  exam_year INTEGER,
  exam_type TEXT,
  duration_seconds INTEGER,
  level TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_name);
CREATE INDEX IF NOT EXISTS idx_exam_results_subject ON exam_results(subject);
CREATE INDEX IF NOT EXISTS idx_exam_results_date ON exam_results(date);
CREATE INDEX IF NOT EXISTS idx_results_year ON exam_results(exam_year, student_name);
CREATE INDEX IF NOT EXISTS idx_results_exam_type ON exam_results(exam_type);

-- ============================================================================
-- STAP 5: STUDENT PROGRESS TABEL
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_progress (
  id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  total_exams_taken INTEGER DEFAULT 0,
  total_questions_answered INTEGER DEFAULT 0,
  total_correct_answers INTEGER DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0.0,
  last_exam_date TIMESTAMP WITH TIME ZONE,
  weakest_topics JSONB,
  improvement_rate DECIMAL(5,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_name, subject)
);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_progress_student ON student_progress(student_name);
CREATE INDEX IF NOT EXISTS idx_progress_subject ON student_progress(subject);
CREATE INDEX IF NOT EXISTS idx_progress_last_exam ON student_progress(last_exam_date DESC);

-- Trigger
CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON student_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STAP 6: IMPORT HISTORY TABEL
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_history (
  id TEXT PRIMARY KEY,
  admin_username TEXT NOT NULL,
  import_type TEXT NOT NULL,
  file_name TEXT,
  questions_imported INTEGER DEFAULT 0,
  questions_failed INTEGER DEFAULT 0,
  error_log JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_history_admin ON import_history(admin_username);
CREATE INDEX IF NOT EXISTS idx_import_history_date ON import_history(created_at DESC);

-- ============================================================================
-- STAP 7: SUBSCRIPTIONS TABEL
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  user_name TEXT,
  mollie_customer_id TEXT,
  mollie_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'cancelled', 'expired', 'pending', 'payment_failed')),
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  plan_type TEXT NOT NULL DEFAULT 'individual' CHECK (plan_type IN ('individual', 'school')),
  price_cents INTEGER NOT NULL DEFAULT 1250,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_email ON subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mollie_customer ON subscriptions(mollie_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_mollie_subscription ON subscriptions(mollie_subscription_id);

-- Trigger
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STAP 8: PAYMENTS TABEL
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  mollie_payment_id TEXT UNIQUE NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'expired', 'refunded')),
  description TEXT,
  payment_method TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_mollie_id ON payments(mollie_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================================
-- STAP 9: PENDING REGISTRATIONS TABEL
-- ============================================================================

CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('VMBO-TL', 'HAVO', 'VWO')),
  mollie_customer_id TEXT,
  mollie_payment_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_pending_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_username ON pending_registrations(username);
CREATE INDEX IF NOT EXISTS idx_pending_mollie_payment ON pending_registrations(mollie_payment_id);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_registrations(status);
CREATE INDEX IF NOT EXISTS idx_pending_expires ON pending_registrations(expires_at);

-- ============================================================================
-- STAP 10: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS op alle tabellen
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STAP 11: RLS POLICIES
-- ============================================================================

-- QUESTIONS: Volledige toegang
CREATE POLICY "questions_select" ON questions FOR SELECT USING (true);
CREATE POLICY "questions_insert" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "questions_update" ON questions FOR UPDATE USING (true);
CREATE POLICY "questions_delete" ON questions FOR DELETE USING (true);

-- STUDENT_PROFILES: Volledige toegang (inclusief DELETE!)
CREATE POLICY "student_profiles_select" ON student_profiles FOR SELECT USING (true);
CREATE POLICY "student_profiles_insert" ON student_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "student_profiles_update" ON student_profiles FOR UPDATE USING (true);
CREATE POLICY "student_profiles_delete" ON student_profiles FOR DELETE USING (true);

-- EXAM_RESULTS: Lezen en schrijven
CREATE POLICY "exam_results_select" ON exam_results FOR SELECT USING (true);
CREATE POLICY "exam_results_insert" ON exam_results FOR INSERT WITH CHECK (true);

-- STUDENT_PROGRESS: Volledige toegang
CREATE POLICY "student_progress_select" ON student_progress FOR SELECT USING (true);
CREATE POLICY "student_progress_insert" ON student_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "student_progress_update" ON student_progress FOR UPDATE USING (true);

-- IMPORT_HISTORY: Volledige toegang
CREATE POLICY "import_history_all" ON import_history FOR ALL USING (true);

-- SUBSCRIPTIONS: Volledige toegang
CREATE POLICY "subscriptions_all" ON subscriptions FOR ALL USING (true);

-- PAYMENTS: Volledige toegang
CREATE POLICY "payments_all" ON payments FOR ALL USING (true);

-- PENDING_REGISTRATIONS: Volledige toegang
CREATE POLICY "pending_registrations_all" ON pending_registrations FOR ALL USING (true);

-- ============================================================================
-- STAP 12: HELPER FUNCTIES
-- ============================================================================

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
-- KLAAR!
-- ============================================================================
-- Je database is nu klaar voor gebruik.
-- Admin gebruikers worden bepaald door de VITE_ADMIN_EMAILS environment variable.
-- ============================================================================
