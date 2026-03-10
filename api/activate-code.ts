/**
 * Vercel Serverless Function - Activate Code
 *
 * Laat een ingelogde gebruiker een activatiecode inwisselen voor een abonnement.
 * Vereist Bearer token authenticatie.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './utils/cors.js';
import { checkRateLimit, getClientIP, rateLimits } from './utils/rateLimiter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(`activate-code:${clientIP}`, {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000 // 10 pogingen per 15 minuten
  });
  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', String(rateLimitResult.retryAfter || 60));
    return res.status(429).json({ error: 'Te veel pogingen. Probeer het later opnieuw.' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verifieer gebruiker
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet ingelogd' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user || !user.email) {
      return res.status(401).json({ error: 'Ongeldige sessie' });
    }

    // Valideer input
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Activatiecode is verplicht' });
    }

    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length < 4 || normalizedCode.length > 50) {
      return res.status(400).json({ error: 'Ongeldige activatiecode' });
    }

    // Zoek de activatiecode
    const { data: activationCode, error: codeError } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (codeError) {
      console.error('Error fetching activation code:', codeError);
      return res.status(500).json({ error: 'Database fout' });
    }

    if (!activationCode) {
      return res.status(404).json({ error: 'Activatiecode niet gevonden' });
    }

    // Valideer code status
    if (!activationCode.is_active) {
      return res.status(400).json({ error: 'Deze activatiecode is niet meer actief' });
    }

    if (activationCode.expires_at && new Date(activationCode.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Deze activatiecode is verlopen' });
    }

    if (activationCode.max_uses !== null && activationCode.times_used >= activationCode.max_uses) {
      return res.status(400).json({ error: 'Deze activatiecode is al volledig gebruikt' });
    }

    // Check of deze gebruiker de code al heeft gebruikt
    const { data: existingUsage } = await supabase
      .from('activation_code_usages')
      .select('id')
      .eq('activation_code_id', activationCode.id)
      .eq('user_email', user.email.toLowerCase())
      .maybeSingle();

    if (existingUsage) {
      return res.status(400).json({ error: 'Je hebt deze activatiecode al gebruikt' });
    }

    // Check of gebruiker al een actief abonnement heeft
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_email', user.email.toLowerCase())
      .maybeSingle();

    const now = new Date();

    if (existingSub) {
      // Check of het abonnement nog actief is
      if (existingSub.status === 'active' && existingSub.current_period_end) {
        const periodEnd = new Date(existingSub.current_period_end);
        if (periodEnd > now) {
          return res.status(400).json({
            error: 'Je hebt al een actief abonnement. Je kunt de code gebruiken als je huidige abonnement verlopen is.'
          });
        }
      }
      if (existingSub.status === 'trial' && existingSub.trial_ends_at) {
        const trialEnd = new Date(existingSub.trial_ends_at);
        if (trialEnd > now) {
          return res.status(400).json({
            error: 'Je hebt nog een actieve proefperiode. Je kunt de code gebruiken als je proefperiode verlopen is.'
          });
        }
      }
    }

    // Bereken abonnementsperiode
    const periodStart = now;
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + activationCode.duration_days);

    // Maak of update subscription
    if (existingSub) {
      // Update bestaande subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          plan_type: activationCode.plan_type,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          price_cents: 0, // Gratis via activatiecode
          updated_at: now.toISOString()
        })
        .eq('id', existingSub.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return res.status(500).json({ error: 'Kon abonnement niet bijwerken' });
      }

      // Log het gebruik
      await supabase.from('activation_code_usages').insert({
        activation_code_id: activationCode.id,
        user_email: user.email.toLowerCase(),
        subscription_id: existingSub.id
      });
    } else {
      // Maak nieuwe subscription
      const { data: newSub, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_email: user.email.toLowerCase(),
          user_name: user.user_metadata?.name || user.email.split('@')[0],
          status: 'active',
          plan_type: activationCode.plan_type,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          price_cents: 0
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating subscription:', insertError);
        return res.status(500).json({ error: 'Kon abonnement niet aanmaken' });
      }

      // Log het gebruik
      await supabase.from('activation_code_usages').insert({
        activation_code_id: activationCode.id,
        user_email: user.email.toLowerCase(),
        subscription_id: newSub.id
      });
    }

    // Activeer student profiel
    await supabase
      .from('student_profiles')
      .update({ is_active: true })
      .eq('email', user.email.toLowerCase());

    // Verhoog times_used op de activatiecode
    await supabase
      .from('activation_codes')
      .update({
        times_used: activationCode.times_used + 1
      })
      .eq('id', activationCode.id);

    console.log(`Activation code ${normalizedCode} used by ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Activatiecode succesvol ingewisseld!',
      subscription: {
        status: 'active',
        planType: activationCode.plan_type,
        periodEnd: periodEnd.toISOString(),
        durationDays: activationCode.duration_days
      }
    });

  } catch (error) {
    console.error('Activate code error:', error);
    return res.status(500).json({ error: 'Er ging iets mis bij het activeren' });
  }
}
