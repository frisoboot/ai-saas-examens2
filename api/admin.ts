/**
 * Admin API - Gecombineerde endpoint voor alle admin operaties
 *
 * Actions:
 * - login: Admin login
 * - create-student: Student aanmaken
 * - delete-student: Student verwijderen
 * - reset-password: Wachtwoord resetten
 */

import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// CORS & Rate Limiting
// ============================================================================

function setCorsHeaders(res: VercelResponse, origin: string | undefined): void {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ip?.trim() || 'unknown';
  }
  return 'unknown';
}

// ============================================================================
// Admin Token Management
// ============================================================================

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

function generateAdminToken(username: string): string {
  const secret = process.env.ADMIN_PASSWORD!;
  const timestamp = Date.now();
  const payload = `${username}:${timestamp}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

function verifyAdminToken(token: string): string | null {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return null;

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username, timestampStr, signature] = decoded.split(':');
    const timestamp = parseInt(timestampStr, 10);

    if (Date.now() - timestamp > TOKEN_EXPIRY_MS) return null;

    const expectedSig = createHmac('sha256', secret)
      .update(`${username}:${timestamp}`)
      .digest('hex');

    return signature === expectedSig ? username : null;
  } catch {
    return null;
  }
}

function getAdminFromRequest(req: VercelRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyAdminToken(auth.substring(7));
}

// ============================================================================
// Supabase Helper
// ============================================================================

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// ============================================================================
// Action Handlers
// ============================================================================

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  const clientIP = getClientIP(req);
  if (!checkRateLimit(`login:${clientIP}`, 5, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Te veel pogingen. Wacht 15 minuten.' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Gebruikersnaam en wachtwoord verplicht' });
  }

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || adminPassword.length < 12) {
    return res.status(500).json({ error: 'Server configuratie fout' });
  }

  if (username === adminUsername && password === adminPassword) {
    return res.status(200).json({
      success: true,
      token: generateAdminToken(username),
      admin: { username }
    });
  }

  await new Promise(r => setTimeout(r, 100));
  return res.status(401).json({ error: 'Gebruikersnaam of wachtwoord onjuist' });
}

async function handleCreateStudent(req: VercelRequest, res: VercelResponse) {
  const adminUsername = getAdminFromRequest(req);
  if (!adminUsername) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
  }

  const { name, password, level, strugglePoints, email } = req.body;

  if (!name || !password || !level) {
    return res.status(400).json({ error: 'Naam, wachtwoord en niveau verplicht' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Wachtwoord minimaal 6 tekens' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuratie fout' });
  }

  // Check bestaande student
  const { data: existing } = await supabase
    .from('student_profiles')
    .select('name')
    .eq('name', name)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'Student bestaat al' });
  }

  const authEmail = `${name.toLowerCase().replace(/\s+/g, '_')}@student.example.com`;

  // Maak auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { role: 'student', name, level }
  });

  if (authError) {
    return res.status(500).json({ error: authError.message });
  }

  // Maak profiel
  const { error: profileError } = await supabase
    .from('student_profiles')
    .insert({
      name,
      level,
      struggle_points: strugglePoints || 'Algemene examenstof',
      email: email || authEmail,
      created_by_admin: adminUsername,
      is_active: true,
      auth_user_id: authData.user.id
    });

  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return res.status(500).json({ error: profileError.message });
  }

  return res.status(200).json({ success: true, student: { name, level } });
}

async function handleDeleteStudent(req: VercelRequest, res: VercelResponse) {
  const adminUsername = getAdminFromRequest(req);
  if (!adminUsername) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
  }

  const { studentName } = req.body;
  if (!studentName) {
    return res.status(400).json({ error: 'Studentnaam verplicht' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuratie fout' });
  }

  const { data: student } = await supabase
    .from('student_profiles')
    .select('auth_user_id')
    .eq('name', studentName)
    .maybeSingle();

  if (!student) {
    return res.status(404).json({ error: 'Student niet gevonden' });
  }

  // Verwijder gerelateerde data
  await supabase.from('exam_results').delete().eq('student_name', studentName);
  await supabase.from('student_progress').delete().eq('student_name', studentName);
  await supabase.from('flashcard_progress').delete().eq('student_name', studentName);

  // Verwijder profiel
  await supabase.from('student_profiles').delete().eq('name', studentName);

  // Verwijder auth user
  if (student.auth_user_id) {
    await supabase.auth.admin.deleteUser(student.auth_user_id);
  }

  return res.status(200).json({ success: true });
}

async function handleResetPassword(req: VercelRequest, res: VercelResponse) {
  const adminUsername = getAdminFromRequest(req);
  if (!adminUsername) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
  }

  const { studentName, newPassword } = req.body;
  if (!studentName || !newPassword) {
    return res.status(400).json({ error: 'Studentnaam en wachtwoord verplicht' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Wachtwoord minimaal 6 tekens' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuratie fout' });
  }

  const { data: student } = await supabase
    .from('student_profiles')
    .select('auth_user_id')
    .eq('name', studentName)
    .maybeSingle();

  if (!student?.auth_user_id) {
    return res.status(404).json({ error: 'Student niet gevonden' });
  }

  const { error } = await supabase.auth.admin.updateUserById(
    student.auth_user_id,
    { password: newPassword }
  );

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}

async function handleListStudents(req: VercelRequest, res: VercelResponse) {
  const adminUsername = getAdminFromRequest(req);
  if (!adminUsername) {
    return res.status(401).json({ error: 'Niet geautoriseerd' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuratie fout' });
  }

  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .order('name');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, students: data || [] });
}

// ============================================================================
// Main Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  try {
    switch (action) {
      case 'login':
        return handleLogin(req, res);
      case 'list-students':
        return handleListStudents(req, res);
      case 'create-student':
        return handleCreateStudent(req, res);
      case 'delete-student':
        return handleDeleteStudent(req, res);
      case 'reset-password':
        return handleResetPassword(req, res);
      default:
        return res.status(400).json({ error: 'Ongeldige actie' });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ error: 'Er ging iets mis' });
  }
}
