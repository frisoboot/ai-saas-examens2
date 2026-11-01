/**
 * Functionele systeemtests voor het admin-paneel (Systeem Status).
 *
 * Waar de basis health-check alleen kijkt of diensten bereikbaar zijn, testen deze
 * checks of de belangrijkste dingen ook echt werken én dicht zitten:
 * - beveiliging: buitenstaanders kunnen geen data lezen/schrijven of AI gebruiken
 * - data: elk account heeft een profiel, geen oude registraties met wachtwoorden
 * - AI: echte (minimale) aanroep naar het model
 * - betalingen: Mollie live/test, webhook bereikbaar
 * - e-mail: Resend-sleutel en domein
 * - opslag: werkbladen publiek downloadbaar
 *
 * Alle tests zijn alleen-lezen (behalve één INSERT-poging met de anon key die hoort te falen).
 */
import type { VercelRequest } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';

export interface SystemTestResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

type Check = () => Promise<SystemTestResult>;

async function timed(name: string, fn: () => Promise<Omit<SystemTestResult, 'name' | 'responseTime'>>): Promise<SystemTestResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return { name, responseTime: Date.now() - start, ...result };
  } catch (error: any) {
    return { name, responseTime: Date.now() - start, status: 'unhealthy', message: `Test faalde: ${error?.message || error}` };
  }
}

function getBaseUrl(req: VercelRequest): string {
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'ai-examentrainer.nl';
  const proto = (req.headers['x-forwarded-proto'] as string) || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

// ---------------------------------------------------------------------------
// 1. Database dicht voor buitenstaanders (anon key)
// ---------------------------------------------------------------------------
function testDatabaseLockedForPublic(): Check {
  return () => timed('Test: Database afgeschermd', async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return { status: 'unknown', message: 'VITE_SUPABASE_ANON_KEY ontbreekt' };

    const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const tables = [
      'activation_codes', 'activation_code_usages', 'student_profiles', 'questions',
      'subscriptions', 'payments', 'pending_registrations', 'exam_results', 'student_progress',
    ];

    const leaking: string[] = [];
    await Promise.all(tables.map(async (table) => {
      const { data } = await anon.from(table).select('*').limit(1);
      if (data && data.length > 0) leaking.push(table);
    }));

    // Schrijfpoging die moet falen
    const { error: insertError } = await anon
      .from('activation_codes')
      .insert({ code: `SYSTEEMTEST-${Date.now()}`, plan_type: 'monthly', duration_days: 1, max_uses: 1 });
    const canWrite = !insertError;
    if (canWrite) {
      // Opruimen als het onverhoopt lukte
      await getAdmin()?.from('activation_codes').delete().like('code', 'SYSTEEMTEST-%');
    }

    if (leaking.length || canWrite) {
      return {
        status: 'unhealthy',
        message: `LEK: buitenstaanders kunnen ${[leaking.length ? `lezen uit ${leaking.join(', ')}` : '', canWrite ? 'activatiecodes aanmaken' : ''].filter(Boolean).join(' en ')}`,
        details: { tabellenGetest: tables.length },
      };
    }
    return {
      status: 'healthy',
      message: 'Buitenstaanders kunnen geen gegevens lezen of activatiecodes aanmaken',
      details: { tabellenGetest: tables.length },
    };
  });
}

// ---------------------------------------------------------------------------
// 2. API-endpoints weigeren niet-ingelogde verzoeken
// ---------------------------------------------------------------------------
function testApiRequiresLogin(baseUrl: string): Check {
  return () => timed('Test: API vereist inlog', async () => {
    const endpoints: Array<{ path: string; method: 'GET' | 'POST' }> = [
      { path: '/api/gemini', method: 'POST' },
      { path: '/api/gemini-stream', method: 'POST' },
      { path: '/api/check-subscription', method: 'GET' },
      { path: '/api/admin/users', method: 'GET' },
      { path: '/api/cancel-subscription', method: 'POST' },
    ];

    const open: string[] = [];
    const results: Record<string, number> = {};
    await Promise.all(endpoints.map(async ({ path, method }) => {
      const r = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? '{}' : undefined,
      });
      results[path.replace('/api/', '')] = r.status;
      // Alleen een JSON-weigering van onze eigen code telt (niet de Vercel-loginpagina van previews)
      const isJson = (r.headers.get('content-type') || '').includes('application/json');
      if (!isJson) {
        throw new Error(`geen JSON-antwoord van ${path} (preview-deploy achter Vercel-login?)`);
      }
      if (r.status !== 401 && r.status !== 403) open.push(`${path} (${r.status})`);
    }));

    if (open.length) {
      return { status: 'unhealthy', message: `Open zonder inlog: ${open.join(', ')}`, details: results };
    }
    return { status: 'healthy', message: `Alle ${endpoints.length} beschermde endpoints weigeren niet-ingelogde verzoeken`, details: results };
  });
}

