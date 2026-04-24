/**
 * Vercel Serverless Function - Register with Activation Code
 *
 * Maakt een nieuw account aan en activeert direct een abonnement via activatiecode.
 * Geen betaling nodig - de activatiecode vervangt de Mollie checkout flow.
 *
 * Flow:
 * 1. Valideer input (email, password, level, code)
 * 2. Controleer activatiecode geldigheid
 * 3. Maak Supabase auth account aan
 * 4. Maak subscription aan
 * 5. Maak student profiel aan
 * 6. Log code gebruik
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './utils/cors.js';
import { checkRateLimit, getClientIP } from './utils/rateLimiter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(`register-code:${clientIP}`, {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000 // 5 pogingen per 15 minuten
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

    // Valideer input
    const { email, password, level, code } = req.body || {};

    if (!email || !password || !level || !code) {
      return res.status(400).json({ error: 'Alle velden zijn verplicht' });
    }

    if (typeof email !== 'string' || typeof password !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ error: 'Ongeldige invoer' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ongeldig e-mailadres' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 8 tekens zijn' });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 1 hoofdletter bevatten' });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 1 kleine letter bevatten' });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 1 cijfer bevatten' });
    }

    if (!['VMBO-TL', 'HAVO', 'VWO'].includes(level)) {
      return res.status(400).json({ error: 'Ongeldig niveau' });
    }

    const normalizedCode = code.trim().toUpperCase().replace(/-/g, '');
    const normalizedEmail = email.trim().toLowerCase();

    // Zoek de activatiecode (match zonder streepjes)
    const { data: allCodes, error: codeError } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('is_active', true);

    if (codeError) {
      console.error('Error fetching activation codes:', codeError);
      return res.status(500).json({ error: 'Database fout' });
    }

    // Zoek code door te matchen zonder streepjes
    const activationCode = allCodes?.find(
      c => c.code.replace(/-/g, '') === normalizedCode
    );

    if (!activationCode) {
      return res.status(404).json({ error: 'Activatiecode niet gevonden of niet actief' });
    }

    // Valideer code status
    if (activationCode.expires_at && new Date(activationCode.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Deze activatiecode is verlopen' });
    }

    if (activationCode.max_uses !== null && activationCode.times_used >= activationCode.max_uses) {
      return res.status(400).json({ error: 'Deze activatiecode is al volledig gebruikt' });
    }

    // Check of email al bestaat als Supabase user
    const { data: existingUsers } = await supabase.auth.admin.listUsers() as { data: { users: Array<{ email?: string }> } | null };
    const emailExists = existingUsers?.users?.some(
      (u: { email?: string }) => u.email?.toLowerCase() === normalizedEmail
    );

    if (emailExists) {
      return res.status(400).json({
        error: 'Dit e-mailadres is al geregistreerd. Log in en gebruik de code via Instellingen.'
      });
    }

    // Maak Supabase auth account aan
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: password,
      email_confirm: true // Auto-confirm, geen verificatie email
    });

    if (authError || !authData.user) {
      console.error('Error creating user:', authError);
      return res.status(500).json({ error: 'Kon account niet aanmaken' });
    }

    const userId = authData.user.id;
    const now = new Date();

    // Bereken abonnementsperiode
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + activationCode.duration_days);

    // Maak subscription aan
    const { data: newSub, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_email: normalizedEmail,
        user_name: normalizedEmail.split('@')[0],
        status: 'active',
        plan_type: activationCode.plan_type,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        price_cents: 0
      })
      .select('id')
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      // Probeer de user te verwijderen als subscription aanmaken mislukt
      await supabase.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Kon abonnement niet aanmaken' });
    }

    // Maak student profiel aan
    const { error: profileError } = await supabase
      .from('student_profiles')
      .insert({
        user_id: userId,
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        level: level,
        is_active: true
      });

    if (profileError) {
      console.error('Error creating student profile:', profileError);
      // Niet fataal - user kan profiel later aanmaken
    }

    // Log het gebruik van de code
    await supabase.from('activation_code_usages').insert({
      activation_code_id: activationCode.id,
      user_email: normalizedEmail,
      subscription_id: newSub.id
    });

    // Verhoog times_used
    await supabase
      .from('activation_codes')
      .update({ times_used: activationCode.times_used + 1 })
      .eq('id', activationCode.id);

    console.log(`New user ${normalizedEmail} registered with activation code ${activationCode.code}`);

    return res.status(201).json({
      success: true,
      message: 'Account aangemaakt en activatiecode geactiveerd!',
      subscription: {
        status: 'active',
        planType: activationCode.plan_type,
        periodEnd: periodEnd.toISOString(),
        durationDays: activationCode.duration_days
      }
    });

  } catch (error) {
    console.error('Register with code error:', error);
    return res.status(500).json({ error: 'Er ging iets mis bij het registreren' });
  }
}
