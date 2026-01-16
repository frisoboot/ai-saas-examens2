import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createMollieClient } from '@mollie/api-client';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY! });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Mollie webhook triggered:', req.method, req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: paymentId } = req.body;

    if (!paymentId) {
      console.error('No payment ID in webhook');
      return res.status(400).json({ error: 'Missing payment ID' });
    }

    // Get payment details from Mollie (verify webhook authenticity)
    const payment = await mollieClient.payments.get(paymentId);
    console.log('Payment retrieved from Mollie:', payment.id, payment.status);

    const metadata = payment.metadata as any;
    const studentName = metadata?.studentName;

    if (!studentName) {
      console.error('No studentName in payment metadata');
      return res.status(400).json({ error: 'Missing student name' });
    }

    // SECURITY: Validate studentName to prevent injection attacks
    const nameStr = String(studentName).trim();
    if (nameStr.length < 2 || nameStr.length > 100) {
      console.error('Invalid studentName length in payment metadata');
      return res.status(400).json({ error: 'Invalid student name' });
    }
    const nameRegex = /^[\p{L}\p{N}\s\-'.]+$/u;
    if (!nameRegex.test(nameStr)) {
      console.error('Invalid characters in studentName:', studentName);
      return res.status(400).json({ error: 'Invalid student name' });
    }

    // Handle different payment statuses
    if (payment.status === 'paid') {
      console.log('Payment PAID for student:', studentName);

      // Payment successful
      if (metadata.type === 'trial_start') {
        // First payment (mandate) - Start trial
        console.log('Processing TRIAL START for:', studentName);

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        const { error: updateError } = await supabase
          .from('student_profiles')
          .update({
            subscription_status: 'trial',
            trial_started_at: new Date().toISOString(),
            trial_ends_at: trialEndsAt.toISOString(),
            subscription_expires_at: trialEndsAt.toISOString(),
            mollie_customer_id: payment.customerId
          })
          .eq('name', studentName);

        if (updateError) {
          console.error('Error updating student profile:', updateError);
        } else {
          console.log('Trial started successfully for:', studentName);
        }

        // Log event
        await supabase.from('subscription_events').insert({
          student_name: studentName,
          event_type: 'trial_started',
          mollie_payment_id: payment.id,
          amount: parseFloat(payment.amount.value),
          metadata: { payment }
        });

      } else if (metadata.type === 'subscription_payment') {
        // Recurring payment - Update subscription
        console.log('Processing SUBSCRIPTION PAYMENT for:', studentName);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

        const { error: updateError } = await supabase
          .from('student_profiles')
          .update({
            subscription_status: 'active',
            subscription_expires_at: expiresAt.toISOString()
          })
          .eq('name', studentName);

        if (updateError) {
          console.error('Error updating student subscription:', updateError);
        } else {
          console.log('Subscription renewed successfully for:', studentName);
        }

        // Log event
        await supabase.from('subscription_events').insert({
          student_name: studentName,
          event_type: 'payment_success',
          mollie_payment_id: payment.id,
          amount: parseFloat(payment.amount.value),
          metadata: { payment }
        });
      }

    } else if (payment.status === 'failed' || payment.status === 'expired' || payment.status === 'canceled') {
      // Payment failed
      console.log('Payment FAILED/EXPIRED for student:', studentName, 'Status:', payment.status);

      const { error: updateError } = await supabase
        .from('student_profiles')
        .update({
          subscription_status: 'expired'
        })
        .eq('name', studentName);

      if (updateError) {
        console.error('Error marking subscription expired:', updateError);
      }

      await supabase.from('subscription_events').insert({
        student_name: studentName,
        event_type: 'payment_failed',
        mollie_payment_id: payment.id,
        metadata: { payment }
      });

    } else if (payment.status === 'pending' || payment.status === 'open') {
      // Payment is still pending, don't do anything yet
      console.log('Payment PENDING for student:', studentName);
      return res.status(200).json({ success: true, message: 'Payment pending' });
    }

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    // SECURITY: Don't expose internal error details to clients
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}
