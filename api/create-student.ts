/**
 * Create Student API - Simpel en veilig
 *
 * Maakt een nieuw student account aan.
 * Vereist admin token in Authorization header.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './utils/cors';
import { getAdminFromRequest } from './utils/adminAuth';

interface CreateStudentRequest {
  name: string;
  password: string;
  level: 'VMBO-TL' | 'HAVO' | 'VWO';
  strugglePoints?: string;
  email?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verifieer admin token
    const adminUsername = getAdminFromRequest(req);
    if (!adminUsername) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    // Parse request
    const { name, password, level, strugglePoints, email }: CreateStudentRequest = req.body;

    if (!name || !password || !level) {
      return res.status(400).json({ error: 'Naam, wachtwoord en niveau zijn verplicht' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 6 tekens zijn' });
    }

    // Supabase setup
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check of student al bestaat
    const { data: existing } = await supabase
      .from('student_profiles')
      .select('name')
      .eq('name', name)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Student met deze naam bestaat al' });
    }

    // Maak auth email
    const authEmail = `${name.toLowerCase().replace(/\s+/g, '_')}@student.example.com`;

    // Stap 1: Maak Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: authEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        name: name,
        level: level
      }
    });

    if (authError) {
      console.error('Auth create error:', authError);
      return res.status(500).json({ error: `Fout bij aanmaken account: ${authError.message}` });
    }

    // Stap 2: Maak student profiel
    const { error: profileError } = await supabase
      .from('student_profiles')
      .insert({
        name: name,
        level: level,
        struggle_points: strugglePoints || 'Algemene examenstof',
        email: email || authEmail,
        created_by_admin: adminUsername,
        is_active: true,
        auth_user_id: authData.user.id
      });

    if (profileError) {
      // Rollback: verwijder auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      console.error('Profile create error:', profileError);
      return res.status(500).json({ error: `Fout bij aanmaken profiel: ${profileError.message}` });
    }

    return res.status(200).json({
      success: true,
      student: { name, level, email: email || authEmail }
    });

  } catch (error) {
    console.error('Create student error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis bij het aanmaken'
    });
  }
}
