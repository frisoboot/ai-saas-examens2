/**
 * Vercel Serverless Function - Admin Feedback Overview
 * Haalt alle platform feedback op (alleen voor admins)
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../utils/cors.js';
import { checkRateLimit, rateLimits } from '../utils/rateLimiter.js';

const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Methode niet toegestaan' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuratie fout' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Verify admin
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Ongeldige sessie' });
  }

  if (!isAdminEmail(user.email)) {
    return res.status(403).json({ error: 'Geen admin rechten' });
  }

  const rateLimitResult = checkRateLimit(`admin:${user.id}`, rateLimits.general);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({ error: 'Te veel verzoeken' });
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const category = req.query.category as string | undefined;

  let query = supabaseAdmin
    .from('user_feedback')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Fout bij ophalen feedback:', error);
    return res.status(500).json({ error: 'Kon feedback niet ophalen' });
  }

  return res.status(200).json({ success: true, feedback: data, total: count });
}
