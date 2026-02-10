/**
 * Vercel Serverless Function - Renew Subscription
 *
 * Allows authenticated users with expired/cancelled subscriptions to re-subscribe
 * without creating a new account or entering a new password.
 *
 * Flow:
 * 1. Verify auth token (user must be logged in)
 * 2. Check that subscription is expired/cancelled/trial_expired
 * 3. Create Mollie customer + payment
 * 4. Store pending registration WITHOUT password (account already exists)
 * 5. Return Mollie checkout URL
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMollieClient, SequenceType, type Payment } from '@mollie/api-client';
import { setCorsHeaders } from './utils/cors.js';

interface RenewRequest {
  plan?: 'monthly' | 'exam_package' | 'yearly';
}

const PLAN_CONFIG = {
  monthly: {
    amount: '14.95',
    description: 'AI Examentrainer - Maandelijks abonnement',
    useMandate: true,
    metadataType: 'verification',
  },
  exam_package: {
    amount: '39.00',
    description: 'AI Examentrainer - Examenpakket (4 maanden)',
    useMandate: false,
    metadataType: 'one_time_purchase',
  },
  yearly: {
    amount: '99.00',
    description: 'AI Examentrainer - Jaarpakket (12 maanden)',
    useMandate: false,
    metadataType: 'one_time_purchase',
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

    // Verify auth token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Niet ingelogd' });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user?.email) {
      return res.status(401).json({ error: 'Ongeldige sessie. Log opnieuw in.' });
    }

    const email = user.email.toLowerCase();

    // Parse request body
    const body: RenewRequest = req.body || {};
    const plan = body.plan || 'monthly';

    if (!PLAN_CONFIG[plan]) {
      return res.status(400).json({ error: 'Ongeldig pakket geselecteerd' });
    }

    const planConfig = PLAN_CONFIG[plan];

    // Check current subscription status
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_email', email)
      .maybeSingle();

    if (existingSubscription) {
      // Block if subscription is still active
      if (existingSubscription.status === 'trial') {
        const trialEnd = new Date(existingSubscription.trial_ends_at);
        if (trialEnd > new Date()) {
          return res.status(400).json({
            error: 'Je hebt al een actief abonnement (proefperiode).',
          });
        }
      }
      if (existingSubscription.status === 'active') {
        const periodEnd = existingSubscription.current_period_end
          ? new Date(existingSubscription.current_period_end)
          : null;
        if (periodEnd && periodEnd > new Date()) {
          return res.status(400).json({
            error: 'Je hebt al een actief abonnement.',
          });
        }
      }
    }

    // Get student level from profile
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('level')
      .eq('email', email)
      .maybeSingle();

    const level = profile?.level || 'HAVO';

    // Remove any existing pending registration for this email
    await supabase
      .from('pending_registrations')
      .delete()
      .eq('email', email);

    // Create Mollie customer
    const mollie = createMollieClient({ apiKey: mollieApiKey });

    const customer = await mollie.customers.create({
      name: email,
      email: email,
      metadata: { level },
    });

    console.log('Mollie customer created for renewal:', customer.id);

    // Store pending registration WITHOUT password (renewal flow)
    const { error: pendingError } = await supabase
      .from('pending_registrations')
      .insert({
        email,
        password_hash: null, // No password - account already exists
        level,
        mollie_customer_id: customer.id,
        mollie_payment_id: 'pending',
        plan_type: plan,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

    if (pendingError) {
      console.error('Pending registration insert failed:', pendingError);
      return res.status(500).json({
        error: 'Er ging iets mis bij het voorbereiden. Probeer het opnieuw.',
      });
    }

    // Create Mollie payment
    const paymentParams: Parameters<typeof mollie.payments.create>[0] = {
      amount: {
        currency: 'EUR',
        value: planConfig.amount,
      },
      customerId: customer.id,
      description: planConfig.description,
      redirectUrl: `${appUrl}?payment_callback=true&pid=${customer.id}`,
      webhookUrl: `${appUrl}/api/mollie-webhook`,
      metadata: {
        type: planConfig.metadataType,
        plan,
        email,
        level,
        renewal: 'true',
      },
    };

    if (planConfig.useMandate) {
      paymentParams.sequenceType = SequenceType.first;
    }

    const payment = (await mollie.payments.create(paymentParams)) as Payment;

    console.log('Mollie renewal payment created:', payment.id, 'Status:', payment.status);

    // Update pending registration with real payment ID
    await supabase
      .from('pending_registrations')
      .update({ mollie_payment_id: payment.id })
      .eq('email', email)
      .eq('mollie_payment_id', 'pending');

    // Update redirect URL with payment ID
    try {
      await mollie.payments.update(payment.id, {
        redirectUrl: `${appUrl}?payment_callback=true&pid=${payment.id}`,
      });
    } catch (updateError) {
      console.warn('Could not update redirect URL with payment ID:', updateError);
    }

    return res.status(200).json({
      success: true,
      checkoutUrl: payment.getCheckoutUrl(),
      paymentId: payment.id,
      message: 'Redirect naar betaalpagina...',
    });
  } catch (error) {
    console.error('Renew subscription error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis. Probeer het opnieuw.',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
