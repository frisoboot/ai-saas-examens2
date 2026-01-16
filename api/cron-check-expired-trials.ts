/**
 * Cron Job: Check for expired trials and deactivate accounts
 *
 * This endpoint should be called daily by a cron service (e.g., Vercel Cron, GitHub Actions)
 *
 * What it does:
 * 1. Find all students with 'trial' subscription_status
 * 2. Check if their trial has expired (trial_end_date < today)
 * 3. Deactivate accounts that haven't upgraded to paid
 * 4. Send trial expired email notification
 *
 * Vercel Cron configuration (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron-check-expired-trials",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendTrialExpiredEmail } from '../services/emailService';
import { secureCompare } from './utils/securityUtils';
import { AuditLogger } from './utils/auditLogger';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Simple auth check - require a secret token for cron jobs
// SECURITY: No default fallback - CRON_SECRET must be configured
const CRON_SECRET = process.env.CRON_SECRET;
if (!CRON_SECRET) {
  console.error('CRITICAL: CRON_SECRET environment variable not configured');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[CRON] Expired trials check started');

  // Verify cron secret - must be configured
  if (!CRON_SECRET) {
    console.error('[CRON] CRON_SECRET not configured - rejecting request');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const authHeader = req.headers.authorization || '';
  const expectedHeader = `Bearer ${CRON_SECRET}`;

  // SECURITY: Use timing-safe comparison to prevent timing attacks
  if (!secureCompare(authHeader, expectedHeader)) {
    console.log('[CRON] Unauthorized request');
    AuditLogger.securityAlert('Unauthorized cron request to check-expired-trials', {
      providedHeader: authHeader.substring(0, 20) + '...'
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString();

    // Find students with expired trials
    const { data: expiredTrials, error: fetchError } = await supabaseAdmin
      .from('student_profiles')
      .select('name, email, trial_ends_at, subscription_status')
      .eq('subscription_status', 'trial')
      .lt('trial_ends_at', today)
      .eq('is_active', true);

    if (fetchError) {
      console.error('[CRON] Error fetching expired trials:', fetchError);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      console.log('[CRON] No expired trials found');
      return res.status(200).json({
        success: true,
        message: 'No expired trials',
        deactivated: 0
      });
    }

    console.log(`[CRON] Found ${expiredTrials.length} expired trials`);

    const results = {
      deactivated: [] as string[],
      errors: [] as { name: string; error: string }[]
    };

    // Process each expired trial
    for (const student of expiredTrials) {
      try {
        console.log(`[CRON] Deactivating ${student.name}...`);

        // Deactivate the account
        const { error: updateError } = await supabaseAdmin
          .from('student_profiles')
          .update({
            is_active: false,
            subscription_status: 'expired'
          })
          .eq('name', student.name);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        // Send trial expired email (non-blocking)
        sendTrialExpiredEmail({
          name: student.name,
          email: student.email
        }).catch(error => {
          console.error(`[CRON] Failed to send expired email to ${student.email}:`, error);
        });

        results.deactivated.push(student.name);
        console.log(`[CRON] ✅ Deactivated ${student.name}`);

      } catch (error: any) {
        console.error(`[CRON] Error deactivating ${student.name}:`, error);
        results.errors.push({
          name: student.name,
          error: error.message
        });
      }
    }

    console.log(`[CRON] Completed: ${results.deactivated.length} deactivated, ${results.errors.length} errors`);

    // Audit log the cron execution
    AuditLogger.cronJobExecuted('check-expired-trials', true, {
      deactivated: results.deactivated.length,
      errors: results.errors.length,
      total: expiredTrials.length
    });

    return res.status(200).json({
      success: true,
      deactivated: results.deactivated,
      errors: results.errors,
      total: expiredTrials.length
    });

  } catch (error: any) {
    console.error('[CRON] Unexpected error:', error);

    // Audit log the failure
    AuditLogger.cronJobExecuted('check-expired-trials', false, undefined, error.message);

    return res.status(500).json({
      error: 'Cron job failed',
      message: error.message
    });
  }
}
