/**
 * Vercel Serverless Function - Wachtwoord Resetten
 *
 * Deze functie draait op de server en gebruikt de service role key veilig.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../lib/api-utils/cors';

interface ResetPasswordRequest {
  studentName: string;
  newPassword: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - ondersteunt productie, Vercel previews, en localhost
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

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

    // Environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    // Verifieer dat de caller een admin is
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth verification failed:', authError);
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }

    // Check of user admin is
    const role = user.user_metadata?.role;
    if (role !== 'admin') {
      console.error('User is not admin:', user.id, role);
      return res.status(403).json({ error: 'Forbidden - alleen admins kunnen wachtwoorden resetten' });
    }

    // Parse request body
    const body: ResetPasswordRequest = req.body;
    const { studentName, newPassword } = body;

    // Validatie
    if (!studentName || !newPassword) {
      return res.status(400).json({ error: 'Missende vereiste velden' });
    }

    // Password strength validation (consistent with register-student.ts)
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 8 karakters zijn' });
    }

    // Maak admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Haal student profiel op om auth_user_id te krijgen
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('student_profiles')
      .select('auth_user_id')
      .eq('name', studentName)
      .single();

    if (profileError || !profileData?.auth_user_id) {
      console.error('Student not found:', profileError);
      return res.status(404).json({ error: 'Student niet gevonden' });
    }

    // Update wachtwoord via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profileData.auth_user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error resetting password:', updateError);
      return res.status(500).json({ error: `Error: ${updateError.message}` });
    }

    console.log('Password reset successful for:', studentName);

    // Success!
    return res.status(200).json({
      success: true,
      message: 'Wachtwoord succesvol gereset'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis bij het resetten van het wachtwoord',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
