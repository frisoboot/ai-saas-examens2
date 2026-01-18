/**
 * Vercel Serverless Function - Admin User Management
 *
 * Beheert gebruikers (studenten) via Supabase Auth Admin API.
 * Vereist admin authenticatie via email check.
 *
 * Endpoints:
 * - POST: Maak nieuwe student aan
 * - DELETE: Verwijder student (uit Auth + student_profiles)
 * - GET: Haal alle gebruikers op
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../utils/cors';

// Check of email een admin is
const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
};

// Genereer een veilig random wachtwoord (alleen letters en cijfers voor compatibiliteit)
const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  setCorsHeaders(res, req.headers.origin, 'GET,POST,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Environment variables check
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    // Initialize Supabase client with service role key (admin access)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Haal Authorization header om user te verifiëren
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    const token = authHeader.substring(7);

    // Verifieer de user via Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Ongeldige sessie' });
    }

    // Check of user admin is
    if (!isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Geen admin rechten' });
    }

    // ========================================================================
    // GET - Haal alle gebruikers op
    // ========================================================================
    if (req.method === 'GET') {
      const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        console.error('Fout bij ophalen users:', listError);
        return res.status(500).json({ error: 'Kon gebruikers niet ophalen' });
      }

      const users = data?.users || [];

      // Filter alleen non-admin users en map naar simpele structuur
      const students = users
        .filter((u: any) => !isAdminEmail(u.email))
        .map((u: any) => ({
          id: u.id,
          email: u.email,
          createdAt: u.created_at,
          lastSignIn: u.last_sign_in_at
        }));

      return res.status(200).json({
        success: true,
        users: students
      });
    }

    // ========================================================================
    // POST - Maak nieuwe student aan
    // ========================================================================
    if (req.method === 'POST') {
      const { email, name, level } = req.body;

      if (!email || !name || !level) {
        return res.status(400).json({ error: 'Email, naam en niveau zijn verplicht' });
      }

      // Valideer email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Ongeldig email formaat' });
      }

      // Valideer level
      const validLevels = ['VMBO-TL', 'HAVO', 'VWO'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ error: 'Ongeldig niveau. Kies VMBO-TL, HAVO of VWO' });
      }

      // Genereer wachtwoord
      const password = generatePassword();

      // Maak user aan in Supabase Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          name: name.trim(),
          level
        }
      });

      if (createError) {
        console.error('Fout bij aanmaken user:', createError);
        console.error('Email gebruikt:', email.trim().toLowerCase());
        console.error('Password length:', password.length);

        if (createError.message.includes('already been registered')) {
          return res.status(400).json({ error: 'Dit email adres is al geregistreerd' });
        }
        if (createError.message.includes('not match the expected pattern')) {
          return res.status(400).json({
            error: 'Ongeldig email formaat. Gebruik een geldig email adres zoals naam@domein.nl',
            details: createError.message
          });
        }
        return res.status(500).json({ error: 'Kon gebruiker niet aanmaken: ' + createError.message });
      }

      // Maak student profiel aan in database
      const { error: profileError } = await supabaseAdmin
        .from('student_profiles')
        .upsert({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          level,
          struggle_points: '',
          is_active: true
        }, { onConflict: 'email' });

      if (profileError) {
        console.error('Fout bij aanmaken profiel:', profileError);
        // User is aangemaakt maar profiel niet - geen rollback voor nu
      }

      return res.status(201).json({
        success: true,
        message: 'Student succesvol aangemaakt',
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          name,
          level
        },
        temporaryPassword: password // Toon dit aan admin zodat ze het kunnen delen
      });
    }

    // ========================================================================
    // DELETE - Verwijder student
    // ========================================================================
    if (req.method === 'DELETE') {
      const { email, userId } = req.body;

      if (!email && !userId) {
        return res.status(400).json({ error: 'Email of userId is verplicht' });
      }

      let userIdToDelete = userId;

      // Als alleen email gegeven, zoek userId
      if (!userIdToDelete && email) {
        const { data, error: searchError } = await supabaseAdmin.auth.admin.listUsers();

        if (searchError) {
          return res.status(500).json({ error: 'Kon gebruiker niet vinden' });
        }

        const allUsers = data?.users || [];
        const foundUser = allUsers.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (!foundUser) {
          return res.status(404).json({ error: 'Gebruiker niet gevonden' });
        }

        userIdToDelete = foundUser.id;
      }

      // Voorkom verwijderen van admin
      const { data: { user: userToDelete } } = await supabaseAdmin.auth.admin.getUserById(userIdToDelete);
      if (userToDelete && isAdminEmail(userToDelete.email)) {
        return res.status(403).json({ error: 'Kan geen admin account verwijderen' });
      }

      // Verwijder user uit Supabase Auth
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

      if (deleteAuthError) {
        console.error('Fout bij verwijderen auth user:', deleteAuthError);
        return res.status(500).json({ error: 'Kon gebruiker niet verwijderen uit authenticatie' });
      }

      // Verwijder student profiel uit database
      if (email) {
        const { error: deleteProfileError } = await supabaseAdmin
          .from('student_profiles')
          .delete()
          .eq('email', email);

        if (deleteProfileError) {
          console.error('Fout bij verwijderen profiel:', deleteProfileError);
          // Auth user is verwijderd, profiel niet - geen kritieke fout
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Student succesvol verwijderd'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Admin users error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis',
      details: error.message
    });
  }
}
