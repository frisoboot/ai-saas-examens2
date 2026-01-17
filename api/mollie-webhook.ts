/**
 * Vercel Serverless Function - Mollie Webhook
 *
 * Ontvangt betalingsnotificaties van Mollie en update de subscription status.
 * Beveiligd: valideert dat de request van Mollie komt.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import createMollieClient from '@mollie/api-client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Mollie webhooks zijn altijd POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Environment variables check
    const mollieApiKey = process.env.MOLLIE_API_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!mollieApiKey || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables for webhook');
      return res.status(500).json({ error: 'Server configuratie fout' });
    }

    // Mollie stuurt payment ID in de body
    const paymentId = req.body?.id;

    if (!paymentId) {
      console.error('No payment ID in webhook body');
      return res.status(400).json({ error: 'Missing payment ID' });
    }

    console.log('Mollie webhook received for payment:', paymentId);

    // Initialize clients
    const mollie = createMollieClient({ apiKey: mollieApiKey });
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Haal payment details op van Mollie (dit valideert ook dat het een echte payment is)
    const payment = await mollie.payments.get(paymentId);

    console.log('Payment status:', payment.status);
    console.log('Payment metadata:', payment.metadata);

    // Update payment record in database
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .update({
        status: mapMollieStatus(payment.status),
        payment_method: payment.method || null,
        paid_at: payment.paidAt || null
      })
      .eq('mollie_payment_id', paymentId)
      .select()
      .maybeSingle();

    if (paymentError) {
      console.error('Error updating payment record:', paymentError);
    }

    // Haal metadata op voor subscription update
    const metadata = payment.metadata as {
      type?: string;
      email?: string;
      name?: string;
      level?: string;
      trial_ends?: string;
    } | null;

    if (!metadata?.email) {
      console.log('No email in metadata, skipping subscription update');
      return res.status(200).json({ received: true });
    }

    // Bepaal subscription status op basis van payment status
    if (payment.status === 'paid') {
      console.log('Payment successful for:', metadata.email);

      // Haal subscription op
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_email', metadata.email)
        .maybeSingle();

      if (subscription) {
        // Trial setup payment
        if (metadata.type === 'trial_setup') {
          console.log('Activating trial for:', metadata.email);

          await supabase
            .from('subscriptions')
            .update({
              status: 'trial',
              trial_started_at: new Date().toISOString(),
              trial_ends_at: metadata.trial_ends
            })
            .eq('user_email', metadata.email);

          // Maak een Mollie subscription aan die start na de trial
          if (subscription.mollie_customer_id) {
            try {
              const trialEnd = new Date(metadata.trial_ends || new Date());

              const mollieSubscription = await mollie.customerSubscriptions.create({
                customerId: subscription.mollie_customer_id,
                amount: {
                  value: '12.50',
                  currency: 'EUR'
                },
                interval: '1 month',
                description: 'AI Examentrainer - Maandelijks abonnement',
                startDate: trialEnd.toISOString().split('T')[0], // YYYY-MM-DD format
                webhookUrl: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.VITE_APP_URL}/api/mollie-webhook`,
                metadata: {
                  type: 'subscription_payment',
                  email: metadata.email
                }
              });

              console.log('Created Mollie subscription:', mollieSubscription.id);

              await supabase
                .from('subscriptions')
                .update({
                  mollie_subscription_id: mollieSubscription.id
                })
                .eq('user_email', metadata.email);

            } catch (subError) {
              console.error('Error creating Mollie subscription:', subError);
              // Trial is nog steeds actief, subscription kan later worden aangemaakt
            }
          }
        }

        // Recurring subscription payment
        if (metadata.type === 'subscription_payment') {
          console.log('Processing subscription payment for:', metadata.email);

          const periodEnd = new Date();
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: periodEnd.toISOString()
            })
            .eq('user_email', metadata.email);

          // Log payment in history
          await supabase
            .from('payments')
            .insert({
              subscription_id: subscription.id,
              mollie_payment_id: paymentId,
              amount_cents: 1250,
              currency: 'EUR',
              status: 'paid',
              description: 'Maandelijks abonnement',
              payment_method: payment.method || null,
              paid_at: payment.paidAt
            });
        }
      }
    }

    // Handle failed/cancelled payments
    if (payment.status === 'failed' || payment.status === 'cancelled' || payment.status === 'expired') {
      console.log('Payment failed/cancelled for:', metadata.email);

      if (metadata.type === 'subscription_payment') {
        // Markeer subscription als expired na gefaalde recurring payment
        await supabase
          .from('subscriptions')
          .update({
            status: 'expired'
          })
          .eq('user_email', metadata.email);
      }
    }

    // Mollie verwacht een 200 response
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 anyway om Mollie te laten weten dat we de webhook hebben ontvangen
    // Anders blijft Mollie retrying
    return res.status(200).json({
      received: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Map Mollie status naar onze status
function mapMollieStatus(mollieStatus: string): string {
  const statusMap: Record<string, string> = {
    'open': 'pending',
    'pending': 'pending',
    'paid': 'paid',
    'failed': 'failed',
    'canceled': 'cancelled',
    'cancelled': 'cancelled',
    'expired': 'expired',
    'refunded': 'refunded'
  };
  return statusMap[mollieStatus] || 'pending';
}
