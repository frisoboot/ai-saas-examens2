/**
 * Vercel Serverless Function - Admin Subscriptions
 *
 * Haalt alle subscriptions op voor het admin dashboard.
 * Vereist admin authenticatie via email check.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../utils/cors.ts';

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
  // CORS headers
  setCorsHeaders(res, req.headers.origin, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Environment variables check
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Haal Authorization header om user te verifiëren
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    const token = authHeader.substring(7);

    // Verifieer de user via Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Ongeldige sessie' });
    }

    // Check of user admin is
    if (!isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Geen admin rechten' });
    }

    // Haal alle subscriptions op
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_email, status, trial_start, trial_end, created_at')
      .order('created_at', { ascending: false });

    if (subError) {
      console.error('Fout bij ophalen subscriptions:', subError);
      return res.status(500).json({ error: 'Kon subscriptions niet ophalen' });
    }

    return res.status(200).json({
      success: true,
      subscriptions: subscriptions || []
    });

  } catch (error: any) {
    console.error('Admin subscriptions error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis',
      details: error.message
    });
  }
}
