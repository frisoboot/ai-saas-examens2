/**
 * Vercel Serverless Function - Admin User Management
 * Beheert studenten via Supabase Auth Admin API
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../utils/cors.js';
import { checkRateLimit, getClientIP, rateLimits } from '../utils/rateLimiter.js';

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
  // CORS headers via shared utility (whitelist-based)
  setCorsHeaders(res, req.headers.origin, 'GET,POST,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
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

    if (authError || !user) {
      return res.status(401).json({ error: 'Ongeldige sessie' });
    }

    if (!isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Geen admin rechten' });
    }

    // Rate limiting - apply after authentication to prevent quota exhaustion by unauthenticated requests
    // Use user.id for per-user quotas instead of IP, preventing one admin from blocking others
    const rateLimitResult = checkRateLimit(`admin:${user.id}`, rateLimits.general);

    if (!rateLimitResult.allowed) {
      res.setHeader('Retry-After', String(rateLimitResult.retryAfter || 60));
      return res.status(429).json({
        error: 'Te veel verzoeken. Probeer het later opnieuw.',
        retryAfter: rateLimitResult.retryAfter
      });
    }

    // GET - Haal alle studenten op
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();

      if (error) {
        return res.status(500).json({ error: 'Kon gebruikers niet ophalen' });
      }

      const students = (data?.users || [])
        .filter((u: any) => !isAdminEmail(u.email))
        .map((u: any) => ({
          id: u.id,
          email: u.email,
          createdAt: u.created_at,
          lastSignIn: u.last_sign_in_at
        }));

      return res.status(200).json({ success: true, users: students });
    }

    // POST - Maak nieuwe student aan
    if (req.method === 'POST') {
      const { email, name, level, password } = req.body;

      if (!email || !name || !level || !password) {
        return res.status(400).json({ error: 'Email, naam, niveau en wachtwoord zijn verplicht' });
      }

      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Wachtwoord moet minimaal 8 tekens zijn' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Ongeldig email formaat' });
      }

      const validLevels = ['VMBO-TL', 'HAVO', 'VWO'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ error: 'Ongeldig niveau' });
      }
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();

      // Maak user aan in Supabase Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: { name: cleanName, level: level }
      });

      if (createError) {
        if (createError.message.includes('already been registered')) {
          return res.status(400).json({ error: 'Dit email adres is al geregistreerd' });
        }
        return res.status(500).json({ error: createError.message });
      }

      if (!newUser?.user) {
        return res.status(500).json({ error: 'Gebruiker niet aangemaakt' });
      }

      // Maak student profiel aan (negeer errors - user bestaat al in Auth)
      try {
        await supabaseAdmin
          .from('student_profiles')
          .upsert({
            email: cleanEmail,
            name: cleanName,
            level: level,
            struggle_points: '',
            is_active: true,
            is_admin: false,
            auth_user_id: newUser.user.id
          }, { onConflict: 'email' });
      } catch (profileError) {
        console.error('Profiel aanmaken warning:', profileError);
        // Ga door - de user is aangemaakt in Auth
      }

      // Maak subscription aan zodat admin-aangemaakte gebruikers direct toegang hebben
      try {
        const now = new Date();
        const farFuture = new Date(now);
        farFuture.setFullYear(farFuture.getFullYear() + 100);

        await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_email: cleanEmail,
            user_name: cleanName,
            status: 'active',
            plan_type: 'individual',
            price_cents: 0,
            current_period_start: now.toISOString(),
            current_period_end: farFuture.toISOString(),
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          }, { onConflict: 'user_email' });
      } catch (subscriptionError) {
        console.error('Subscription aanmaken warning:', subscriptionError);
        // Ga door - de user is aangemaakt in Auth en heeft een profiel
      }

      return res.status(201).json({
        success: true,
        message: 'Student succesvol aangemaakt',
        user: { id: newUser.user.id, email: cleanEmail, name: cleanName, level }
      });
    }

    // DELETE - Verwijder student
    if (req.method === 'DELETE') {
      const { email, userId } = req.body;

      if (!email && !userId) {
        return res.status(400).json({ error: 'Email of userId is verplicht' });
      }

      let userIdToDelete = userId;

      if (!userIdToDelete && email) {
        const { data } = await supabaseAdmin.auth.admin.listUsers();
        const foundUser = (data?.users || []).find((u: any) =>
          u.email?.toLowerCase() === email.toLowerCase()
        );
        if (!foundUser) {
          return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }
        userIdToDelete = foundUser.id;
      }

      // Check of het geen admin is
      const { data: { user: userToDelete } } = await supabaseAdmin.auth.admin.getUserById(userIdToDelete);
      if (userToDelete && isAdminEmail(userToDelete.email)) {
        return res.status(403).json({ error: 'Kan geen admin verwijderen' });
      }

      // Verwijder uit Auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);
      if (deleteError) {
        return res.status(500).json({ error: 'Kon gebruiker niet verwijderen' });
      }

      // Verwijder profiel
      if (email) {
        const { error: deleteProfileError } = await supabaseAdmin
          .from('student_profiles')
          .delete()
          .eq('email', email.toLowerCase());

        if (deleteProfileError) {
          console.error('Fout bij verwijderen profiel:', deleteProfileError);
          return res.status(500).json({ error: 'Kon student profiel niet verwijderen' });
        }
      }

      return res.status(200).json({ success: true, message: 'Student verwijderd' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    return res.status(500).json({ error: 'Er ging iets mis', details: error.message });
  }
}
