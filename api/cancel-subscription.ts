import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createMollieClient } from '@mollie/api-client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Cancel subscription endpoint called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mollieApiKey = process.env.MOLLIE_API_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    return res.status(500).json({ error: 'Server configuratie fout.' });
  }

  if (!mollieApiKey) {
    console.error('Missing Mollie API key');
    return res.status(500).json({ error: 'Betalingssysteem niet geconfigureerd.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const mollieClient = createMollieClient({ apiKey: mollieApiKey });

  const { studentName } = req.body;

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

    const customerId = student.mollie_customer_id;
    const subscriptionId = student.mollie_subscription_id;

    // Cancel Mollie subscription if it exists
    if (customerId && subscriptionId) {
      try {
        console.log('Cancelling Mollie subscription:', subscriptionId);
        await mollieClient.customerSubscriptions.cancel(subscriptionId, { customerId });
        console.log('Mollie subscription cancelled');
      } catch (mollieError: any) {
        // Subscription might already be cancelled or not exist
        console.log('Note: Could not cancel Mollie subscription:', mollieError.message);
      }
    }

    // Update student profile
    const { error: updateError } = await supabaseAdmin
      .from('student_profiles')
      .update({
        subscription_status: 'cancelled',
        mollie_subscription_id: null
      })
      .eq('name', studentName);

    if (updateError) {
      console.error('Error updating student profile:', updateError);
      return res.status(500).json({ error: 'Database update mislukt' });
    }

    // Log event
    await supabaseAdmin.from('subscription_events').insert({
      student_name: studentName,
      event_type: 'subscription_cancelled',
      mollie_subscription_id: subscriptionId,
      metadata: { reason: 'user_requested' }
    });

    console.log('Subscription cancelled successfully for:', studentName);

    return res.status(200).json({
      success: true,
      message: 'Je abonnement is opgezegd. Je kunt blijven gebruiken tot de huidige periode afloopt.'
    });

  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({
      error: error.message || 'Opzeggen mislukt. Probeer het opnieuw.'
    });
  }
}
