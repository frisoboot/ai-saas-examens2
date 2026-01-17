/**
 * Vercel Serverless Function - Create Checkout / Start Trial
 *
 * Maakt een student account aan en start de gratis proefperiode.
 * Na de trial wordt Mollie gebruikt voor betalingen.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ error: 'Server configuratie fout' });
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

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Check of username al bestaat
    const { data: existingUser } = await supabase
      .from('student_profiles')
      .select('name')
      .eq('name', username.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'Deze gebruikersnaam is al in gebruik' });
    }

    // Check of email al een subscription heeft
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
          return res.status(400).json({
            error: 'Dit e-mailadres heeft al een actieve proefperiode'
          });
        }
      }

      // Check of subscription actief is
      if (existingSubscription.status === 'active') {
        return res.status(400).json({
          error: 'Dit e-mailadres heeft al een actief abonnement'
        });
      }
    }

    // Maak student account aan in Supabase Auth
    const studentEmail = `${username.toLowerCase()}@student.local`;
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: studentEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'student',  // CRITICAL: nodig voor login verificatie
        name: username.toLowerCase(),
        level: level,
        real_email: email.toLowerCase()
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      if (authError.message.includes('already been registered')) {
        return res.status(400).json({ error: 'Deze gebruikersnaam is al in gebruik' });
      }
      return res.status(500).json({ error: 'Kon account niet aanmaken: ' + authError.message });
    }

    // Maak student profile aan
    const { error: profileError } = await supabase
      .from('student_profiles')
      .insert({
        name: username.toLowerCase(),
        level: level,
        struggle_points: '',
        email: email.toLowerCase(),
        is_active: true
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Cleanup: verwijder auth user als profile aanmaken mislukt
      if (authUser?.user?.id) {
        await supabase.auth.admin.deleteUser(authUser.user.id);
      }

      if (profileError.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Deze gebruikersnaam is al in gebruik' });
      }
      return res.status(500).json({ error: 'Kon profiel niet aanmaken' });
    }

    // Bereken trial einddatum (3 dagen vanaf nu)
    const trialStarted = new Date();
    const trialEnds = new Date(trialStarted);
    trialEnds.setDate(trialEnds.getDate() + 3);

    // Maak subscription record aan
    const subscriptionData = {
      user_email: email.toLowerCase(),
      user_name: username.toLowerCase(),
      status: 'trial',
      plan_type: 'individual',
      price_cents: 1250,
      trial_started_at: trialStarted.toISOString(),
      trial_ends_at: trialEnds.toISOString()
    };

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData);

    if (subscriptionError) {
      console.error('Subscription error:', subscriptionError);
      // Don't fail the whole request - user can still use trial
    }

    // Return success - geen Mollie redirect nodig voor gratis trial
    return res.status(200).json({
      success: true,
      message: 'Account aangemaakt! Je kunt nu inloggen.',
      username: username.toLowerCase(),
      trialEndsAt: trialEnds.toISOString()
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis bij het aanmaken van je account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
