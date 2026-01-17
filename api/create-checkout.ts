/**
 * Vercel Serverless Function - Create Checkout
 *
 * Flow:
 * 1. Valideer input en check of username/email beschikbaar is
 * 2. Maak Mollie customer aan
 * 3. Maak €0.01 verificatiebetaling aan (creëert mandaat voor toekomstige incasso's)
 * 4. Sla pending registratie op in database
 * 5. Redirect gebruiker naar Mollie checkout
 * 6. Na succesvolle betaling: webhook activeert account en start trial
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import createMollieClient from '@mollie/api-client';

interface CheckoutRequest {
  email: string;
  username: string;
  password: string;
  level: 'VMBO-TL' | 'HAVO' | 'VWO';
}

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
    const { email, username, password, level } = body;

    // Validatie
    if (!email || !username || !password || !level) {
      return res.status(400).json({ error: 'Alle velden zijn verplicht' });
    }

    // Email validatie
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ongeldig email adres' });
    }

    // Username validatie
    if (username.length < 3) {
      return res.status(400).json({ error: 'Gebruikersnaam moet minimaal 3 tekens zijn' });
    }

    // Password validatie
    if (password.length < 6) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 6 tekens zijn' });
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const mollie = createMollieClient({ apiKey: mollieApiKey });

    // Check of username al bestaat
    const { data: existingUser } = await supabase
      .from('student_profiles')
      .select('name')
      .eq('name', username.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'Deze gebruikersnaam is al in gebruik' });
    }

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
            error: 'Dit e-mailadres heeft al een actieve proefperiode'
          });
        }
      }
      if (existingSubscription.status === 'active') {
        return res.status(400).json({
          error: 'Dit e-mailadres heeft al een actief abonnement'
        });
      }
    }

    // Check of er al een pending registration is
    const { data: existingPending } = await supabase
      .from('pending_registrations')
      .select('*')
      .or(`email.eq.${email.toLowerCase()},username.eq.${username.toLowerCase()}`)
      .maybeSingle();

    if (existingPending) {
      // Verwijder oude pending registration
      await supabase
        .from('pending_registrations')
        .delete()
        .eq('id', existingPending.id);
    }

    // Maak Mollie customer aan
    const customer = await mollie.customers.create({
      name: username,
      email: email.toLowerCase(),
      metadata: {
        username: username.toLowerCase(),
        level: level
      }
    });

    console.log('Mollie customer created:', customer.id);

    // Maak €0.01 verificatiebetaling aan (first payment voor mandaat)
    const payment = await mollie.payments.create({
      amount: {
        currency: 'EUR',
        value: '0.01'
      },
      customerId: customer.id,
      sequenceType: 'first', // Dit creëert een mandaat voor recurring payments
      description: 'AI Examentrainer - Verificatie voor proefperiode',
      redirectUrl: `${appUrl}?payment=success&username=${encodeURIComponent(username.toLowerCase())}`,
      webhookUrl: `${appUrl}/api/mollie-webhook`,
      metadata: {
        type: 'verification',
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        level: level,
        password_hash: Buffer.from(password).toString('base64') // Tijdelijk opslaan (wordt verwijderd na activatie)
      }
    });

    console.log('Mollie payment created:', payment.id, 'Status:', payment.status);

    // Sla pending registration op
    const { error: pendingError } = await supabase
      .from('pending_registrations')
      .insert({
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password_encrypted: Buffer.from(password).toString('base64'),
        level: level,
        mollie_customer_id: customer.id,
        mollie_payment_id: payment.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 uur geldig
      });

    if (pendingError) {
      console.error('Pending registration error:', pendingError);
      // Probeer toch door te gaan - payment metadata bevat ook de gegevens
    }

    // Return checkout URL
    return res.status(200).json({
      success: true,
      checkoutUrl: payment.getCheckoutUrl(),
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
