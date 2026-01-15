import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createMollieClient, type Payment } from '@mollie/api-client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Renew subscription endpoint called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mollieApiKey = process.env.MOLLIE_API_KEY;
  const appUrl = process.env.VITE_APP_URL || process.env.APP_URL;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    return res.status(500).json({ error: 'Server configuratie fout.' });
  }

  if (!mollieApiKey) {
    console.error('Missing Mollie API key');
    return res.status(500).json({ error: 'Betalingssysteem niet geconfigureerd.' });
  }

  if (!appUrl) {
    console.error('Missing APP_URL environment variable');
    return res.status(500).json({ error: 'Server configuratie fout: APP_URL niet ingesteld.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const mollieClient = createMollieClient({ apiKey: mollieApiKey });

  const { studentName, returnUrl } = req.body;

  if (!studentName) {
    return res.status(400).json({ error: 'Student naam is verplicht' });
  }

  try {
    console.log('Looking up student:', studentName);

    // Get student profile
    const { data: student, error: studentError } = await supabaseAdmin
      .from('student_profiles')
      .select('*')
      .eq('name', studentName)
      .single();

    if (studentError || !student) {
      console.error('Student not found:', studentError);
      return res.status(404).json({ error: 'Student niet gevonden' });
    }

    const baseUrl = appUrl.replace(/\/$/, '');
    const webhookUrl = `${baseUrl}/api/mollie-webhook`;
    const redirectUrl = returnUrl || `${baseUrl}/payment-success`;

    let customerId = student.mollie_customer_id;

    // Create Mollie customer if not exists
    if (!customerId) {
      console.log('Creating new Mollie customer for:', studentName);
      const customer = await mollieClient.customers.create({
        name: studentName,
        email: student.email,
        metadata: {
          studentName: studentName,
          level: student.level
        }
      });
      customerId = customer.id;

      // Save customer ID
      await supabaseAdmin
        .from('student_profiles')
        .update({ mollie_customer_id: customerId })
        .eq('name', studentName);
    }

    console.log('Creating renewal payment for customer:', customerId);

    // Create payment for renewal (first payment of new subscription)
    const payment = (await mollieClient.payments.create({
      amount: {
        currency: 'EUR',
        value: '0.01' // Mandate verification
      },
      description: 'AI Examen Trainer - Abonnement Verlenging',
      redirectUrl: redirectUrl,
      webhookUrl: webhookUrl,
      customerId: customerId,
      sequenceType: 'first' as any,
      method: 'ideal' as any,
      metadata: {
        type: 'renewal_start',
        studentName: studentName
      }
    } as any)) as unknown as Payment;

    console.log('Renewal payment created:', payment.id);

    // Log event
    await supabaseAdmin.from('subscription_events').insert({
      student_name: studentName,
      event_type: 'renewal_initiated',
      mollie_payment_id: payment.id,
      amount: 0.01,
      metadata: { customerId }
    });

    const checkoutUrl = payment.getCheckoutUrl();
    console.log('Returning checkout URL:', checkoutUrl);

    return res.status(200).json({
      success: true,
      checkoutUrl: checkoutUrl
    });

  } catch (error: any) {
    console.error('Renewal error:', error);
    return res.status(500).json({
      error: error.message || 'Verlenging mislukt. Probeer het opnieuw.'
    });
  }
}
