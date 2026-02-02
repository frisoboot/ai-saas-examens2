/**
 * Vercel Serverless Function - Admin Cancel Subscription
 *
 * Annuleert subscriptions voor specifieke emails (admin only).
 * Gebruik: POST met { emails: ["test@example.com", ...] }
 * Of voor enkele: POST met { email: "test@example.com" }
 *
 * Annuleert Mollie subscription indien aanwezig en zet status op 'cancelled'.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMollieClient } from '@mollie/api-client';
import { setCorsHeaders } from '../utils/cors.js';

const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mollieApiKey = process.env.MOLLIE_API_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verifieer admin authenticatie
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Ongeldige sessie' });
    }

    if (!isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Geen admin rechten' });
    }

    // Accepteer zowel { email: "..." } als { emails: ["...", "..."] }
    const { email, emails } = req.body || {};
    const emailList: string[] = emails
      ? emails.map((e: string) => e.trim().toLowerCase())
      : email
        ? [email.trim().toLowerCase()]
        : [];

    if (emailList.length === 0) {
      return res.status(400).json({ error: 'Email of emails is verplicht' });
    }

    // Mollie client (optioneel - alleen nodig als er Mollie subscriptions zijn)
    const mollie = mollieApiKey ? createMollieClient({ apiKey: mollieApiKey }) : null;

    const results: Array<{ email: string; success: boolean; message: string }> = [];

    for (const targetEmail of emailList) {
      try {
        // Haal subscription op
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_email', targetEmail)
          .maybeSingle();

        if (subError || !subscription) {
          results.push({ email: targetEmail, success: false, message: 'Geen subscription gevonden' });
          continue;
        }

        if (subscription.status === 'cancelled') {
          results.push({ email: targetEmail, success: true, message: 'Was al geannuleerd' });
          continue;
        }

        // Cancel Mollie subscription indien aanwezig
        if (mollie && subscription.mollie_subscription_id && subscription.mollie_customer_id) {
          try {
            await mollie.customerSubscriptions.cancel(
              subscription.mollie_subscription_id,
              { customerId: subscription.mollie_customer_id }
            );
          } catch (mollieError: any) {
            console.error(`Mollie cancel fout voor ${targetEmail}:`, mollieError.message);
            // Ga door - subscription kan al geannuleerd zijn bij Mollie
          }
        }

        // Update database status
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .eq('user_email', targetEmail);

        if (updateError) {
          results.push({ email: targetEmail, success: false, message: `Database fout: ${updateError.message}` });
        } else {
          results.push({
            email: targetEmail,
            success: true,
            message: `Geannuleerd (was: ${subscription.status})`
          });
        }
      } catch (err: any) {
        results.push({ email: targetEmail, success: false, message: err.message });
      }
    }

    const allSuccess = results.every(r => r.success);
    return res.status(allSuccess ? 200 : 207).json({
      success: allSuccess,
      results
    });

  } catch (error: any) {
    console.error('Admin cancel subscription error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis',
      details: error.message
    });
  }
}
