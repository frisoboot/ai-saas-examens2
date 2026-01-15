import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createMollieClient, type Payment } from '@mollie/api-client';
import { sendWelcomeEmail } from '../services/emailService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Register student endpoint called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mollieApiKey = process.env.MOLLIE_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    return res.status(500).json({ error: 'Server configuratie fout. Neem contact op met de beheerder.' });
  }

  if (!mollieApiKey) {
    console.error('Missing Mollie API key');
    return res.status(500).json({ error: 'Betalingssysteem niet geconfigureerd. Neem contact op met de beheerder.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const mollieClient = createMollieClient({ apiKey: mollieApiKey });

  const { name, email, password, level, returnUrl } = req.body;

  // Validation
  if (!name || !email || !password || !level) {
    return res.status(400).json({ error: 'Ontbrekende velden' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Wachtwoord moet minimaal 8 karakters zijn' });
  }

  if (!['VMBO-TL', 'HAVO', 'VWO'].includes(level)) {
    return res.status(400).json({ error: 'Ongeldig niveau' });
  }

  try {
    console.log('Checking if student exists:', name);

    // Check if student already exists (by name or email)
    const { data: existingByName } = await supabaseAdmin
      .from('student_profiles')
      .select('name')
      .eq('name', name)
      .maybeSingle();

    if (existingByName) {
      return res.status(400).json({ error: 'Een account met deze naam bestaat al' });
    }

    // Check by email
    const { data: existingByEmail } = await supabaseAdmin
      .from('student_profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existingByEmail) {
      return res.status(400).json({ error: 'Dit email adres is al in gebruik' });
    }

    console.log('Creating Supabase Auth user...');

    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        role: 'student',
        name: name,
        level: level
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(500).json({ error: `Auth fout: ${authError.message}` });
    }

    console.log('Auth user created:', authData.user.id);

    // Step 2: Create student profile (with inactive subscription initially)
    const { error: profileError } = await supabaseAdmin
      .from('student_profiles')
      .insert({
        name: name,
        level: level,
        struggle_points: '', // Empty initially
        email: email,
        is_active: true,
        auth_user_id: authData.user.id,
        subscription_status: 'inactive', // Will be updated by webhook to 'trial'
        created_by_admin: null // Self-registered (not created by admin)
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: `Database fout: ${profileError.message}` });
    }

    console.log('Student profile created, creating Mollie customer...');

    // Step 3: Create Mollie customer
    const customer = await mollieClient.customers.create({
      name: name,
      email: email,
      metadata: {
        studentName: name,
        level: level,
        authUserId: authData.user.id
      }
    });

    console.log('Mollie customer created:', customer.id);

    // Step 4: Create first payment (iDEAL mandate for trial)
    // Use APP_URL environment variable for reliable webhook URL (required for Mollie)
    const appUrl = process.env.VITE_APP_URL || process.env.APP_URL;
    if (!appUrl) {
      console.error('Missing APP_URL environment variable for webhook');
      return res.status(500).json({ error: 'Server configuratie fout: APP_URL niet ingesteld.' });
    }
    // Remove trailing slash if present and construct webhook URL
    const baseUrl = appUrl.replace(/\/$/, '');
    const webhookUrl = `${baseUrl}/api/mollie-webhook`;
    console.log('Creating Mollie payment with webhook:', webhookUrl);

    const payment = (await mollieClient.payments.create({
      amount: {
        currency: 'EUR',
        value: '0.01' // Small amount to create mandate (€0.01)
      },
      description: 'AI Examen Trainer - Start 7 Dagen Trial',
      redirectUrl: returnUrl,
      webhookUrl: webhookUrl,
      customerId: customer.id,
      sequenceType: 'first' as any, // Creates reusable mandate
      method: 'ideal' as any, // Only iDEAL
      metadata: {
        type: 'trial_start',
        studentName: name
      }
    } as any)) as unknown as Payment;

    console.log('Mollie payment created:', payment.id);

    // Step 5: Update profile with Mollie customer ID
    // Note: Subscription will be created by webhook after mandate is confirmed
    await supabaseAdmin
      .from('student_profiles')
      .update({
        mollie_customer_id: customer.id
      })
      .eq('name', name);

    console.log('Profile updated with Mollie customer ID');

    // Step 6: Send welcome email (don't block if it fails)
    const trialDays = 7;
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);

    sendWelcomeEmail({
      name: name,
      email: email,
      trialEndDate: trialEndDate.toISOString()
    }).catch(error => {
      console.error('Failed to send welcome email (non-blocking):', error);
    });

    // Return checkout URL
    const checkoutUrl = payment.getCheckoutUrl();
    console.log('Registration complete, returning checkout URL:', checkoutUrl);

    return res.status(200).json({
      success: true,
      checkoutUrl: checkoutUrl,
      customerId: customer.id
    });

  } catch (error: any) {
    console.error('Registration error:', error);

    // Try to provide more specific error messages
    if (error.message?.includes('customer')) {
      return res.status(500).json({ error: 'Fout bij aanmaken Mollie account. Probeer het opnieuw.' });
    } else if (error.message?.includes('payment')) {
      return res.status(500).json({ error: 'Fout bij koppelen betaalmethode. Probeer het opnieuw.' });
    }

    return res.status(500).json({ error: error.message || 'Registratie mislukt. Probeer het opnieuw.' });
  }
}
