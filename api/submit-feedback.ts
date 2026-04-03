/**
 * Vercel Serverless Function - Submit User Feedback
 * Slaat platform feedback op van gebruikers (bugs, feature requests, algemeen)
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './utils/cors.js';
import { checkRateLimit, getClientIP, rateLimits } from './utils/rateLimiter.js';

const VALID_CATEGORIES = ['bug', 'feature_request', 'content', 'general'] as const;
type FeedbackCategory = typeof VALID_CATEGORIES[number];

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

  // Rate limiting: max 10 feedback submissions per hour per IP
  const ip = getClientIP(req);
  const rateLimitResult = checkRateLimit(`feedback:${ip}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 });
  if (!rateLimitResult.allowed) {
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' });
  }

  const { message, category, rating, page_context } = req.body || {};

  // Validate required fields
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Bericht is verplicht' });
  }

  if (message.trim().length > 2000) {
    return res.status(400).json({ error: 'Bericht mag maximaal 2000 tekens bevatten' });
  }

  if (category && !VALID_CATEGORIES.includes(category as FeedbackCategory)) {
    return res.status(400).json({ error: 'Ongeldige categorie' });
  }

  if (rating !== undefined && rating !== null && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
    return res.status(400).json({ error: 'Beoordeling moet tussen 1 en 5 zijn' });
  }

  // Try to get the authenticated user (optional)
  let userId: string | null = null;
  let userEmail: string | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const token = authHeader.substring(7);
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        userId = user.id;
        userEmail = user.email || null;
      }
    } catch {
      // Auth is optional, continue without user context
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error } = await supabase.from('user_feedback').insert({
    user_id: userId,
    user_email: userEmail,
    rating: rating ?? null,
    category: category || 'general',
    message: message.trim(),
    page_context: page_context || null,
  });

  if (error) {
    console.error('Fout bij opslaan feedback:', error);
    return res.status(500).json({ error: 'Kon feedback niet opslaan' });
  }

  return res.status(200).json({ success: true });
}
