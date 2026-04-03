/**
 * Vercel Serverless Function - Admin API Usage Stats
 * Geeft inzicht in het verbruik van AI API calls
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
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
  setCorsHeaders(res, req.headers.origin, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuratie fout' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Verifieer admin
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user || !isAdminEmail(user.email)) {
    return res.status(403).json({ error: 'Geen toegang' });
  }

  try {
    // Bepaal periode op basis van query param (standaard: 30 dagen)
    const days = Math.min(parseInt(String(req.query.days || '30'), 10) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await supabaseAdmin
      .from('api_usage_logs')
      .select('action, model, user_id, subject, level, duration_ms, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) throw error;

    const logs = rows || [];

    // Totalen
    const totalCalls = logs.length;
    const avgDuration = totalCalls > 0
      ? Math.round(logs.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / totalCalls)
      : 0;

    // Per actie
    const byAction: Record<string, number> = {};
    for (const row of logs) {
      byAction[row.action] = (byAction[row.action] || 0) + 1;
    }

    // Per model
    const byModel: Record<string, number> = {};
    for (const row of logs) {
      const shortModel = row.model?.split('/').pop() || row.model || 'onbekend';
      byModel[shortModel] = (byModel[shortModel] || 0) + 1;
    }

    // Per dag (laatste 30 dagen max voor grafiek)
    const byDay: Record<string, number> = {};
    for (const row of logs) {
      const day = row.created_at?.substring(0, 10) || 'onbekend';
      byDay[day] = (byDay[day] || 0) + 1;
    }

    // Unieke gebruikers
    const uniqueUsers = new Set(logs.map(r => r.user_id).filter(Boolean)).size;

    // Top vakken
    const bySubject: Record<string, number> = {};
    for (const row of logs) {
      if (row.subject) {
        bySubject[row.subject] = (bySubject[row.subject] || 0) + 1;
      }
    }

    return res.status(200).json({
      success: true,
      period_days: days,
      total_calls: totalCalls,
      unique_users: uniqueUsers,
      avg_duration_ms: avgDuration,
      by_action: byAction,
      by_model: byModel,
      by_day: byDay,
      by_subject: bySubject,
    });
  } catch (error: any) {
    console.error('[Usage API] Error:', error.message);
    return res.status(500).json({ error: 'Kon gebruiksdata niet ophalen' });
  }
}
