/**
 * Vercel Serverless Function - Create Checkout
 *
 * Flow:
 * 1. Valideer input en check of email beschikbaar is
 * 2. Maak Mollie customer aan
 * 3. Maak €1.00 verificatiebetaling aan (creëert mandaat voor toekomstige incasso's)
 * 4. Sla pending registratie op in database
 * 5. Redirect gebruiker naar Mollie checkout
 * 6. Na succesvolle betaling: webhook activeert account en start trial
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
}

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
    const { email, password, level } = body;

    // Validatie
    if (!email || !password || !level) {
      return res.status(400).json({ error: 'Alle velden zijn verplicht' });
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
      .in('status', ['trial', 'active'])
      .maybeSingle();

    if (existingSubscription) {
      if (existingSubscription.status === 'trial') {
        const trialEnd = new Date(existingSubscription.trial_ends_at);
        if (trialEnd > new Date()) {
          return res.status(400).json({
            error: 'Registratie niet mogelijk. Controleer je gegevens of neem contact op.'
          });
        }
      }
      if (existingSubscription.status === 'active') {
        return res.status(400).json({
          error: 'Registratie niet mogelijk. Controleer je gegevens of neem contact op.'
        });
      }
    }

    // Check of er al een pending registration is
    const { data: existingPending } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingPending) {
      // Verwijder oude pending registration
      await supabase
        .from('pending_registrations')
        .delete()
        .eq('id', existingPending.id);
    }

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

    // Maak €1.00 verificatiebetaling aan (first payment voor mandaat)
    // Payment ID wordt meegegeven in de redirect URL als fallback voor localStorage
    const payment = (await mollie.payments.create({
      amount: {
        currency: 'EUR',
        value: '1.00'
      },
      customerId: customer.id,
      sequenceType: SequenceType.first, // Dit creëert een mandaat voor recurring payments
      description: 'AI Examentrainer - Verificatie voor proefperiode',
      redirectUrl: `${appUrl}?payment_callback=true&pid=${customer.id}`,
      webhookUrl: `${appUrl}/api/mollie-webhook`,
      metadata: {
        type: 'verification',
        email: email.toLowerCase(),
        level: level
      }
    })) as Payment;

    console.log('Mollie payment created:', payment.id, 'Status:', payment.status);

    // Update pending registration met het echte Mollie payment ID
    await supabase
      .from('pending_registrations')
      .update({ mollie_payment_id: payment.id })
      .eq('email', email.toLowerCase())
      .eq('mollie_payment_id', 'pending');

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
      error: 'Er ging iets mis bij het starten van de checkout',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
