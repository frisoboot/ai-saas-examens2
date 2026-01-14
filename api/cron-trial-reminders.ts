/**
 * Cron Job: Send trial ending reminders
 *
 * This endpoint should be called daily by a cron service
 *
 * What it does:
 * 1. Find all students with 'trial' subscription_status
 * 2. Check if their trial ends in 2 days
 * 3. Send reminder email to upgrade or cancel
 *
 * Vercel Cron configuration (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron-trial-reminders",
 *     "schedule": "0 10 * * *"
 *   }]
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendTrialEndingEmail } from '../services/emailService';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret-change-in-production';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[CRON] Trial reminders check started');

  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.log('[CRON] Unauthorized request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Calculate date range for "2 days from now"
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const twoDaysStart = new Date(twoDaysFromNow);
    twoDaysStart.setHours(0, 0, 0, 0);
    const twoDaysEnd = new Date(twoDaysFromNow);
    twoDaysEnd.setHours(23, 59, 59, 999);

    console.log('[CRON] Looking for trials ending between:', twoDaysStart.toISOString(), 'and', twoDaysEnd.toISOString());

    // Find students whose trial ends in exactly 2 days
    const { data: endingTrials, error: fetchError } = await supabaseAdmin
      .from('student_profiles')
      .select('name, email, trial_ends_at, subscription_status')
      .eq('subscription_status', 'trial')
      .gte('trial_ends_at', twoDaysStart.toISOString())
      .lte('trial_ends_at', twoDaysEnd.toISOString())
      .eq('is_active', true);

    if (fetchError) {
      console.error('[CRON] Error fetching ending trials:', fetchError);
      return res.status(500).json({ error: 'Database error', details: fetchError.message });
    }

    if (!endingTrials || endingTrials.length === 0) {
      console.log('[CRON] No trials ending in 2 days');
      return res.status(200).json({
        success: true,
        message: 'No trials ending soon',
        emailsSent: 0
      });
    }

    console.log(`[CRON] Found ${endingTrials.length} trials ending in 2 days`);

    const results = {
      sent: [] as string[],
      errors: [] as { name: string; error: string }[]
    };

    // Send reminder emails
    for (const student of endingTrials) {
      try {
        console.log(`[CRON] Sending reminder to ${student.email}...`);

        await sendTrialEndingEmail({
          name: student.name,
          email: student.email,
          daysRemaining: 2
        });

        results.sent.push(student.name);
        console.log(`[CRON] ✅ Sent reminder to ${student.name}`);

      } catch (error: any) {
        console.error(`[CRON] Error sending reminder to ${student.name}:`, error);
        results.errors.push({
          name: student.name,
          error: error.message
        });
      }
    }

    console.log(`[CRON] Completed: ${results.sent.length} sent, ${results.errors.length} errors`);

    return res.status(200).json({
      success: true,
      emailsSent: results.sent,
      errors: results.errors,
      total: endingTrials.length
    });

  } catch (error: any) {
    console.error('[CRON] Unexpected error:', error);
    return res.status(500).json({
      error: 'Cron job failed',
      message: error.message
    });
  }
}
