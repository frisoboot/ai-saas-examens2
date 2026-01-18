/**
 * Vercel Serverless Function - Check Payment Status
 *
 * Checkt de werkelijke status van een Mollie betaling.
 * Gebruikt door de frontend om te bepalen of de betaling geslaagd of mislukt is.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMollieClient } from '@mollie/api-client';
import { setCorsHeaders } from './utils/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - ondersteunt productie, Vercel previews, en localhost
  setCorsHeaders(res, req.headers.origin, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const paymentId = req.query.payment_id as string;

    if (!paymentId) {
      return res.status(400).json({ error: 'Missing payment_id parameter' });
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

    // Security: Valideer eerst dat dit een bekende payment is van ons systeem
    // Dit voorkomt dat willekeurige payment IDs kunnen worden opgevraagd
    const { data: knownPayment } = await supabase
      .from('pending_registrations')
      .select('id, email')
      .eq('mollie_payment_id', paymentId)
      .maybeSingle();

    // Als de payment niet in pending_registrations staat, check of er een payment record is
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('id')
      .eq('mollie_payment_id', paymentId)
      .maybeSingle();

    // Payment moet bekend zijn in ons systeem
    if (!knownPayment && !paymentRecord) {
      console.log('Unknown payment ID requested:', paymentId);
      return res.status(404).json({
        success: false,
        error: 'Betaling niet gevonden'
      });
    }

    // Haal payment op bij Mollie
    const payment = await mollie.payments.get(paymentId);

    const metadata = payment.metadata as {
      type?: string;
      username?: string;
      email?: string;
    } | null;

    // Bepaal de status
    let status: 'paid' | 'pending' | 'failed' | 'canceled' | 'expired' | 'open';
    let message: string;
    let username: string | null = metadata?.username || null;

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
    if (status === 'paid' && username) {
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('name')
        .eq('name', username)
        .maybeSingle();

      accountReady = !!profile;
    }

    return res.status(200).json({
      success: true,
      status,
      message,
      username,
      accountReady,
      paymentMethod: payment.method || null
    });

  } catch (error) {
    console.error('Check payment status error:', error);

    // Als de payment niet gevonden wordt
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
