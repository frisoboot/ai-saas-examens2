import type { VercelRequest } from '@vercel/node';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

/**
 * Shared server-side auth helpers.
 *
 * - getAuthenticatedUser: validates the Supabase JWT from the Authorization header.
 * - hasActiveAccess: same access rules as /api/check-subscription
 *   (trial / active / cancelled-but-still-paid) or admin email.
 */

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient) return adminClient;
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const adminEmails = (process.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

export async function getAuthenticatedUser(req: VercelRequest): Promise<User | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function hasActiveAccess(email: string | undefined | null): Promise<boolean> {
  if (!email) return false;
  if (isAdminEmail(email)) return true;

  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, current_period_end')
    .eq('user_email', email.toLowerCase())
    .maybeSingle();

  if (error || !sub) return false;

  const now = Date.now();
  const trialValid = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() > now : false;
  const periodValid = sub.current_period_end ? new Date(sub.current_period_end).getTime() > now : false;

  if (sub.status === 'trial') return trialValid;
  if (sub.status === 'active') return periodValid;
  if (sub.status === 'cancelled') return trialValid || periodValid;
  return false;
}