// ---------------------------------------------------------------------------
// 3. Data-integriteit
// ---------------------------------------------------------------------------
function testDataIntegrity(admin: SupabaseClient): Check {
  return () => timed('Test: Accounts & abonnementen', async () => {
    // Alle auth users ophalen (gepagineerd)
    const emails: string[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      emails.push(...data.users.map(u => (u.email || '').toLowerCase()).filter(Boolean));
      if (data.users.length < 1000) break;
    }

    const { data: profiles, error: pErr } = await admin.from('student_profiles').select('email');
    if (pErr) throw pErr;
    const profileEmails = new Set((profiles || []).map(p => String(p.email).toLowerCase()));
    const withoutProfile = emails.filter(e => !profileEmails.has(e));

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: oldPending } = await admin
      .from('pending_registrations').select('id', { count: 'exact', head: true }).lt('created_at', dayAgo);

    const { data: subs, error: sErr } = await admin
      .from('subscriptions').select('status, trial_ends_at, current_period_end');
    if (sErr) throw sErr;
    const now = Date.now();
    const ts = (d: string | null) => (d ? new Date(d).getTime() : 0);
    const withAccess = (subs || []).filter(s =>
      (s.status === 'trial' && ts(s.trial_ends_at) > now) ||
      (s.status === 'active' && ts(s.current_period_end) > now) ||
      (s.status === 'cancelled' && (ts(s.trial_ends_at) > now || ts(s.current_period_end) > now))
    ).length;

    const problems: string[] = [];
    if (withoutProfile.length) problems.push(`${withoutProfile.length} account(s) zonder profiel`);
    if (oldPending) problems.push(`${oldPending} oude onafgemaakte registratie(s) met wachtwoord`);

    return {
      status: problems.length ? 'degraded' : 'healthy',
      message: problems.length ? problems.join(', ') : 'Elk account heeft een profiel, geen oude registraties',
      details: {
        accounts: emails.length,
        profielen: profileEmails.size,
        abonnementen: subs?.length || 0,
        metToegang: withAccess,
        ...(withoutProfile.length ? { zonderProfiel: withoutProfile.slice(0, 5) } : {}),
      },
    };
  });
}

// ---------------------------------------------------------------------------
// 4. Vragenbank
// ---------------------------------------------------------------------------
function testQuestionBank(admin: SupabaseClient): Check {
  return () => timed('Test: Vragenbank', async () => {
    const { count, error } = await admin.from('questions').select('id', { count: 'exact', head: true });
    if (error) throw error;

    // Haal subject/level op (gepagineerd) voor een overzicht per niveau
    const perLevel: Record<string, number> = {};
    const subjects = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data, error: e } = await admin.from('questions').select('subject, level').range(from, from + 999);
      if (e) throw e;
      (data || []).forEach(q => { perLevel[q.level] = (perLevel[q.level] || 0) + 1; subjects.add(q.subject); });
      if (!data || data.length < 1000) break;
    }

    if (!count) return { status: 'unhealthy', message: 'Geen vragen in de database' };
    return {
      status: 'healthy',
      message: `${count} vragen in ${subjects.size} vakken`,
      details: { ...perLevel, paginering: count > 1000 ? 'actief (>1000)' : 'niet nodig' },
    };
  });
}

// ---------------------------------------------------------------------------
// 5. AI: echte minimale aanroep
// ---------------------------------------------------------------------------
function testAIGeneration(): Check {
  return () => timed('Test: AI-antwoord (Gemini)', async () => {
    if (!process.env.AI_GATEWAY_API_KEY) return { status: 'unhealthy', message: 'AI_GATEWAY_API_KEY ontbreekt' };
    const model = process.env.GEMINI_MODEL || 'google/gemini-3-flash';
    const { text } = await generateText({
      model: gateway(model),
      prompt: 'Antwoord met precies één woord: OK',
      maxOutputTokens: 200, // ruim: Gemini 3 kan denk-tokens gebruiken
    });
    const ok = /ok/i.test(text);
    return {
      status: ok ? 'healthy' : 'degraded',
      message: ok ? 'AI geeft antwoord' : `Onverwacht antwoord: "${text.slice(0, 40)}"`,
      details: { model },
    };
  });
}

