/**
 * Vercel Serverless Function - Create Checkout
 *
 * Flow:
 * 1. Valideer input en check of email beschikbaar is
 * 2. Maak Mollie customer aan
 * 3. Maak €2 proefperiode-betaling aan (sequenceType first voor mandaat)
 * 4. Sla pending registratie op in database
 * 5. Redirect gebruiker naar Mollie checkout
 * 6. Na succesvolle betaling: webhook activeert account, start 5-daagse trial
 *    en plant recurring abonnement via Mollie subscription
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMollieClient, SequenceType, type Payment } from '@mollie/api-client';
import { setCorsHeaders } from './utils/cors.js';
import { checkRateLimit, getClientIP, rateLimits } from './utils/rateLimiter.js';
import crypto from 'crypto';

/**
 * Versleutel wachtwoord voor tijdelijke opslag
 * Gebruikt AES-256-GCM voor veilige encryptie
 */
function encryptPassword(password: string, secretKey: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Combineer IV + authTag + encrypted data
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

interface CheckoutRequest {
  email: string;
  password: string;
  level: 'VMBO-TL' | 'HAVO' | 'VWO';
  plan?: 'monthly' | 'quarterly' | 'yearly';
}

// Alle plannen starten met €2 proefperiode van 5 dagen (sequenceType first voor mandaat).
// Na de proefperiode wordt automatisch het abonnementsbedrag afgeschreven via Mollie subscription.
const PLAN_CONFIG = {
  monthly: {
    subscriptionAmountCents: 995,
    subscriptionAmountStr: '9.95',
    description: 'AI Examentrainer - 5 dagen proberen (€2), daarna €9,95/maand',
    interval: '1 month',
  },
  quarterly: {
    subscriptionAmountCents: 2495,
    subscriptionAmountStr: '24.95',
    description: 'AI Examentrainer - 5 dagen proberen (€2), daarna €24,95/kwartaal',
    interval: '3 months',
  },
  yearly: {
    subscriptionAmountCents: 7900,
    subscriptionAmountStr: '79.00',
    description: 'AI Examentrainer - 5 dagen proberen (€2), daarna €79,00/jaar',
    interval: '12 months',
  },
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - ondersteunt productie, Vercel previews, en localhost
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting - prevent registration abuse
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(`registration:${clientIP}`, rateLimits.registration);

  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', String(rateLimitResult.retryAfter || 3600));
    return res.status(429).json({
      error: 'Te veel registratiepogingen. Probeer het later opnieuw.',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  try {
    // Environment variables check
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const mollieApiKey = process.env.MOLLIE_API_KEY;
    const appUrl = process.env.VITE_APP_URL || 'https://ai-examentrainer.nl';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    if (!mollieApiKey) {
      console.error('Missing Mollie API key');
      return res.status(500).json({ error: 'Betaalconfiguratie ontbreekt' });
    }

    // Parse request body
    const body: CheckoutRequest = req.body;
    const { email, password, level, plan = 'monthly' } = body;

    // Validatie
    if (!email || !password || !level) {
      return res.status(400).json({ error: 'Alle velden zijn verplicht' });
    }

    // Validate plan
    if (!PLAN_CONFIG[plan]) {
      return res.status(400).json({ error: 'Ongeldig pakket geselecteerd' });
    }

    const planConfig = PLAN_CONFIG[plan];

    // Level validatie
    const validLevels = ['VMBO-TL', 'HAVO', 'VWO'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ error: 'Ongeldig niveau geselecteerd' });
    }

    // Email validatie
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ongeldig email adres' });
    }

    // Password validatie - zelfde eisen als reset pagina
    if (password.length < 8) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 8 tekens zijn' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 1 hoofdletter bevatten' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 1 kleine letter bevatten' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 1 cijfer bevatten' });
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const mollie = createMollieClient({ apiKey: mollieApiKey });

    // Check of email al een actieve subscription heeft
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_email', email.toLowerCase())
      .maybeSingle();

    if (existingSubscription) {
      // Blokkeer alleen als er een actieve trial of actief abonnement is
      if (existingSubscription.status === 'trial') {
        const trialEnd = new Date(existingSubscription.trial_ends_at);
        if (trialEnd > new Date()) {
          return res.status(400).json({
            error: 'Er bestaat al een account met dit e-mailadres met een actief abonnement. Log in met je bestaande account of gebruik "Wachtwoord vergeten" als je je wachtwoord kwijt bent.',
            existingAccount: true
          });
        }
      }
      if (existingSubscription.status === 'active') {
        const periodEnd = existingSubscription.current_period_end
          ? new Date(existingSubscription.current_period_end)
          : null;
        if (periodEnd && periodEnd > new Date()) {
          return res.status(400).json({
            error: 'Er bestaat al een account met dit e-mailadres met een actief abonnement. Log in met je bestaande account of gebruik "Wachtwoord vergeten" als je je wachtwoord kwijt bent.',
            existingAccount: true
          });
        }
      }
      // Verlopen/cancelled/trial_expired/payment_failed → sta her-abonneren toe
      console.log('Existing subscription with status:', existingSubscription.status, '- allowing re-subscription for:', email);
    }

    // Check of er al een bestaand Supabase Auth account is voor dit email
    // Als dat zo is, moet de gebruiker inloggen (of wachtwoord resetten) in plaats van opnieuw registreren
    // Pagineer door alle users om te voorkomen dat accounts op latere pagina's worden gemist
    let existingAuthUser = null;
    const perPage = 1000;
    let page = 1;
    const maxPages = 50; // Safety limit om oneindige loops te voorkomen
    let authLookupFailed = false;

    while (page <= maxPages) {
      const { data: usersPage, error: authListError } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

      if (authListError) {
        console.error('Auth listUsers failed on page', page, ':', authListError.message);
        authLookupFailed = true;
        break;
      }

      const users = usersPage?.users || [];
      const match = users.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase());

      if (match) {
        existingAuthUser = match;
        break;
      }

      // Geen users meer → we hebben alle pagina's doorlopen
      if (users.length < perPage) {
        break;
      }

      page++;
    }

    // Fail closed: als de auth lookup faalde, blokkeer de registratie
    // Dit voorkomt dat een tijdelijke fout leidt tot dubbele accounts
    if (authLookupFailed) {
      return res.status(500).json({
        error: 'Kon niet controleren of er al een account bestaat. Probeer het later opnieuw.'
      });
    }

    if (existingAuthUser) {
      console.log('Existing auth account found for:', email, '- blocking re-registration');
      return res.status(409).json({
        error: 'Er bestaat al een account met dit e-mailadres. Log in met je bestaande account of gebruik "Wachtwoord vergeten" om je wachtwoord te herstellen.',
        existingAccount: true
      });
    }

    // Verwijder oude pending registrations voor dit email
    // Gebruik delete ipv maybeSingle() om meerdere records veilig te verwijderen
    await supabase
      .from('pending_registrations')
      .delete()
      .eq('email', email.toLowerCase());

    // Verwijder ook verlopen 'pending' placeholder records van andere emails
    // die de UNIQUE constraint op mollie_payment_id kunnen blokkeren
    await supabase
      .from('pending_registrations')
      .delete()
      .eq('mollie_payment_id', 'pending')
      .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    // Maak Mollie customer aan (gebruik email als naam)
    const customer = await mollie.customers.create({
      name: email.toLowerCase(),
      email: email.toLowerCase(),
      metadata: {
        level: level
      }
    });

    console.log('Mollie customer created:', customer.id);

    // Versleutel het wachtwoord veilig voor tijdelijke opslag
    // Dit wordt gebruikt om het account aan te maken na succesvolle betaling
    // Het wachtwoord wordt verwijderd na account activatie
    const encryptionKey = process.env.PASSWORD_ENCRYPTION_KEY || mollieApiKey;
    if (!process.env.PASSWORD_ENCRYPTION_KEY) {
      console.warn('PASSWORD_ENCRYPTION_KEY not set - falling back to MOLLIE_API_KEY. Set a dedicated encryption key for production.');
    }
    const encryptedPassword = encryptPassword(password, encryptionKey);

    // Sla pending registration op VOOR de Mollie betaling
    // Dit moet slagen, anders kan check-payment-status de betaling niet traceren
    const { error: pendingError } = await supabase
      .from('pending_registrations')
      .insert({
        email: email.toLowerCase(),
        password_hash: encryptedPassword, // Versleuteld - wordt verwijderd na account activatie
        level: level,
        mollie_customer_id: customer.id,
        mollie_payment_id: 'pending', // Wordt geüpdatet na Mollie payment creatie
        plan_type: plan,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 uur geldig
      });

    if (pendingError) {
      console.error('Pending registration insert failed:', pendingError);
      // Retry eenmaal
      const { error: retryError } = await supabase
        .from('pending_registrations')
        .insert({
          email: email.toLowerCase(),
          password_hash: encryptedPassword,
          level: level,
          mollie_customer_id: customer.id,
          mollie_payment_id: 'pending',
          plan_type: plan,
          status: 'pending',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      if (retryError) {
        console.error('Pending registration retry also failed:', retryError);
        return res.status(500).json({
          error: 'Er ging iets mis bij het voorbereiden van je registratie. Probeer het opnieuw.'
        });
      }
    }

    // Alle plannen: €2 proefperiode met sequenceType first (voor mandaat/recurring)
    // Na 5 dagen start automatisch het recurring abonnement via Mollie
    const paymentParams: Parameters<typeof mollie.payments.create>[0] = {
      amount: {
        currency: 'EUR',
        value: '2.00',
      },
      customerId: customer.id,
      description: planConfig.description,
      redirectUrl: `${appUrl}?payment_callback=true&pid=${customer.id}`,
      webhookUrl: `${appUrl}/api/mollie-webhook`,
      sequenceType: SequenceType.first,
      metadata: {
        type: 'trial',
        plan: plan,
        email: email.toLowerCase(),
        level: level,
        subscriptionAmountCents: planConfig.subscriptionAmountCents,
        trialDays: 5,
      },
    };

    const payment = (await mollie.payments.create(paymentParams)) as Payment;

    console.log('Mollie payment created:', payment.id, 'Status:', payment.status);

    // Update pending registration met het echte Mollie payment ID
    const { error: pidUpdateError } = await supabase
      .from('pending_registrations')
      .update({ mollie_payment_id: payment.id })
      .eq('email', email.toLowerCase())
      .eq('mollie_payment_id', 'pending');

    if (pidUpdateError) {
      console.error('Failed to update pending registration with payment ID:', pidUpdateError);
      // Niet fataal: webhook heeft fallback lookup op email
    }

    // Update redirect URL met payment ID (fallback voor als localStorage niet werkt)
    try {
      await mollie.payments.update(payment.id, {
        redirectUrl: `${appUrl}?payment_callback=true&pid=${payment.id}`
      });
    } catch (updateError) {
      // Als update faalt, werkt de oude redirect nog steeds (localStorage fallback)
      console.warn('Could not update redirect URL with payment ID:', updateError);
    }

    // Return checkout URL en payment ID
    // Payment ID wordt opgeslagen in localStorage EN zit in redirect URL als fallback
    return res.status(200).json({
      success: true,
      checkoutUrl: payment.getCheckoutUrl(),
      paymentId: payment.id,
      message: 'Redirect naar betaalpagina...'
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis bij het starten van de checkout'
    });
  }
}
