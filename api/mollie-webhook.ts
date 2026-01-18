/**
 * Vercel Serverless Function - Mollie Webhook
 *
 * Ontvangt betalingsnotificaties van Mollie en:
 * 1. Bij verificatiebetaling (€1.00): activeert account en start trial
 * 2. Bij recurring payment: verlengt subscription
 * 3. Bij failed payment: markeert subscription als expired
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMollieClient } from '@mollie/api-client';
import crypto from 'crypto';

/**
 * Genereer een veilig random wachtwoord (fallback als geen opgeslagen wachtwoord)
 */
function generateSecurePassword(): string {
  return crypto.randomBytes(16).toString('base64url');
}

/**
 * Decrypt een versleuteld wachtwoord
 * Gebruikt AES-256-GCM voor veilige decryptie
 */
function decryptPassword(encryptedData: string, secretKey: string): string | null {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      console.error('Invalid encrypted password format');
      return null;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Password decryption failed:', error);
    return null;
  }
}

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
    const appUrl = process.env.VITE_APP_URL || 'https://ai-examentrainer.nl';

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

    const metadata = payment.metadata as {
      type?: string;
      email?: string;
      level?: string;
    } | null;

    if (!metadata) {
      console.log('No metadata in payment, skipping');
      return res.status(200).json({ received: true });
    }

    // ========================================================================
    // VERIFICATIE BETALING (€1.00) - Account activatie
    // ========================================================================
    if (metadata.type === 'verification' && payment.status === 'paid') {
      console.log('Processing verification payment for:', metadata.email);

      // Haal pending registration op
      const { data: pending } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('mollie_payment_id', paymentId)
        .maybeSingle();

      // Gebruik data uit pending registration of fallback naar metadata
      const email = pending?.email || metadata.email;
      const level = pending?.level || metadata.level;

      if (!email || !level) {
        console.error('Missing registration data');
        return res.status(200).json({ received: true, error: 'Missing registration data' });
      }

      // Probeer het originele wachtwoord van de gebruiker te gebruiken
      // Als dit niet lukt, genereer een tijdelijk wachtwoord
      let userPassword: string;
      const encryptionKey = process.env.PASSWORD_ENCRYPTION_KEY || mollieApiKey;

      if (pending?.password_hash) {
        const decryptedPassword = decryptPassword(pending.password_hash, encryptionKey);
        if (decryptedPassword) {
          userPassword = decryptedPassword;
          console.log('Using user-provided password');
        } else {
          userPassword = generateSecurePassword();
          console.log('Password decryption failed, using generated password');
        }
      } else {
        userPassword = generateSecurePassword();
        console.log('No stored password, using generated password');
      }

      // Check of account al bestaat (idempotency)
      const { data: existingProfile } = await supabase
        .from('student_profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        console.log('Account already exists, skipping creation');
        // Verwijder pending registration
        if (pending) {
          await supabase
            .from('pending_registrations')
            .delete()
            .eq('id', pending.id);
        }
        return res.status(200).json({ received: true, message: 'Account already exists' });
      }

      // Maak Supabase Auth user aan met het echte email adres
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: userPassword,
        email_confirm: true,
        user_metadata: {
          role: 'student',
          level: level
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        return res.status(200).json({ received: true, error: authError.message });
      }

      console.log('Created auth user:', authUser.user?.id);

      // Maak student profile aan (email als primary key)
      const { error: profileError } = await supabase
        .from('student_profiles')
        .insert({
          email: email,
          name: email, // Gebruik email als naam
          level: level,
          struggle_points: '',
          is_active: true,
          auth_user_id: authUser.user?.id
        });

      if (profileError) {
        console.error('Profile error:', profileError);
        // Cleanup auth user als profile aanmaken mislukt
        if (authUser.user?.id) {
          await supabase.auth.admin.deleteUser(authUser.user.id);
        }
        return res.status(200).json({ received: true, error: profileError.message });
      }

      console.log('Created student profile');

      // Bereken trial periode (3 dagen)
      const trialStarted = new Date();
      const trialEnds = new Date(trialStarted);
      trialEnds.setDate(trialEnds.getDate() + 3);

      // Haal Mollie customer ID op
      const customerId = payment.customerId;

      // Maak subscription record aan
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_email: email,
          user_name: email, // Gebruik email als naam
          status: 'trial',
          plan_type: 'individual',
          price_cents: 1250,
          trial_started_at: trialStarted.toISOString(),
          trial_ends_at: trialEnds.toISOString(),
          mollie_customer_id: customerId
        })
        .select()
        .single();

      if (subscriptionError) {
        console.error('Subscription error:', subscriptionError);
      } else {
        console.log('Created subscription:', subscription.id);
      }

      // Log verificatie payment
      await supabase
        .from('payments')
        .insert({
          subscription_id: subscription?.id,
          mollie_payment_id: paymentId,
          amount_cents: 100,
          currency: 'EUR',
          status: 'paid',
          description: 'Verificatiebetaling - Proefperiode',
          payment_method: payment.method || null,
          paid_at: payment.paidAt || new Date().toISOString()
        });

      // Maak Mollie subscription aan die start na de trial (€12.50/maand)
      // BELANGRIJK: Check eerst of er een geldig mandaat is aangemaakt door de eerste betaling
      if (customerId) {
        try {
          // Haal mandaten op voor deze klant
          const mandates = await mollie.customerMandates.page({ customerId: customerId });
          const validMandate = mandates.find(m => m.status === 'valid' || m.status === 'pending');

          if (!validMandate) {
            console.error('No valid mandate found for customer:', customerId);
            console.log('Available mandates:', mandates.map(m => ({ id: m.id, status: m.status, method: m.method })));
            // Geen mandaat = geen recurring subscription mogelijk
            // De gebruiker krijgt wel trial, maar subscription kan niet automatisch worden verlengd
            // Dit kan gebeuren als de betaalmethode geen mandaten ondersteunt
          } else {
            console.log('Found valid mandate:', validMandate.id, 'method:', validMandate.method, 'status:', validMandate.status);

            const startDate = trialEnds.toISOString().split('T')[0]; // YYYY-MM-DD format

            const mollieSubscription = await mollie.customerSubscriptions.create({
              customerId: customerId,
              amount: {
                value: '12.50',
                currency: 'EUR'
              },
              interval: '1 month',
              description: 'AI Examentrainer - Maandelijks abonnement',
              startDate: startDate,
              webhookUrl: `${appUrl}/api/mollie-webhook`,
              metadata: {
                type: 'subscription_payment',
                email: email
              }
            });

            console.log('Created Mollie subscription:', mollieSubscription.id, 'starts:', startDate);

            // Update subscription met Mollie subscription ID
            await supabase
              .from('subscriptions')
              .update({
                mollie_subscription_id: mollieSubscription.id
              })
              .eq('user_email', email);
          }

        } catch (subError) {
          console.error('Error creating Mollie subscription:', subError);
          // Trial is actief, subscription kan later handmatig worden aangemaakt
        }
      }

      // Verwijder pending registration
      if (pending) {
        await supabase
          .from('pending_registrations')
          .delete()
          .eq('id', pending.id);
        console.log('Deleted pending registration');
      }

      console.log('Account activation complete for:', email);
    }

    // ========================================================================
    // VERIFICATIE BETALING - Failed/Cancelled
    // ========================================================================
    if (metadata.type === 'verification' &&
        (payment.status === 'failed' || payment.status === 'canceled' || payment.status === 'expired')) {
      console.log('Verification payment failed for:', metadata.email);

      // Verwijder pending registration
      await supabase
        .from('pending_registrations')
        .delete()
        .eq('mollie_payment_id', paymentId);
    }

    // ========================================================================
    // RECURRING SUBSCRIPTION PAYMENT (via subscriptionId - dit is de correcte manier!)
    // Mollie subscription payments hebben een subscriptionId, NIET metadata.type
    // ========================================================================
    const subscriptionId = payment.subscriptionId;

    if (subscriptionId && payment.status === 'paid') {
      console.log('Processing subscription payment via subscriptionId:', subscriptionId);

      // Zoek de subscription in onze database via mollie_subscription_id
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('mollie_subscription_id', subscriptionId)
        .maybeSingle();

      if (subscription) {
        console.log('Found subscription for user:', subscription.user_email);

        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString()
          })
          .eq('id', subscription.id);

        // Log payment
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
            paid_at: payment.paidAt || new Date().toISOString()
          });

        console.log('Subscription payment processed for:', subscription.user_email);
      } else {
        console.error('No subscription found for mollie_subscription_id:', subscriptionId);
      }
    }

    // ========================================================================
    // RECURRING PAYMENT FAILED (via subscriptionId)
    // ========================================================================
    if (subscriptionId &&
        (payment.status === 'failed' || payment.status === 'canceled' || payment.status === 'expired')) {
      console.log('Subscription payment failed for subscriptionId:', subscriptionId);

      // Zoek de subscription in onze database
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('mollie_subscription_id', subscriptionId)
        .maybeSingle();

      if (subscription) {
        // Markeer subscription als payment_failed
        await supabase
          .from('subscriptions')
          .update({
            status: 'payment_failed'
          })
          .eq('id', subscription.id);

        // Deactiveer student account
        await supabase
          .from('student_profiles')
          .update({
            is_active: false
          })
          .eq('email', subscription.user_email);

        console.log('Subscription marked as failed for:', subscription.user_email);
      }
    }

    // ========================================================================
    // LEGACY: RECURRING SUBSCRIPTION PAYMENT (via metadata - voor oude payments)
    // ========================================================================
    if (!subscriptionId && metadata?.type === 'subscription_payment' && payment.status === 'paid') {
      console.log('Processing LEGACY subscription payment for:', metadata.email);

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

      // Haal subscription op voor payment logging
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_email', metadata.email)
        .maybeSingle();

      // Log payment
      await supabase
        .from('payments')
        .insert({
          subscription_id: subscription?.id,
          mollie_payment_id: paymentId,
          amount_cents: 1250,
          currency: 'EUR',
          status: 'paid',
          description: 'Maandelijks abonnement',
          payment_method: payment.method || null,
          paid_at: payment.paidAt || new Date().toISOString()
        });

      console.log('LEGACY subscription payment processed for:', metadata.email);
    }

    // ========================================================================
    // LEGACY: RECURRING PAYMENT FAILED (via metadata)
    // ========================================================================
    if (!subscriptionId && metadata?.type === 'subscription_payment' &&
        (payment.status === 'failed' || payment.status === 'canceled' || payment.status === 'expired')) {
      console.log('LEGACY subscription payment failed for:', metadata.email);

      // Markeer subscription als expired
      await supabase
        .from('subscriptions')
        .update({
          status: 'payment_failed'
        })
        .eq('user_email', metadata.email);

      // Deactiveer student account
      await supabase
        .from('student_profiles')
        .update({
          is_active: false
        })
        .eq('email', metadata.email);
    }

    // Mollie verwacht een 200 response
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 anyway om Mollie te laten weten dat we de webhook hebben ontvangen
    return res.status(200).json({
      received: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