// ---------------------------------------------------------------------------
// 6. Betalingen: live/test en webhook bereikbaar
// ---------------------------------------------------------------------------
function testPayments(baseUrl: string): Check {
  return () => timed('Test: Betalingen (Mollie)', async () => {
    const key = process.env.MOLLIE_API_KEY || '';
    if (!key) return { status: 'unhealthy', message: 'MOLLIE_API_KEY ontbreekt' };
    const mode = key.startsWith('live_') ? 'live' : key.startsWith('test_') ? 'test' : 'onbekend';

    // Webhook zonder payment-id moet netjes 400 geven (= functie draait)
    const r = await fetch(`${baseUrl}/api/mollie-webhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    if (!(r.headers.get('content-type') || '').includes('application/json')) {
      return { status: 'unknown', message: 'Webhook niet te testen (preview-deploy achter Vercel-login?)', details: { modus: mode } };
    }
    const webhookOk = r.status === 400;

    const problems: string[] = [];
    if (mode !== 'live') problems.push(`Mollie staat in ${mode}-modus: er worden geen echte betalingen ontvangen`);
    if (!webhookOk) problems.push(`webhook gaf ${r.status} (verwacht 400)`);

    return {
      status: !webhookOk ? 'unhealthy' : problems.length ? 'degraded' : 'healthy',
      message: problems.length ? problems.join('; ') : 'Live-modus, webhook bereikbaar',
      details: { modus: mode, webhook: r.status },
    };
  });
}

// ---------------------------------------------------------------------------
// 7. E-mail (Resend)
// ---------------------------------------------------------------------------
function testEmail(): Check {
  return () => timed('Test: E-mail (Resend)', async () => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { status: 'unhealthy', message: 'RESEND_API_KEY ontbreekt: welkomst- en betaalmails worden niet verstuurd' };

    const from = process.env.RESEND_FROM_EMAIL || 'noreply@ai-examentrainer.nl';
    const fromDomain = (from.match(/@([^>\s]+)/)?.[1] || '').toLowerCase();

    const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } });
    if (r.status === 401 || r.status === 403) {
      // Sleutels met alleen verzendrechten mogen domeinen niet uitlezen
      const body = await r.json().catch(() => ({} as any));
      if (String(body?.name || body?.message || '').includes('restricted')) {
        return { status: 'healthy', message: 'Sleutel geldig (alleen verzendrechten, domein niet te controleren)', details: { afzenderDomein: fromDomain } };
      }
      return { status: 'unhealthy', message: `Resend-sleutel ongeldig (${r.status})` };
    }
    if (!r.ok) return { status: 'degraded', message: `Resend gaf ${r.status}` };

    const data = await r.json();
    const domain = (data?.data || []).find((d: any) => String(d.name).toLowerCase() === fromDomain);
    if (!domain) return { status: 'unhealthy', message: `Afzenderdomein ${fromDomain} niet gevonden in Resend` };
    return {
      status: domain.status === 'verified' ? 'healthy' : 'unhealthy',
      message: domain.status === 'verified' ? `Domein ${fromDomain} geverifieerd` : `Domein ${fromDomain} status: ${domain.status}`,
      details: { afzenderDomein: fromDomain, status: domain.status },
    };
  });
}

// ---------------------------------------------------------------------------
// 8. Opslag: werkbladen downloadbaar
// ---------------------------------------------------------------------------
function testStorageDownload(admin: SupabaseClient): Check {
  return () => timed('Test: Werkbladen downloaden', async () => {
    const { data: files, error } = await admin.storage.from('exam-worksheets').list('', { limit: 1 });
    if (error) throw error;
    if (!files?.length) return { status: 'degraded', message: 'Geen werkbladen in opslag' };

    const { data: urlData } = admin.storage.from('exam-worksheets').getPublicUrl(files[0].name);
    const r = await fetch(urlData.publicUrl, { method: 'HEAD' });
    return {
      status: r.ok ? 'healthy' : 'unhealthy',
      message: r.ok ? 'Werkbladen zijn te downloaden' : `Download gaf ${r.status}`,
      details: { http: r.status },
    };
  });
}

let adminClient: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  if (adminClient) return adminClient;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  adminClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return adminClient;
}

export async function runSystemTests(req: VercelRequest, admin: SupabaseClient): Promise<SystemTestResult[]> {
  adminClient = admin;
  const baseUrl = getBaseUrl(req);
  const checks: Check[] = [
    testDatabaseLockedForPublic(),
    testApiRequiresLogin(baseUrl),
    testDataIntegrity(admin),
    testQuestionBank(admin),
    testAIGeneration(),
    testPayments(baseUrl),
    testEmail(),
    testStorageDownload(admin),
  ];
  return Promise.all(checks.map(c => c()));
}
