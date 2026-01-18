/**
 * Vercel Serverless Function - Admin status check
 *
 * Valideert JWT en retourneert admin status op basis van admin_users tabel.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../utils/cors.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Ongeldige sessie' });
    }

    const { data: adminRecord, error: adminError } = await supabase
      .from('admin_users')
      .select('auth_user_id')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminError) {
      console.error('Fout bij ophalen admin status:', adminError);
      return res.status(500).json({ error: 'Kon admin status niet ophalen' });
    }

    return res.status(200).json({
      isAdmin: Boolean(adminRecord)
    });
  } catch (error: any) {
    console.error('Admin status error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis',
      details: error.message
    });
  }
}
