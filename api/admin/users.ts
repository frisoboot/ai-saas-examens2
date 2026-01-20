/**
 * Vercel Serverless Function - Admin User Management
 * Beheert studenten via Supabase Auth Admin API
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Check of email een admin is
const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
};

// Genereer een veilig random wachtwoord
const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers direct in de functie
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

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
      const { email, name, level, customPassword } = req.body;

      if (!email || !name || !level) {
        return res.status(400).json({ error: 'Email, naam en niveau zijn verplicht' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Ongeldig email formaat' });
      }

      const validLevels = ['VMBO-TL', 'HAVO', 'VWO'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ error: 'Ongeldig niveau' });
      }

      // Gebruik custom wachtwoord als meegegeven, anders genereer er een
      let password: string;
      if (customPassword && customPassword.trim().length > 0) {
        if (customPassword.length < 8) {
          return res.status(400).json({ error: 'Wachtwoord moet minimaal 8 tekens zijn' });
        }
        password = customPassword;
      } else {
        password = generatePassword();
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

      return res.status(201).json({
        success: true,
        message: 'Student succesvol aangemaakt',
        user: { id: newUser.user.id, email: cleanEmail, name: cleanName, level },
        temporaryPassword: password
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
