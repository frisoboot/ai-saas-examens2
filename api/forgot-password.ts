/**
 * Vercel Serverless Function - Forgot Password
 *
 * Genereert een wachtwoord reset link via Supabase Admin API
 * en verstuurt een custom email via Resend.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './utils/cors.js';
import { sendPasswordResetEmail } from './utils/emailService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email adres vereist' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ongeldig email adres' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const appUrl = process.env.VITE_APP_URL || 'https://ai-examentrainer.nl';
    const redirectTo = `${appUrl}/reset-password`;

    // Genereer reset link via Supabase Admin API
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase(),
      options: { redirectTo },
    });

    if (error || !data?.properties?.action_link) {
      // Voor veiligheid: altijd success terugsturen, ook als email niet bestaat
      console.log('Reset link generation skipped (user may not exist):', error?.message);
      return res.status(200).json({ success: true });
    }

    // Stuur custom email via Resend
    try {
      await sendPasswordResetEmail(email.toLowerCase(), data.properties.action_link);
    } catch (emailError) {
      console.error('Fout bij verzenden password reset email:', emailError);
      // Stuur toch success terug - gebruiker hoeft dit niet te weten
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Er ging iets mis' });
  }
}
