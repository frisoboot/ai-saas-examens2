import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createMollieClient } from '@mollie/api-client';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY! });

// Get webhook URL from environment
const getWebhookUrl = (): string => {
  const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || '';
  return `${appUrl.replace(/\/$/, '')}/api/mollie-webhook`;
};

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

    // Handle different payment statuses
    if (payment.status === 'paid') {
      console.log('Payment PAID for student:', studentName);

      // Payment successful
      if (metadata.type === 'trial_start') {
        // First payment (mandate) - Start trial and create subscription
        console.log('Processing TRIAL START for:', studentName);

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        // Create subscription now that mandate is confirmed
        let subscriptionId: string | null = null;
        try {
          const customerId = payment.customerId;
          if (customerId) {
            const webhookUrl = getWebhookUrl();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 7); // Start after trial

            console.log('Creating subscription for customer:', customerId);
            const subscription = await mollieClient.customerSubscriptions.create({
              customerId: customerId,
              amount: {
                currency: 'EUR',
                value: '12.50'
              },
              interval: '1 month',
              description: 'AI Examen Trainer Abonnement',
              webhookUrl: webhookUrl,
              startDate: startDate.toISOString().split('T')[0],
              metadata: {
                type: 'subscription_payment',
                studentName: studentName,
                level: metadata.level
              }
            });
            subscriptionId = subscription.id;
            console.log('Subscription created:', subscriptionId);
          }
        } catch (subError: any) {
          console.error('Error creating subscription:', subError.message);
          // Continue anyway - we can create subscription later
        }

        const { error: updateError } = await supabase
          .from('student_profiles')
          .update({
            subscription_status: 'trial',
            trial_started_at: new Date().toISOString(),
            trial_ends_at: trialEndsAt.toISOString(),
            subscription_expires_at: trialEndsAt.toISOString(),
            mollie_customer_id: payment.customerId,
            mollie_subscription_id: subscriptionId
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
          mollie_subscription_id: subscriptionId,
          amount: parseFloat(payment.amount.value),
          metadata: { payment }
        });

      } else if (metadata.type === 'renewal_start') {
        // Renewal payment (for expired subscriptions) - Reactivate and create new subscription
        console.log('Processing RENEWAL for:', studentName);

        // Create new subscription starting immediately
        let subscriptionId: string | null = null;
        try {
          const customerId = payment.customerId;
          if (customerId) {
            const webhookUrl = getWebhookUrl();
            // Start subscription tomorrow (Mollie requires future date)
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 1);

            console.log('Creating renewal subscription for customer:', customerId);
            const subscription = await mollieClient.customerSubscriptions.create({
              customerId: customerId,
              amount: {
                currency: 'EUR',
                value: '12.50'
              },
              interval: '1 month',
              description: 'AI Examen Trainer Abonnement',
              webhookUrl: webhookUrl,
              startDate: startDate.toISOString().split('T')[0],
              metadata: {
                type: 'subscription_payment',
                studentName: studentName
              }
            });
            subscriptionId = subscription.id;
            console.log('Renewal subscription created:', subscriptionId);
          }
        } catch (subError: any) {
          console.error('Error creating renewal subscription:', subError.message);
        }

        // Reactivate account with 30 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { error: updateError } = await supabase
          .from('student_profiles')
          .update({
            subscription_status: 'active',
            is_active: true,
            subscription_expires_at: expiresAt.toISOString(),
            mollie_customer_id: payment.customerId,
            mollie_subscription_id: subscriptionId
          })
          .eq('name', studentName);

        if (updateError) {
          console.error('Error reactivating subscription:', updateError);
        } else {
          console.log('Subscription renewed successfully for:', studentName);
        }

        // Log event
        await supabase.from('subscription_events').insert({
          student_name: studentName,
          event_type: 'subscription_renewed',
          mollie_payment_id: payment.id,
          mollie_subscription_id: subscriptionId,
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
    return res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
}
