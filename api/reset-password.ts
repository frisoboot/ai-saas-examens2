/**
 * Reset Password API - Simpel en veilig
 *
 * Reset het wachtwoord van een student.
 * Vereist admin token in Authorization header.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './utils/cors';
import { getAdminFromRequest } from './utils/adminAuth';

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

    const { studentName, newPassword } = req.body;

    if (!studentName || !newPassword) {
      return res.status(400).json({ error: 'Studentnaam en nieuw wachtwoord zijn verplicht' });
    }

    if (newPassword.length < 6) {
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

    // Haal student profiel op
    const { data: student, error: fetchError } = await supabase
      .from('student_profiles')
      .select('auth_user_id')
      .eq('name', studentName)
      .maybeSingle();

    if (fetchError || !student?.auth_user_id) {
      return res.status(404).json({ error: 'Student niet gevonden' });
    }

    // Update wachtwoord
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      student.auth_user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Update password error:', updateError);
      return res.status(500).json({ error: 'Fout bij resetten wachtwoord' });
    }

    return res.status(200).json({
      success: true,
      message: 'Wachtwoord gereset'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis'
    });
  }
}
