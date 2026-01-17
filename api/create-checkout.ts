/**
 * Vercel Serverless Function - Mollie Checkout
 *
 * Maakt een Mollie betaling aan voor het individuele abonnement.
 * - Eerste 3 dagen gratis trial
 * - Daarna €12,50 per maand
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mollie API client
import createMollieClient from '@mollie/api-client';

interface CheckoutRequest {
  email: string;
  name: string;
  level: 'VMBO-TL' | 'HAVO' | 'VWO';
}

// Mollie redirect URLs
const getRedirectUrl = (success: boolean) => {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.VITE_APP_URL || 'http://localhost:5173';

  return `${baseUrl}?payment=${success ? 'success' : 'cancelled'}`;
};

const getWebhookUrl = () => {
  // Webhook URL moet publiek toegankelijk zijn
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.VITE_APP_URL || 'http://localhost:5173';

  return `${baseUrl}/api/mollie-webhook`;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Environment variables check
    const mollieApiKey = process.env.MOLLIE_API_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!mollieApiKey) {
      console.error('Missing MOLLIE_API_KEY');
      return res.status(500).json({ error: 'Betaalservice niet geconfigureerd' });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    // Parse request body
    const body: CheckoutRequest = req.body;
    const { email, name, level } = body;

    // Validatie
    if (!email || !name || !level) {
      return res.status(400).json({ error: 'Email, naam en niveau zijn verplicht' });
    }

    // Email validatie
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ongeldig email adres' });
    }

    // Initialize clients
    const mollie = createMollieClient({ apiKey: mollieApiKey });
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check of subscription al bestaat
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_email', email.toLowerCase())
      .maybeSingle();

    if (existingSubscription) {
      // Check of trial nog actief is
      if (existingSubscription.status === 'trial') {
        const trialEnd = new Date(existingSubscription.trial_ends_at);
        if (trialEnd > new Date()) {
          return res.status(200).json({
            success: true,
            message: 'Je hebt al een actieve proefperiode',
            subscription: {
              status: 'trial',
              trialEndsAt: existingSubscription.trial_ends_at
            }
          });
        }
      }

      // Check of subscription actief is
      if (existingSubscription.status === 'active') {
        return res.status(200).json({
          success: true,
          message: 'Je hebt al een actief abonnement',
          subscription: {
            status: 'active',
            periodEnd: existingSubscription.current_period_end
          }
        });
      }
    }

    // Maak of haal Mollie customer
    let mollieCustomerId = existingSubscription?.mollie_customer_id;

    if (!mollieCustomerId) {
      const customer = await mollie.customers.create({
        name: name,
        email: email.toLowerCase(),
        metadata: {
          level: level
        }
      });
      mollieCustomerId = customer.id;
    }

    // Bereken trial einddatum (3 dagen vanaf nu)
    const trialStarted = new Date();
    const trialEnds = new Date(trialStarted);
    trialEnds.setDate(trialEnds.getDate() + 3);

    // Maak first payment voor subscription setup
    // We gebruiken een €0.00 payment voor de trial, daarna automatische incasso
    const payment = await mollie.payments.create({
      amount: {
        value: '0.00', // Gratis trial
        currency: 'EUR'
      },
      description: 'AI Examentrainer - 3 dagen gratis proefperiode',
      redirectUrl: getRedirectUrl(true),
      webhookUrl: getWebhookUrl(),
      metadata: {
        type: 'trial_setup',
        email: email.toLowerCase(),
        name: name,
        level: level,
        trial_ends: trialEnds.toISOString()
      },
      customerId: mollieCustomerId,
      sequenceType: 'first' // Dit maakt een mandaat aan voor toekomstige betalingen
    });

    // Upsert subscription in database
    const subscriptionData = {
      user_email: email.toLowerCase(),
      user_name: name,
      mollie_customer_id: mollieCustomerId,
      status: 'pending',
      plan_type: 'individual',
      price_cents: 1250,
      trial_started_at: trialStarted.toISOString(),
      trial_ends_at: trialEnds.toISOString()
    };

    if (existingSubscription) {
      await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', existingSubscription.id);
    } else {
      await supabase
        .from('subscriptions')
        .insert(subscriptionData);
    }

    // Log payment
    await supabase
      .from('payments')
      .insert({
        mollie_payment_id: payment.id,
        amount_cents: 0,
        currency: 'EUR',
        status: 'pending',
        description: 'Trial setup'
      });

    // Return checkout URL
    return res.status(200).json({
      success: true,
      checkoutUrl: payment.getCheckoutUrl(),
      message: 'Checkout sessie aangemaakt'
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis bij het aanmaken van de checkout',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
