/**
 * Delete Student API - Simpel en veilig
 *
 * Verwijdert een student volledig uit het systeem.
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

    const { studentName } = req.body;

    if (!studentName) {
      return res.status(400).json({ error: 'Studentnaam is verplicht' });
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

    if (fetchError) {
      console.error('Fetch student error:', fetchError);
      return res.status(500).json({ error: 'Fout bij ophalen student' });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student niet gevonden' });
    }

    // Verwijder gerelateerde data (errors negeren, niet kritisch)
    await supabase.from('exam_results').delete().eq('student_name', studentName);
    await supabase.from('student_progress').delete().eq('student_name', studentName);
    await supabase.from('flashcard_progress').delete().eq('student_name', studentName);

    // Verwijder student profiel
    const { error: deleteError } = await supabase
      .from('student_profiles')
      .delete()
      .eq('name', studentName);

    if (deleteError) {
      console.error('Delete profile error:', deleteError);
      return res.status(500).json({ error: 'Fout bij verwijderen profiel' });
    }

    // Verwijder auth user (als die bestaat)
    if (student.auth_user_id) {
      await supabase.auth.admin.deleteUser(student.auth_user_id);
    }

    return res.status(200).json({
      success: true,
      message: `Student ${studentName} verwijderd`
    });

  } catch (error) {
    console.error('Delete student error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis bij het verwijderen'
    });
  }
}
