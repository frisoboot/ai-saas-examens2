/**
 * Vercel Serverless Function - Mollie Webhook
 *
 * Ontvangt betalingsnotificaties van Mollie en:
 * 1. Bij verificatiebetaling (€1.00): activeert account en start trial
 * 2. Bij recurring payment: verlengt subscription
 * 3. Bij failed payment: markeert subscription als expired
 */

import { createClient, User } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMollieClient } from '@mollie/api-client';
import crypto from 'crypto';

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

      // Check of account al VOLLEDIG bestaat (profile + auth user)
      const { data: existingProfile } = await supabase
        .from('student_profiles')
        .select('email, auth_user_id')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile && existingProfile.auth_user_id) {
        console.log('Account already fully exists, skipping creation');
        // Verwijder pending registration
        if (pending) {
          await supabase
            .from('pending_registrations')
            .delete()
            .eq('id', pending.id);
        }
        return res.status(200).json({ received: true, message: 'Account already exists' });
      }

      // Decrypt het wachtwoord dat de gebruiker bij registratie heeft gekozen
      const encryptionKey = process.env.PASSWORD_ENCRYPTION_KEY || mollieApiKey;
      let userPassword: string | null = null;

      if (pending?.password_hash) {
        userPassword = decryptPassword(pending.password_hash, encryptionKey);
        if (!userPassword) {
          // Probeer ook met alleen de mollieApiKey als fallback
          userPassword = decryptPassword(pending.password_hash, mollieApiKey);
        }
      }

      if (!userPassword) {
        console.error('CRITICAL: Could not retrieve user password for:', email);
        console.error('pending_registration has password_hash:', !!pending?.password_hash);
        // Geen tijdelijk wachtwoord genereren - gebruiker zou dan niet kunnen inloggen
        // Mollie zal de webhook opnieuw proberen
        return res.status(500).json({ received: false, error: 'Password decryption failed' });
      }

      // Maak Supabase Auth user aan, of haal bestaande op als die al bestaat
      let authUserId: string | undefined;

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
        // Check of de user al bestaat (bijv. van een eerdere mislukte poging)
        if (authError.message?.includes('already') || authError.message?.includes('exists') ||
            authError.message?.includes('duplicate') || authError.status === 422) {
          console.log('Auth user already exists for:', email, '- looking up existing user');

          // Zoek de bestaande user op
          const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
          const users = (!listError && userList?.users ? userList.users : []) as User[];
          const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

          if (existingUser) {
            authUserId = existingUser.id;
            console.log('Found existing auth user:', authUserId);

            // Update het wachtwoord naar het door de gebruiker gekozen wachtwoord
            await supabase.auth.admin.updateUserById(authUserId, {
              password: userPassword,
              email_confirm: true
            });
            console.log('Updated password for existing auth user');
          } else {
            console.error('Auth user exists but could not be found in user list for:', email);
            return res.status(200).json({ received: true, error: 'Could not find existing auth user' });
          }
        } else {
          console.error('Auth error:', authError);
          return res.status(200).json({ received: true, error: authError.message });
        }
      } else {
        authUserId = authUser.user?.id;
        console.log('Created auth user:', authUserId);
      }

      // Maak student profile aan als dat nog niet bestaat
      if (!existingProfile && authUserId) {
        const { error: profileError } = await supabase
          .from('student_profiles')
          .insert({
            email: email,
            name: email,
            level: level,
            struggle_points: '',
            is_active: true,
            auth_user_id: authUserId
          });

        if (profileError) {
          console.error('Profile error:', profileError);
          // Probeer upsert als fallback (bijv. bij race condition)
          const { error: upsertError } = await supabase
            .from('student_profiles')
            .upsert({
              email: email,
              name: email,
              level: level,
              struggle_points: '',
              is_active: true,
              auth_user_id: authUserId
            }, { onConflict: 'email' });

          if (upsertError) {
            console.error('Profile upsert also failed:', upsertError);
            return res.status(200).json({ received: true, error: upsertError.message });
          }
        }
      } else if (existingProfile && !existingProfile.auth_user_id && authUserId) {
        // Profile bestaat maar zonder auth_user_id - update het
        await supabase
          .from('student_profiles')
          .update({ auth_user_id: authUserId, is_active: true })
          .eq('email', email);
      } else if (existingProfile && existingProfile.auth_user_id) {
        // Profile bestaat met auth_user_id - reactiveer (her-abonneren na verlopen subscription)
        await supabase
          .from('student_profiles')
          .update({ is_active: true })
          .eq('email', email);
        console.log('Reactivated existing profile for re-subscription:', email);
      }

      console.log('Student profile ready for:', email);

      // Bereken trial periode (3 dagen)
      const trialStarted = new Date();
      const trialEnds = new Date(trialStarted);
      trialEnds.setDate(trialEnds.getDate() + 3);

      // Haal Mollie customer ID op
      const customerId = payment.customerId;

      // Check of er al een subscription record bestaat (her-abonneren)
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_email', email)
        .maybeSingle();

      let subscription: { id: string } | null = null;

      if (existingSub) {
        // Her-abonneren: update bestaand record
        console.log('Re-subscription: updating existing subscription record for:', email);
        const { data: updatedSub, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'trial',
            plan_type: 'individual',
            price_cents: 1250,
            trial_started_at: trialStarted.toISOString(),
            trial_ends_at: trialEnds.toISOString(),
            mollie_customer_id: customerId,
            current_period_start: null,
            current_period_end: null
          })
          .eq('id', existingSub.id)
          .select()
          .single();

        if (updateError) {
          console.error('Subscription update error:', updateError);
        } else {
          subscription = updatedSub;
          console.log('Updated subscription:', subscription?.id);
        }
      } else {
        // Nieuwe subscription
        const { data: newSub, error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            user_email: email,
            user_name: email,
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
          console.error('Subscription insert error:', subscriptionError);
        } else {
          subscription = newSub;
          console.log('Created subscription:', subscription?.id);
        }
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
