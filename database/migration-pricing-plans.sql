-- Migration: Add pricing plans support
-- Date: 2026-02-09
-- Description: Adds support for multiple pricing plans (monthly, exam_package, yearly)

-- 1. Update plan_type CHECK constraint on subscriptions to allow new plan types
-- First drop the existing constraint (if it exists)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

-- Add new CHECK constraint that includes all plan types
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('individual', 'monthly', 'exam_package', 'yearly'));

-- 2. Add plan_type column to pending_registrations
ALTER TABLE pending_registrations
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'monthly';
