/**
 * Vercel Serverless Function - Waitlist Signup
 * Slaat belangstellenden op in de waitlist-tabel. Registratie is gesloten.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './utils/cors.js';
import { checkRateLimit, getClientIP } from './utils/rateLimiter.js';

const VALID_LEVELS = ['VMBO-TL', 'HAVO', 'VWO'] as const;
type Level = typeof VALID_LEVELS[number];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode niet toegestaan' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuratie fout' });
  }

  const ip = getClientIP(req);
  const rateLimitResult = checkRateLimit(`waitlist:${ip}`, { maxRequests: 5, windowMs: 60 * 60 * 1000 });
  if (!rateLimitResult.allowed) {
    return res.status(429).json({ error: 'Te veel aanmeldingen. Probeer het later opnieuw.' });
  }

  const { email, name, level, note, source } = req.body || {};

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return res.status(400).json({ error: 'Vul een geldig e-mailadres in.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (name !== undefined && name !== null && typeof name !== 'string') {
    return res.status(400).json({ error: 'Naam is ongeldig.' });
  }
  const normalizedName = typeof name === 'string' ? name.trim().slice(0, 120) : null;

  let normalizedLevel: Level | null = null;
  if (level !== undefined && level !== null && level !== '') {
    if (typeof level !== 'string' || !VALID_LEVELS.includes(level as Level)) {
      return res.status(400).json({ error: 'Kies een geldig niveau (VMBO-TL, HAVO of VWO).' });
    }
    normalizedLevel = level as Level;
  }

  const normalizedNote = typeof note === 'string' ? note.trim().slice(0, 1000) : null;
  const normalizedSource = typeof source === 'string' ? source.trim().slice(0, 120) : null;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error } = await supabase.from('waitlist').insert({
    email: normalizedEmail,
    name: normalizedName,
    level: normalizedLevel,
    note: normalizedNote,
    source: normalizedSource,
  });

  if (error) {
    // Duplicate email: behave as success so we don't leak membership.
    if (error.code === '23505') {
      return res.status(200).json({ success: true, alreadyOnWaitlist: true });
    }
    console.error('Fout bij opslaan waitlist entry:', error);
    return res.status(500).json({ error: 'Kon je niet toevoegen aan de wachtlijst.' });
  }

  return res.status(200).json({ success: true });
}
