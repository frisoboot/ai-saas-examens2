/**
 * Vercel Serverless Function - Admin Delete User
 *
 * Verwijdert een gebruiker via Supabase Admin API.
 * Vereist admin authenticatie via JWT en email check.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../../utils/cors.ts';

const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
};

const parseBody = (req: VercelRequest): { email?: string } | null => {
  if (!req.body) return null;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return req.body;
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

    if (!isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Geen admin rechten' });
    }

    const body = parseBody(req);
    const email = body?.email?.trim();

    if (!email) {
      return res.status(400).json({ error: 'Email is verplicht' });
    }

    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (listError) {
      console.error('Admin list users error:', listError);
      return res.status(500).json({ error: 'Kon gebruikers niet ophalen' });
    }

    const matchedUser = usersData?.users?.find(
      listUser => listUser.email?.toLowerCase() === email.toLowerCase()
    );

    if (!matchedUser) {
      return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(matchedUser.id);

    if (deleteError) {
      console.error('Admin delete user error:', deleteError);
      return res.status(500).json({ error: deleteError.message || 'Kon gebruiker niet verwijderen' });
    }

    return res.status(200).json({
      success: true,
      userId: matchedUser.id,
      email: matchedUser.email
    });
  } catch (error: any) {
    console.error('Admin delete user error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis',
      details: error.message
    });
  }
}
