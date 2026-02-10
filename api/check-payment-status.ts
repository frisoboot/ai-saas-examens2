/**
 * Vercel Serverless Function - Check Payment Status
 *
 * Checkt de werkelijke status van een Mollie betaling.
 * Gebruikt door de frontend om te bepalen of de betaling geslaagd of mislukt is.
 *
 * Robuuste validatie: checkt DB eerst, maar valt terug op Mollie als DB record ontbreekt.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMollieClient } from '@mollie/api-client';
import { setCorsHeaders } from './utils/cors.js';
import { checkRateLimit, getClientIP, rateLimits } from './utils/rateLimiter.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - ondersteunt productie, Vercel previews, en localhost
  setCorsHeaders(res, req.headers.origin, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting - voorkom payment ID enumeration
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(`payment-status:${clientIP}`, rateLimits.general);

  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', String(rateLimitResult.retryAfter || 60));
    return res.status(429).json({
      error: 'Te veel verzoeken. Probeer het later opnieuw.',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  try {
    const paymentId = req.query.payment_id as string;

    if (!paymentId) {
      return res.status(400).json({ error: 'Missing payment_id parameter' });
    }

    // Basis format-validatie: Mollie payment IDs beginnen met 'tr_'
    if (!paymentId.startsWith('tr_')) {
      return res.status(400).json({
        success: false,
        error: 'Ongeldig betaling ID formaat'
      });
    }

    // Environment variables check
    const mollieApiKey = process.env.MOLLIE_API_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!mollieApiKey) {
      console.error('Missing Mollie API key');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    // Initialize clients
    const mollie = createMollieClient({ apiKey: mollieApiKey });
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check of payment bekend is in ons systeem (pending_registrations of payments)
    const { data: knownPayment } = await supabase
      .from('pending_registrations')
      .select('id, email')
      .eq('mollie_payment_id', paymentId)
      .maybeSingle();

    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('id')
      .eq('mollie_payment_id', paymentId)
      .maybeSingle();

    const isKnownInDb = !!(knownPayment || paymentRecord);

    // Haal payment op bij Mollie - dit valideert ook dat het een echte betaling is
    // We doen dit altijd, ook als DB record ontbreekt (kan door race condition of insert-fout)
    let payment;
    try {
      payment = await mollie.payments.get(paymentId);
    } catch (mollieError) {
      console.error('Mollie payment fetch error:', mollieError);
      return res.status(404).json({
        success: false,
        error: 'Betaling niet gevonden bij de betaalprovider'
      });
    }

    const metadata = payment.metadata as {
      type?: string;
      email?: string;
    } | null;

    // Extra security check: als payment niet in onze DB staat,
    // controleer dat de metadata aangeeft dat het van ons systeem komt
    if (!isKnownInDb && metadata?.type !== 'verification' && metadata?.type !== 'one_time_purchase') {
      console.log('Unknown payment ID without verification metadata:', paymentId);
      return res.status(404).json({
        success: false,
        error: 'Betaling niet gevonden'
      });
    }

    if (!isKnownInDb) {
      console.warn('Payment not found in DB but valid at Mollie (possible insert failure):', paymentId);
    }

    // Bepaal de status
    let status: 'paid' | 'pending' | 'failed' | 'canceled' | 'expired' | 'open';
    let message: string;
    let email: string | null = knownPayment?.email || metadata?.email || null;

    switch (payment.status) {
      case 'paid':
        status = 'paid';
        message = 'Betaling geslaagd! Je account wordt aangemaakt.';
        break;
      case 'pending':
        status = 'pending';
        message = 'Je betaling wordt verwerkt. Dit kan enkele minuten duren.';
        break;
      case 'open':
        status = 'open';
        message = 'Je betaling is nog niet voltooid.';
        break;
      case 'failed':
        status = 'failed';
        message = 'Je betaling is mislukt. Probeer het opnieuw.';
        break;
      case 'canceled':
        status = 'canceled';
        message = 'Je betaling is geannuleerd.';
        break;
      case 'expired':
        status = 'expired';
        message = 'Je betaling is verlopen. Probeer het opnieuw.';
        break;
      default:
        status = 'failed';
        message = 'Er is een onbekende fout opgetreden.';
    }

    // Als betaling geslaagd is, check of account al aangemaakt is
    let accountReady = false;
    if (status === 'paid' && email) {
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      accountReady = !!profile;
    }

    return res.status(200).json({
      success: true,
      status,
      message,
      email,
      accountReady,
      paymentMethod: payment.method || null
    });

  } catch (error) {
    console.error('Check payment status error:', error);

    // Als de payment niet gevonden wordt bij Mollie
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Betaling niet gevonden'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Er ging iets mis bij het ophalen van de betaalstatus'
    });
  }
}
