/**
 * Vercel Serverless Function - Cancel Subscription
 *
 * Annuleert een Mollie subscription.
 * De gebruiker houdt toegang tot het einde van de huidige betaalperiode.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMollieClient } from '@mollie/api-client';
import { setCorsHeaders } from './utils/cors.js';

// Check of email een admin is
const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - ondersteunt productie, Vercel previews, en localhost
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Environment variables check
    const mollieApiKey = process.env.MOLLIE_API_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!mollieApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    // Verifieer authenticatie - gebruiker moet ingelogd zijn
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Ongeldige sessie' });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is verplicht' });
    }

    // Autorisatie: gebruiker mag alleen eigen subscription opzeggen, tenzij admin
    if (user.email?.toLowerCase() !== email.toLowerCase() && !isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Geen rechten om dit abonnement op te zeggen' });
    }

    // Initialize clients
    const mollie = createMollieClient({ apiKey: mollieApiKey });
    const supabase = supabaseAuth;

    // Haal subscription op
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_email', email.toLowerCase())
      .maybeSingle();

    if (error || !subscription) {
      return res.status(404).json({ error: 'Geen abonnement gevonden' });
    }

    // Cancel Mollie subscription indien aanwezig
    if (subscription.mollie_subscription_id && subscription.mollie_customer_id) {
      try {
        await mollie.customerSubscriptions.cancel(
          subscription.mollie_subscription_id,
          { customerId: subscription.mollie_customer_id }
        );
        console.log('Mollie subscription cancelled:', subscription.mollie_subscription_id);
      } catch (mollieError) {
        console.error('Error cancelling Mollie subscription:', mollieError);
        // Continue anyway - subscription might already be cancelled
      }
    }

    // Update database
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('user_email', email.toLowerCase());

    // Bepaal einddatum
    let accessUntil: string | null = null;

    if (subscription.status === 'trial' && subscription.trial_ends_at) {
      accessUntil = subscription.trial_ends_at;
    } else if (subscription.current_period_end) {
      accessUntil = subscription.current_period_end;
    }

    return res.status(200).json({
      success: true,
      message: 'Abonnement opgezegd',
      accessUntil: accessUntil
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis bij het opzeggen'
    });
  }
}
