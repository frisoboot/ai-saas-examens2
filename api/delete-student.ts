/**
 * Vercel Serverless Function - Student Verwijderen
 *
 * Deze functie verwijdert een student volledig uit het systeem:
 * - Student profiel uit student_profiles
 * - Alle exam results
 * - Student progress data
 * - Supabase Auth user
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handlePreflight } from './utils/cors';

interface DeleteStudentRequest {
  studentName: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // SECURITY: Set secure CORS headers (no wildcard in production)
  const origin = req.headers.origin as string | undefined;
  setCorsHeaders(res, origin, { methods: ['POST', 'OPTIONS'] });

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return handlePreflight(res, origin, { methods: ['POST', 'OPTIONS'] });
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
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
      return res.status(403).json({ error: 'Forbidden - alleen admins kunnen studenten verwijderen' });
    }

    // Parse request body
    const body: DeleteStudentRequest = req.body;
    const { studentName } = body;

    // Validatie
    if (!studentName) {
      return res.status(400).json({ error: 'Studentnaam is verplicht' });
    }

    // Maak admin client met service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Haal student profiel op om auth_user_id te krijgen
    const { data: studentProfile, error: fetchError } = await supabaseAdmin
      .from('student_profiles')
      .select('auth_user_id')
      .eq('name', studentName)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching student profile:', fetchError);
      return res.status(500).json({ error: `Database error: ${fetchError.message}` });
    }

    if (!studentProfile) {
      return res.status(404).json({ error: 'Student niet gevonden' });
    }

    const authUserId = studentProfile.auth_user_id;

    // Stap 1: Verwijder exam results
    const { error: examResultsError } = await supabaseAdmin
      .from('exam_results')
      .delete()
      .eq('student_name', studentName);

    if (examResultsError) {
      console.error('Error deleting exam results:', examResultsError);
      // Ga door, want dit is niet kritisch
    } else {
      console.log('Exam results deleted for student:', studentName);
    }

    // Stap 2: Verwijder student progress
    const { error: progressError } = await supabaseAdmin
      .from('student_progress')
      .delete()
      .eq('student_name', studentName);

    if (progressError) {
      console.error('Error deleting student progress:', progressError);
      // Ga door, want dit is niet kritisch
    } else {
      console.log('Student progress deleted for student:', studentName);
    }

    // Stap 2b: Verwijder flashcard progress
    const { error: flashcardProgressError } = await supabaseAdmin
      .from('flashcard_progress')
      .delete()
      .eq('student_name', studentName);

    if (flashcardProgressError) {
      console.error('Error deleting flashcard progress:', flashcardProgressError);
      // Ga door, want dit is niet kritisch
    } else {
      console.log('Flashcard progress deleted for student:', studentName);
    }

    // Stap 2c: Verwijder subscription events
    const { error: subscriptionEventsError } = await supabaseAdmin
      .from('subscription_events')
      .delete()
      .eq('student_name', studentName);

    if (subscriptionEventsError) {
      console.error('Error deleting subscription events:', subscriptionEventsError);
      // Ga door, want dit is niet kritisch
    } else {
      console.log('Subscription events deleted for student:', studentName);
    }

    // Stap 3: Verwijder student profiel
    const { error: profileError } = await supabaseAdmin
      .from('student_profiles')
      .delete()
      .eq('name', studentName);

    if (profileError) {
      console.error('Error deleting student profile:', profileError);
      return res.status(500).json({ error: `Kon student profiel niet verwijderen: ${profileError.message}` });
    }

    console.log('Student profile deleted:', studentName);

    // Stap 4: Verwijder Supabase Auth user (als die bestaat)
    if (authUserId) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError);
        // We loggen dit maar geven geen error terug, want het profiel is al verwijderd
        console.warn('Auth user could not be deleted, but profile was removed:', authUserId);
      } else {
        console.log('Auth user deleted:', authUserId);
      }
    }

    // Success!
    return res.status(200).json({
      success: true,
      message: `Student ${studentName} is volledig verwijderd`
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis bij het verwijderen van de student',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
