/**
 * Vercel Serverless Function - Send Exam Motivation Email
 *
 * Stuurt een motiverende email naar de student na het afronden van een examen.
 * Vereist authenticatie via Bearer token.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './utils/cors.js';
import { sendExamMotivationEmail } from './utils/emailService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Ongeldige sessie' });
    }

    const { studentName, subject, score, totalQuestions, level } = req.body || {};

    if (!studentName || !subject || score === undefined || !totalQuestions) {
      return res.status(400).json({ error: 'Missende velden: studentName, subject, score, totalQuestions zijn verplicht' });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'Geen emailadres gevonden voor deze gebruiker' });
    }

    await sendExamMotivationEmail(
      user.email,
      studentName,
      subject,
      Number(score),
      Number(totalQuestions),
      level
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending exam motivation email:', error);
    return res.status(500).json({ error: 'Kon motivatie-email niet versturen' });
  }
}
