-- Migration: Add quarterly plan_type, support trial subscriptions
-- Date: 2026-02-19
--
-- Wijzigingen:
-- 1. Voeg 'quarterly' toe aan de plan_type CHECK constraint van subscriptions
-- 2. Bestaande 'exam_package' en 'yearly' eenmalige abonnementen blijven geldig (backward compat)
-- 3. Vanaf nu zijn alle nieuwe plannen recurring (monthly / quarterly / yearly)

-- Update plan_type CHECK constraint om quarterly toe te staan
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('individual', 'monthly', 'exam_package', 'yearly', 'quarterly'));

-- Notitie: 'exam_package' blijft in de constraint voor bestaande abonnementen.
-- Nieuwe checkout/resubscribe endpoints accepteren alleen: monthly | quarterly | yearly
