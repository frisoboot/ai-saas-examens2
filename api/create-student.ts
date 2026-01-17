/**
 * Vercel Serverless Function - Student Aanmaken
 *
 * Deze functie draait op de server en gebruikt de service role key veilig.
 * De service role key is NIET meer zichtbaar in de browser!
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface CreateStudentRequest {
  adminUsername: string;
  name: string;
  password: string;
  level: 'VMBO-TL' | 'HAVO' | 'VWO';
  strugglePoints: string;
  email?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - restrict to allowed origins
  const allowedOrigins = [
    process.env.VITE_APP_URL,
    'http://localhost:5173',
    'http://localhost:3000'
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  // In production without matching origin, no CORS header is set (request blocked)

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Alleen POST requests toestaan
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Haal auth token uit request header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - geen token' });
    }

    const token = authHeader.substring(7);

    // Verifieer dat de caller een admin is
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Let op: geen VITE_ prefix!

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    // Maak client met anon key om token te verifiëren
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Verifieer token en haal user data op
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth verification failed:', authError);
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }

    // Check of user admin is
    const role = user.user_metadata?.role;
    if (role !== 'admin') {
      console.error('User is not admin:', user.id, role);
      return res.status(403).json({ error: 'Forbidden - alleen admins kunnen studenten aanmaken' });
    }

    // Parse request body
    const body: CreateStudentRequest = req.body;
    const { adminUsername, name, password, level, strugglePoints, email } = body;

    // Validatie
    if (!name || !password || !level || !strugglePoints) {
      return res.status(400).json({ error: 'Missende vereiste velden' });
    }

    // Maak admin client met service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check of student al bestaat
    const { data: existingStudent } = await supabaseAdmin
      .from('student_profiles')
      .select('name')
      .eq('name', name)
      .maybeSingle();

    if (existingStudent) {
      return res.status(409).json({ error: 'Student met deze naam bestaat al' });
    }

    // Maak auth email voor student
    const authEmail = `${name.toLowerCase().replace(/\s+/g, '_')}@student.local`;

    // Stap 1: Maak Supabase Auth user aan
    const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
        name: name,
        level: level,
        created_by: adminUsername
      }
    });

    if (authCreateError) {
      console.error('Error creating auth user:', authCreateError);
      return res.status(500).json({ error: `Auth error: ${authCreateError.message}` });
    }

    console.log('Auth user created:', authData.user.id);

    // Stap 2: Maak student profiel in database
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('student_profiles')
      .insert({
        name: name,
        level: level,
        struggle_points: strugglePoints,
        email: email || authEmail,
        created_by_admin: adminUsername,
        is_active: true,
        auth_user_id: authData.user.id
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating student profile:', profileError);
      // Rollback: verwijder auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: `Database error: ${profileError.message}` });
    }

    console.log('Student profile created:', profileData);

    // Success!
    return res.status(200).json({
      success: true,
      student: {
        name: profileData.name,
        level: profileData.level,
        email: profileData.email
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis bij het aanmaken van de student',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
