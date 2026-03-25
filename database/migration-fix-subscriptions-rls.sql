-- ============================================================================
-- SECURITY MIGRATION: Fix subscriptions/payments/pending_registrations RLS
-- ============================================================================
-- PROBLEEM: USING (true) policies stonden alle gebruikers toe om
-- betalingsgegevens van andere gebruikers te lezen.
--
-- FIX:
-- 1. subscriptions SELECT: alleen eigen subscription (email match)
-- 2. payments SELECT: alleen eigen betalingen (via subscription ownership)
-- 3. Service role policies: beperkt tot auth.role() = 'service_role'
-- 4. pending_registrations: beperkt tot service_role
-- ============================================================================

-- ============================================================================
-- STAP 1: Verwijder onveilige policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Service role full access subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role full access payments" ON payments;
DROP POLICY IF EXISTS "Service role full access pending" ON pending_registrations;

-- ============================================================================
-- STAP 2: Nieuwe veilige policies voor subscriptions
-- ============================================================================

-- Users kunnen alleen hun eigen subscription zien (email match via JWT)
CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (auth.jwt()->>'email' = user_email);

-- Service role heeft volledige toegang (voor webhooks en admin endpoints)
CREATE POLICY "Service role full access subscriptions" ON subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- STAP 3: Nieuwe veilige policies voor payments
-- ============================================================================

-- Users kunnen alleen hun eigen betalingen zien (via subscription ownership)
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM subscriptions s
            WHERE s.id = payments.subscription_id
            AND s.user_email = auth.jwt()->>'email'
        )
    );

-- Service role heeft volledige toegang
CREATE POLICY "Service role full access payments" ON payments
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- STAP 4: Fix pending_registrations
-- ============================================================================

-- Alleen service role heeft toegang (geen eindgebruikers)
CREATE POLICY "Service role full access pending" ON pending_registrations
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- VERIFICATIE
-- ============================================================================

DO $$
DECLARE
  sub_policies INTEGER;
  pay_policies INTEGER;
  pending_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO sub_policies
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions';

  SELECT COUNT(*) INTO pay_policies
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments';

  SELECT COUNT(*) INTO pending_policies
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pending_registrations';

  RAISE NOTICE '';
  RAISE NOTICE '================================';
  RAISE NOTICE 'SUBSCRIPTIONS RLS SECURITY FIX';
  RAISE NOTICE '================================';
  RAISE NOTICE 'subscriptions policies: % (expected: 2)', sub_policies;
  RAISE NOTICE 'payments policies: % (expected: 2)', pay_policies;
  RAISE NOTICE 'pending_registrations policies: % (expected: 1)', pending_policies;

  IF sub_policies = 2 AND pay_policies = 2 AND pending_policies = 1 THEN
    RAISE NOTICE '✅ ALL POLICIES CORRECTLY APPLIED';
  ELSE
    RAISE NOTICE '⚠️ UNEXPECTED POLICY COUNT - VERIFY MANUALLY';
  END IF;

  RAISE NOTICE '================================';
  RAISE NOTICE '';
END $$;
