/**
 * Vercel Serverless Function - Admin Activation Codes
 *
 * CRUD endpoints voor het beheren van activatiecodes.
 * Vereist admin authenticatie.
 *
 * GET    - Lijst alle codes op
 * POST   - Maak nieuwe code(s) aan
 * PATCH  - Update een code (activeren/deactiveren)
 * DELETE - Verwijder een code
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../utils/cors';
import crypto from 'crypto';

// Check of email een admin is
const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
};

/**
 * Genereer een leesbare activatiecode
 * Format: XXXX-XXXX-XXXX (letters en cijfers, geen verwarrende tekens)
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // geen I, O, 0, 1
  const segments = 3;
  const segmentLength = 4;
  const parts: string[] = [];

  for (let s = 0; s < segments; s++) {
    let segment = '';
    for (let i = 0; i < segmentLength; i++) {
      const randomIndex = crypto.randomInt(0, chars.length);
      segment += chars[randomIndex];
    }
    parts.push(segment);
  }

  return parts.join('-');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  setCorsHeaders(res, req.headers.origin, 'GET,POST,PATCH,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Admin authenticatie
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Ongeldige sessie' });
    }

    if (!isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Geen admin rechten' });
    }

    // ========== GET - Lijst alle codes op ==========
    if (req.method === 'GET') {
      const { data: codes, error } = await supabase
        .from('activation_codes')
        .select('*, activation_code_usages(id, user_email, activated_at)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching activation codes:', error);
        return res.status(500).json({ error: 'Kon codes niet ophalen' });
      }

      return res.status(200).json({ success: true, codes });
    }

    // ========== POST - Maak nieuwe code(s) aan ==========
    if (req.method === 'POST') {
      const {
        count = 1,
        plan_type = 'monthly',
        duration_days = 30,
        max_uses = 1,
        label,
        expires_at,
        custom_code
      } = req.body || {};

      // Validatie
      if (!['monthly', 'quarterly', 'yearly'].includes(plan_type)) {
        return res.status(400).json({ error: 'Ongeldig plan type' });
      }

      if (duration_days < 1 || duration_days > 730) {
        return res.status(400).json({ error: 'Duur moet tussen 1 en 730 dagen zijn' });
      }

      if (count < 1 || count > 100) {
        return res.status(400).json({ error: 'Aantal moet tussen 1 en 100 zijn' });
      }

      // Custom code of auto-genereren
      const codesToCreate: string[] = [];

      if (custom_code) {
        const normalized = custom_code.trim().toUpperCase();
        if (normalized.length < 4 || normalized.length > 50) {
          return res.status(400).json({ error: 'Code moet tussen 4 en 50 tekens zijn' });
        }
        codesToCreate.push(normalized);
      } else {
        // Genereer unieke codes
        const existingCodes = new Set<string>();
        for (let i = 0; i < count; i++) {
          let code: string;
          let attempts = 0;
          do {
            code = generateCode();
            attempts++;
          } while (existingCodes.has(code) && attempts < 100);
          existingCodes.add(code);
          codesToCreate.push(code);
        }
      }

      // Voeg toe aan database
      const records = codesToCreate.map(code => ({
        code,
        plan_type,
        duration_days,
        max_uses: max_uses === 0 ? null : max_uses, // 0 = onbeperkt
        label: label || null,
        expires_at: expires_at || null,
        created_by: user.email
      }));

      const { data: insertedCodes, error: insertError } = await supabase
        .from('activation_codes')
        .insert(records)
        .select();

      if (insertError) {
        if (insertError.code === '23505') { // unique violation
          return res.status(400).json({ error: 'Een of meer codes bestaan al' });
        }
        console.error('Error creating activation codes:', insertError);
        return res.status(500).json({ error: 'Kon codes niet aanmaken' });
      }

      return res.status(201).json({
        success: true,
        message: `${insertedCodes.length} code(s) aangemaakt`,
        codes: insertedCodes
      });
    }

    // ========== PATCH - Update een code ==========
    if (req.method === 'PATCH') {
      const { id, is_active, label, max_uses, expires_at } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: 'Code ID is verplicht' });
      }

      const updates: Record<string, unknown> = {};
      if (typeof is_active === 'boolean') updates.is_active = is_active;
      if (label !== undefined) updates.label = label || null;
      if (max_uses !== undefined) updates.max_uses = max_uses === 0 ? null : max_uses;
      if (expires_at !== undefined) updates.expires_at = expires_at || null;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Geen wijzigingen opgegeven' });
      }

      const { data: updated, error: updateError } = await supabase
        .from('activation_codes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating activation code:', updateError);
        return res.status(500).json({ error: 'Kon code niet bijwerken' });
      }

      return res.status(200).json({ success: true, code: updated });
    }

    // ========== DELETE - Verwijder een code ==========
    if (req.method === 'DELETE') {
      const id = req.query.id as string || req.body?.id;

      if (!id) {
        return res.status(400).json({ error: 'Code ID is verplicht' });
      }

      const { error: deleteError } = await supabase
        .from('activation_codes')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting activation code:', deleteError);
        return res.status(500).json({ error: 'Kon code niet verwijderen' });
      }

      return res.status(200).json({ success: true, message: 'Code verwijderd' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Admin activation codes error:', error);
    return res.status(500).json({ error: 'Er ging iets mis' });
  }
}
