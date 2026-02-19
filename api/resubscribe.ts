/**
 * Vercel Serverless Function - Resubscribe
 *
 * Laat een ingelogde gebruiker met een verlopen abonnement opnieuw abonneren.
 * Vereist Bearer token (authenticatie). Geen wachtwoord of registratie nodig.
 *
 * Flow:
 * 1. Verifieer JWT token
 * 2. Check of abonnement verlopen/cancelled is
 * 3. Maak Mollie betaling aan (hergebruik bestaande customer indien mogelijk)
 * 4. Redirect gebruiker naar Mollie checkout
 * 5. Na succesvolle betaling: webhook heractiveer abonnement
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMollieClient, SequenceType, type Payment } from '@mollie/api-client';
import { setCorsHeaders } from './utils/cors.js';

// Verlopen gebruikers betalen direct het volledige abonnementsbedrag (geen trial).
// Alle plannen zijn recurring en gebruiken sequenceType first voor mandaat.
const PLAN_CONFIG = {
  monthly: {
    amount: '9.95',
    amountCents: 995,
    description: 'AI Examentrainer - Maandelijks abonnement (herabonnering)',
    interval: '1 month',
  },
  quarterly: {
    amount: '24.95',
    amountCents: 2495,
    description: 'AI Examentrainer - Kwartaalabonnement (herabonnering)',
    interval: '3 months',
  },
  yearly: {
    amount: '79.00',
    amountCents: 7900,
    description: 'AI Examentrainer - Jaarpakket (herabonnering)',
    interval: '12 months',
  },
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mollieApiKey = process.env.MOLLIE_API_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const appUrl = process.env.VITE_APP_URL || 'https://ai-examentrainer.nl';

    if (!mollieApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    // Verifieer authenticatie
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet geautoriseerd' });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user || !user.email) {
      return res.status(401).json({ error: 'Ongeldige sessie' });
    }

    const email = user.email.toLowerCase();

    // Valideer plan
    const plan = req.body?.plan || 'monthly';
    if (!PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]) {
      return res.status(400).json({ error: 'Ongeldig pakket' });
    }

    const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG];

    // Check abonnement status
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_email', email)
      .maybeSingle();

    if (subscription) {
      // Blokkeer als abonnement nog actief is
      if (subscription.status === 'active') {
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end)
          : null;
        if (periodEnd && periodEnd > new Date()) {
          return res.status(400).json({
            error: 'Je hebt al een actief abonnement.'
          });
        }
      }
      if (subscription.status === 'trial') {
        const trialEnd = new Date(subscription.trial_ends_at);
        if (trialEnd > new Date()) {
          return res.status(400).json({
            error: 'Je hebt nog een actieve proefperiode.'
          });
        }
      }
    }

    const mollie = createMollieClient({ apiKey: mollieApiKey });

    // Hergebruik bestaande Mollie customer of maak nieuwe aan
    let customerId: string;

    if (subscription?.mollie_customer_id) {
      customerId = subscription.mollie_customer_id;
      console.log('Reusing existing Mollie customer:', customerId);
    } else {
      const customer = await mollie.customers.create({
        name: email,
        email: email,
      });
      customerId = customer.id;
      console.log('Created new Mollie customer:', customerId);
    }

    // Maak Mollie betaling aan - altijd sequenceType first voor mandaat/recurring
    const paymentParams: Parameters<typeof mollie.payments.create>[0] = {
      amount: {
        currency: 'EUR',
        value: planConfig.amount,
      },
      customerId: customerId,
      description: planConfig.description,
      redirectUrl: `${appUrl}/settings?resubscribed=true`,
      webhookUrl: `${appUrl}/api/mollie-webhook`,
      sequenceType: SequenceType.first,
      metadata: {
        type: 'resubscription',
        plan: plan,
        email: email,
      },
    };

    const payment = (await mollie.payments.create(paymentParams)) as Payment;
    console.log('Resubscription payment created:', payment.id, 'for:', email);

    return res.status(200).json({
      success: true,
      checkoutUrl: payment.getCheckoutUrl(),
      paymentId: payment.id,
    });

  } catch (error) {
    console.error('Resubscribe error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis bij het opnieuw abonneren',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
