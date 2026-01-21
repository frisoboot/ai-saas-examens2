/**
 * Vercel Cron Job - Trial Reminder
 *
 * Wordt dagelijks uitgevoerd om gebruikers te herinneren
 * dat hun proefperiode morgen eindigt.
 *
 * Selecteert alle subscriptions met status 'trial'
 * waar trial_ends_at tussen nu en morgen ligt.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendTrialEndingEmail } from '../utils/email.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel crons gebruiken GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optionele authenticatie voor cron jobs
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  // Als CRON_SECRET is geconfigureerd, verifieer de request
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Bereken de tijdsperiode:
    // We willen users waarvan trial morgen eindigt
    // Dus trial_ends_at is tussen nu+20 uur en nu+28 uur
    const now = new Date();
    const tomorrow20h = new Date(now.getTime() + 20 * 60 * 60 * 1000);
    const tomorrow28h = new Date(now.getTime() + 28 * 60 * 60 * 1000);

    console.log('Checking for trials ending between:', tomorrow20h.toISOString(), 'and', tomorrow28h.toISOString());

    // Haal alle trial subscriptions op die morgen eindigen
    const { data: expiringTrials, error } = await supabase
      .from('subscriptions')
      .select('user_email, user_name, trial_ends_at')
      .eq('status', 'trial')
      .gte('trial_ends_at', tomorrow20h.toISOString())
      .lte('trial_ends_at', tomorrow28h.toISOString());

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database fout', details: error.message });
    }

    console.log('Found expiring trials:', expiringTrials?.length || 0);

    if (!expiringTrials || expiringTrials.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Geen trials die morgen eindigen',
        emailsSent: 0
      });
    }

    // Verstuur emails
    let emailsSent = 0;
    const errors: string[] = [];

    for (const trial of expiringTrials) {
      try {
        const trialEndsAt = new Date(trial.trial_ends_at);

        const result = await sendTrialEndingEmail(
          trial.user_email,
          trial.user_name || trial.user_email,
          trialEndsAt
        );

        if (result.success) {
          emailsSent++;
          console.log('Trial reminder sent to:', trial.user_email);
        } else {
          errors.push(`${trial.user_email}: ${result.error}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${trial.user_email}: ${errorMsg}`);
        console.error('Error sending to:', trial.user_email, err);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Trial reminders verstuurd`,
      emailsSent,
      totalTrials: expiringTrials.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
