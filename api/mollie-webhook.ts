/**
 * Vercel Serverless Function - Mollie Webhook
 *
 * Ontvangt betalingsnotificaties van Mollie en:
 * 1. Bij trial-betaling (€2.00, type='trial'): activeert account, start 5-daagse proefperiode
 *    en plant recurring Mollie subscription die na de trial start
 * 2. Bij recurring subscription payment (via subscriptionId): verlengt abonnement
 * 3. Bij failed recurring payment: markeert subscription als payment_failed
 * 4. [LEGACY] Bij type='verification' (€14.95): activeert account direct actief (oude flow)
 * 5. [LEGACY] Bij type='one_time_purchase': activeert eenmalig pakket (oude flow)
 * 6. [LEGACY] Bij type='subscription_payment' zonder subscriptionId: verlengt via metadata
 */

import { createClient, User } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createMollieClient } from '@mollie/api-client';
import crypto from 'crypto';
import {
  sendWelcomeEmail,
  sendSubscriptionRenewedEmail,
  sendPaymentFailedEmail,
} from './utils/emailService.js';

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
      plan?: string;
      subscriptionAmountCents?: number | string;
      trialDays?: number | string;
    } | null;

    if (!metadata) {
      console.log('No metadata in payment, skipping');
      return res.status(200).json({ received: true });
    }

    // Idempotency check: skip if this payment was already processed
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('mollie_payment_id', paymentId)
      .maybeSingle();

    if (existingPayment) {
      console.log('Webhook already processed for payment:', paymentId);
      return res.status(200).json({ received: true, alreadyProcessed: true });
    }

    // ========================================================================
    // HELPER: Create or find account (used by both verification and one-time purchase)
    // ========================================================================
    async function createOrFindAccount(
      pendingData: { email: string; level: string; password_hash?: string; id?: string } | null,
      metadataEmail?: string,
      metadataLevel?: string
    ): Promise<{ success: boolean; email: string; authUserId?: string; error?: string }> {
      const email = pendingData?.email || metadataEmail;
      const level = pendingData?.level || metadataLevel;

      if (!email || !level) {
        return { success: false, email: '', error: 'Missing registration data' };
      }

      // Check of account al VOLLEDIG bestaat (profile + auth user)
      const { data: existingProfile } = await supabase
        .from('student_profiles')
        .select('email, auth_user_id')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile && existingProfile.auth_user_id) {
        console.log('Account already fully exists, skipping creation');
        if (pendingData?.id) {
          await supabase.from('pending_registrations').delete().eq('id', pendingData.id);
        }
        // Reactiveer profiel bij her-abonneren
        await supabase.from('student_profiles').update({ is_active: true }).eq('email', email);
        return { success: true, email, authUserId: existingProfile.auth_user_id };
      }

      // Decrypt het wachtwoord
      const encryptionKey = process.env.PASSWORD_ENCRYPTION_KEY || mollieApiKey;
      let userPassword: string | null = null;

      if (pendingData?.password_hash) {
        userPassword = decryptPassword(pendingData.password_hash, encryptionKey);
        if (!userPassword) {
          userPassword = decryptPassword(pendingData.password_hash, mollieApiKey);
        }
      }

      if (!userPassword) {
        console.error('CRITICAL: Could not retrieve user password for:', email);
        return { success: false, email, error: 'Password decryption failed' };
      }

      // Maak Supabase Auth user aan, of haal bestaande op
      let authUserId: string | undefined;

      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: userPassword,
        email_confirm: true,
        user_metadata: { role: 'student', level: level }
      });

      if (authError) {
        if (authError.message?.includes('already') || authError.message?.includes('exists') ||
            authError.message?.includes('duplicate') || authError.status === 422) {
          console.log('Auth user already exists for:', email);
          const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
          const users = (!listError && userList?.users ? userList.users : []) as User[];
          const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

          if (existingUser) {
            authUserId = existingUser.id;
            await supabase.auth.admin.updateUserById(authUserId, { password: userPassword, email_confirm: true });
          } else {
            return { success: false, email, error: 'Could not find existing auth user' };
          }
        } else {
          return { success: false, email, error: authError.message };
        }
      } else {
        authUserId = authUser.user?.id;
        console.log('Created auth user:', authUserId);
      }

      // Maak student profile aan als dat nog niet bestaat
      if (!existingProfile && authUserId) {
        const { error: profileError } = await supabase.from('student_profiles').insert({
          email, name: email, level, struggle_points: '', is_active: true, auth_user_id: authUserId
        });
        if (profileError) {
          const { error: upsertError } = await supabase.from('student_profiles').upsert({
            email, name: email, level, struggle_points: '', is_active: true, auth_user_id: authUserId
          }, { onConflict: 'email' });
          if (upsertError) {
            return { success: false, email, error: upsertError.message };
          }
        }
      } else if (existingProfile && !existingProfile.auth_user_id && authUserId) {
        await supabase.from('student_profiles').update({ auth_user_id: authUserId, is_active: true }).eq('email', email);
      } else if (existingProfile && existingProfile.auth_user_id) {
        await supabase.from('student_profiles').update({ is_active: true }).eq('email', email);
        console.log('Reactivated existing profile for re-subscription:', email);
      }

      console.log('Student profile ready for:', email);
      return { success: true, email, authUserId };
    }

    // ========================================================================
    // TRIAL BETALING (€2.00) - Account activatie + 5-daagse proefperiode
    // ========================================================================
    if (metadata.type === 'trial' && payment.status === 'paid') {
      console.log('Processing trial payment for:', metadata.email, 'plan:', metadata.plan);

      let { data: pending } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('mollie_payment_id', paymentId)
        .maybeSingle();

      // Fallback: als de pending_registration nog 'pending' als payment ID heeft
      // (kan gebeuren bij race condition of als de update in create-checkout faalde)
      if (!pending && metadata.email) {
        const { data: pendingByEmail } = await supabase
          .from('pending_registrations')
          .select('*')
          .eq('email', metadata.email.toLowerCase())
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingByEmail) {
          console.warn('[Trial] Pending found by email fallback (payment ID mismatch):', metadata.email);
          pending = pendingByEmail;

          // Update de pending registration met het juiste payment ID
          await supabase
            .from('pending_registrations')
            .update({ mollie_payment_id: paymentId })
            .eq('id', pendingByEmail.id);
        }
      }

      const accountResult = await createOrFindAccount(pending, metadata.email, metadata.level);
      if (!accountResult.success) {
        if (accountResult.error === 'Password decryption failed') {
          return res.status(500).json({ received: false, error: accountResult.error });
        }
        return res.status(200).json({ received: true, error: accountResult.error });
      }

      const email = accountResult.email;
      const plan = (metadata.plan as string) || 'monthly';
      const trialDays = Number(metadata.trialDays) || 5;
      const subscriptionAmountCents = Number(metadata.subscriptionAmountCents) || 995;
      const subscriptionAmountStr = (subscriptionAmountCents / 100).toFixed(2);

      const now = new Date();
      const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
      const customerId = payment.customerId;

      const planIntervals: Record<string, string> = {
        monthly: '1 month',
        quarterly: '3 months',
        yearly: '12 months',
      };
      const planDescriptions: Record<string, string> = {
        monthly: 'AI Examentrainer - Maandelijks abonnement',
        quarterly: 'AI Examentrainer - Kwartaalabonnement',
        yearly: 'AI Examentrainer - Jaarpakket',
      };

      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_email', email)
        .maybeSingle();

      let subscription: { id: string } | null = null;
      const subData = {
        status: 'trial',
        plan_type: plan,
        price_cents: subscriptionAmountCents,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
        mollie_customer_id: customerId,
        mollie_subscription_id: null as string | null,
      };

      if (existingSub) {
        const { data: updatedSub, error: updateError } = await supabase
          .from('subscriptions')
          .update(subData)
          .eq('id', existingSub.id)
          .select()
          .single();
        if (updateError) {
          console.error('Trial subscription update error:', updateError);
        } else {
          subscription = updatedSub;
        }
      } else {
        const { data: newSub, error: insertError } = await supabase
          .from('subscriptions')
          .insert({ user_email: email, user_name: email, ...subData })
          .select()
          .single();
        if (insertError) {
          console.error('Trial subscription insert error:', insertError);
        } else {
          subscription = newSub;
        }
      }

      // Log de €2 trial betaling
      await supabase.from('payments').insert({
        subscription_id: subscription?.id,
        mollie_payment_id: paymentId,
        amount_cents: 200,
        currency: 'EUR',
        status: 'paid',
        description: `Proefperiode betaling - ${planDescriptions[plan] || plan}`,
        payment_method: payment.method || null,
        paid_at: payment.paidAt || new Date().toISOString(),
      });

      // Maak Mollie recurring subscription aan die start na de proefperiode
      if (customerId) {
        try {
          const mandates = await mollie.customerMandates.page({ customerId });
          const validMandate = mandates.find(m => m.status === 'valid' || m.status === 'pending');

          if (!validMandate) {
            console.error('No valid mandate after trial payment for customer:', customerId);
          } else {
            const startDate = trialEnd.toISOString().split('T')[0];
            const mollieSubscription = await mollie.customerSubscriptions.create({
              customerId,
              amount: { value: subscriptionAmountStr, currency: 'EUR' },
              interval: planIntervals[plan] || '1 month',
              description: planDescriptions[plan] || 'AI Examentrainer abonnement',
              startDate,
              webhookUrl: `${appUrl}/api/mollie-webhook`,
              metadata: { type: 'subscription_payment', email, plan },
            });

            console.log('Created Mollie subscription:', mollieSubscription.id, 'starts:', startDate, 'interval:', planIntervals[plan]);

            await supabase
              .from('subscriptions')
              .update({ mollie_subscription_id: mollieSubscription.id })
              .eq('user_email', email);
          }
        } catch (subError) {
          console.error('Error creating Mollie subscription after trial:', subError);
          // Niet fataal: gebruiker heeft 5 dagen trial toegang
        }
      }

      if (pending) {
        await supabase.from('pending_registrations').delete().eq('id', pending.id);
        console.log('Deleted pending registration for trial:', email);
      }

      // Stuur welcome email
      try {
        await sendWelcomeEmail(email, metadata.level || 'HAVO', trialEnd);
        console.log('Welcome email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send welcome email (non-fatal):', emailError);
      }

      console.log('Trial activation complete for:', email, 'trial until:', trialEnd.toISOString());
    }

    // ========================================================================
    // TRIAL BETALING - Mislukt/Geannuleerd
    // ========================================================================
    if (metadata.type === 'trial' &&
        (payment.status === 'failed' || payment.status === 'canceled' || payment.status === 'expired')) {
      console.log('Trial payment failed/cancelled for:', metadata.email);
      await supabase
        .from('pending_registrations')
        .delete()
        .eq('mollie_payment_id', paymentId);
    }

    // ========================================================================
    // [LEGACY] EERSTE BETALING (€14.95, type='verification') - Niet meer gebruikt
    // door create-checkout.ts. Nieuwe accounts gaan via de trial-flow hierboven.
    // Dit blok blijft actief voor betalingen die vóór de trial-flow zijn aangemaakt.
    // ========================================================================
    if (metadata.type === 'verification' && payment.status === 'paid') {
      console.log('Processing first payment for:', metadata.email);

      let { data: pending } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('mollie_payment_id', paymentId)
        .maybeSingle();

      // Fallback: zoek op email als payment ID niet matcht
      if (!pending && metadata.email) {
        const { data: pendingByEmail } = await supabase
          .from('pending_registrations')
          .select('*')
          .eq('email', metadata.email.toLowerCase())
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingByEmail) {
          console.warn('[Verification] Pending found by email fallback:', metadata.email);
          pending = pendingByEmail;
        }
      }

      const accountResult = await createOrFindAccount(pending, metadata.email, metadata.level);
      if (!accountResult.success) {
        if (accountResult.error === 'Password decryption failed') {
          return res.status(500).json({ received: false, error: accountResult.error });
        }
        return res.status(200).json({ received: true, error: accountResult.error });
      }

      const email = accountResult.email;

      // Direct actief abonnement - geen trial
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const customerId = payment.customerId;

      // Check of er al een subscription record bestaat (her-abonneren)
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_email', email)
        .maybeSingle();

      let subscription: { id: string } | null = null;

      if (existingSub) {
        console.log('Re-subscription: updating existing subscription record for:', email);
        const { data: updatedSub, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            plan_type: 'monthly',
            price_cents: 1495,
            trial_started_at: null,
            trial_ends_at: null,
            mollie_customer_id: customerId,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString()
          })
          .eq('id', existingSub.id)
          .select()
          .single();

        if (updateError) {
          console.error('Subscription update error:', updateError);
        } else {
          subscription = updatedSub;
        }
      } else {
        const { data: newSub, error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            user_email: email,
            user_name: email,
            status: 'active',
            plan_type: 'monthly',
            price_cents: 1495,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            mollie_customer_id: customerId
          })
          .select()
          .single();

        if (subscriptionError) {
          console.error('Subscription insert error:', subscriptionError);
        } else {
          subscription = newSub;
        }
      }

      // Log eerste betaling
      await supabase
        .from('payments')
        .insert({
          subscription_id: subscription?.id,
          mollie_payment_id: paymentId,
          amount_cents: 1495,
          currency: 'EUR',
          status: 'paid',
          description: 'Eerste betaling - Maandelijks abonnement',
          payment_method: payment.method || null,
          paid_at: payment.paidAt || new Date().toISOString()
        });

      // Maak Mollie subscription aan na proefperiode (bedrag afhankelijk van gekozen plan)
      if (customerId) {
        try {
          const mandates = await mollie.customerMandates.page({ customerId: customerId });
          const validMandate = mandates.find(m => m.status === 'valid' || m.status === 'pending');

          if (!validMandate) {
            console.error('No valid mandate found for customer:', customerId);
            console.log('Available mandates:', mandates.map(m => ({ id: m.id, status: m.status, method: m.method })));
          } else {
            console.log('Found valid mandate:', validMandate.id, 'method:', validMandate.method, 'status:', validMandate.status);
            const startDate = periodEnd.toISOString().split('T')[0];

            const mollieSubscription = await mollie.customerSubscriptions.create({
              customerId: customerId,
              amount: { value: '14.95', currency: 'EUR' },
              interval: '1 month',
              description: 'AI Examentrainer - Maandelijks abonnement',
              startDate: startDate,
              webhookUrl: `${appUrl}/api/mollie-webhook`,
              metadata: { type: 'subscription_payment', email: email }
            });

            console.log('Created Mollie subscription:', mollieSubscription.id, 'starts:', startDate);
            await supabase
              .from('subscriptions')
              .update({ mollie_subscription_id: mollieSubscription.id })
              .eq('user_email', email);
          }
        } catch (subError) {
          console.error('Error creating Mollie subscription:', subError);
        }
      }

      // Verwijder pending registration
      if (pending) {
        await supabase.from('pending_registrations').delete().eq('id', pending.id);
        console.log('Deleted pending registration');
      }

      // Stuur welcome email
      try {
        await sendWelcomeEmail(email, metadata.level || 'HAVO', periodEnd);
        console.log('Welcome email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send welcome email (non-fatal):', emailError);
      }

      console.log('Account activation complete for:', email);
    }

    // ========================================================================
    // ONE-TIME PURCHASE (exam_package / yearly) - Account activatie + direct actief
    // ========================================================================
    if (metadata.type === 'one_time_purchase' && payment.status === 'paid') {
      const plan = metadata.plan || 'exam_package';
      console.log('Processing one-time purchase for:', metadata.email, 'plan:', plan);

      let { data: pending } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('mollie_payment_id', paymentId)
        .maybeSingle();

      // Fallback: zoek op email als payment ID niet matcht
      if (!pending && metadata.email) {
        const { data: pendingByEmail } = await supabase
          .from('pending_registrations')
          .select('*')
          .eq('email', metadata.email.toLowerCase())
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pendingByEmail) {
          console.warn('[OneTimePurchase] Pending found by email fallback:', metadata.email);
          pending = pendingByEmail;
        }
      }

      const accountResult = await createOrFindAccount(pending, metadata.email, metadata.level);
      if (!accountResult.success) {
        if (accountResult.error === 'Password decryption failed') {
          return res.status(500).json({ received: false, error: accountResult.error });
        }
        return res.status(200).json({ received: true, error: accountResult.error });
      }

      const email = accountResult.email;

      // Bereken periode - direct actief, geen trial
      const now = new Date();
      const periodEnd = new Date(now);
      const durationMonths = plan === 'yearly' ? 12 : 4;
      periodEnd.setMonth(periodEnd.getMonth() + durationMonths);

      const priceCents = plan === 'yearly' ? 9900 : 3900;
      const customerId = payment.customerId;

      // Check of er al een subscription record bestaat (her-abonneren)
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_email', email)
        .maybeSingle();

      let subscription: { id: string } | null = null;

      if (existingSub) {
        console.log('Re-subscription (one-time): updating existing record for:', email);
        const { data: updatedSub, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            plan_type: plan,
            price_cents: priceCents,
            trial_started_at: null,
            trial_ends_at: null,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            mollie_customer_id: customerId,
            mollie_subscription_id: null,
          })
          .eq('id', existingSub.id)
          .select()
          .single();

        if (updateError) {
          console.error('Subscription update error:', updateError);
        } else {
          subscription = updatedSub;
        }
      } else {
        const { data: newSub, error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            user_email: email,
            user_name: email,
            status: 'active',
            plan_type: plan,
            price_cents: priceCents,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            mollie_customer_id: customerId,
          })
          .select()
          .single();

        if (subscriptionError) {
          console.error('Subscription insert error:', subscriptionError);
        } else {
          subscription = newSub;
        }
      }

      // Log payment
      await supabase
        .from('payments')
        .insert({
          subscription_id: subscription?.id,
          mollie_payment_id: paymentId,
          amount_cents: priceCents,
          currency: 'EUR',
          status: 'paid',
          description: plan === 'yearly' ? 'Jaarpakket (12 maanden)' : 'Examenpakket (4 maanden)',
          payment_method: payment.method || null,
          paid_at: payment.paidAt || new Date().toISOString()
        });

      // Geen Mollie recurring subscription aanmaken - dit is een eenmalige betaling

      // Verwijder pending registration
      if (pending) {
        await supabase.from('pending_registrations').delete().eq('id', pending.id);
        console.log('Deleted pending registration');
      }

      // Stuur welcome email
      try {
        await sendWelcomeEmail(email, metadata.level || 'HAVO', periodEnd);
        console.log('Welcome email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send welcome email (non-fatal):', emailError);
      }

      console.log('One-time purchase activation complete for:', email, 'plan:', plan, 'active until:', periodEnd.toISOString());
    }

    // ========================================================================
    // RESUBSCRIPTION - Bestaande gebruiker heractiveert abonnement (ingelogd)
    // Betaalt direct het volledige abonnementsbedrag (geen trial)
    // ========================================================================
    if (metadata.type === 'resubscription' && payment.status === 'paid') {
      const email = metadata.email!;
      const plan = metadata.plan || 'monthly';
      console.log('Processing resubscription for:', email, 'plan:', plan);

      const now = new Date();
      const periodEnd = new Date(now);

      const durationMonthsByPlan: Record<string, number> = {
        monthly: 1, quarterly: 3, yearly: 12, individual: 1, exam_package: 4,
      };
      const durationMonths = durationMonthsByPlan[plan] || 1;
      periodEnd.setMonth(periodEnd.getMonth() + durationMonths);

      const priceCentsByPlan: Record<string, number> = {
        monthly: 995, quarterly: 2495, yearly: 7900, individual: 995, exam_package: 3900,
      };
      const priceCents = priceCentsByPlan[plan] || 995;

      const planAmountsByPlan: Record<string, string> = {
        monthly: '9.95', quarterly: '24.95', yearly: '79.00',
      };
      const planIntervals: Record<string, string> = {
        monthly: '1 month', quarterly: '3 months', yearly: '12 months',
      };
      const planDescriptions: Record<string, string> = {
        monthly: 'AI Examentrainer - Maandelijks abonnement',
        quarterly: 'AI Examentrainer - Kwartaalabonnement',
        yearly: 'AI Examentrainer - Jaarpakket',
      };

      const customerId = payment.customerId;

      // Update bestaande subscription of maak nieuwe aan
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_email', email)
        .maybeSingle();

      let subscription: { id: string } | null = null;

      if (existingSub) {
        const { data: updatedSub, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            plan_type: plan,
            price_cents: priceCents,
            trial_started_at: null,
            trial_ends_at: null,
            mollie_customer_id: customerId,
            mollie_subscription_id: null,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString()
          })
          .eq('id', existingSub.id)
          .select()
          .single();

        if (updateError) {
          console.error('Resubscription update error:', updateError);
        } else {
          subscription = updatedSub;
        }
      } else {
        const { data: newSub, error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_email: email,
            user_name: email,
            status: 'active',
            plan_type: plan,
            price_cents: priceCents,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            mollie_customer_id: customerId,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Resubscription insert error:', insertError);
        } else {
          subscription = newSub;
        }
      }

      // Reactiveer student profiel
      await supabase
        .from('student_profiles')
        .update({ is_active: true })
        .eq('email', email);

      // Log betaling
      await supabase
        .from('payments')
        .insert({
          subscription_id: subscription?.id,
          mollie_payment_id: paymentId,
          amount_cents: priceCents,
          currency: 'EUR',
          status: 'paid',
          description: `Herabonnering - ${planDescriptions[plan] || plan}`,
          payment_method: payment.method || null,
          paid_at: payment.paidAt || new Date().toISOString()
        });

      // Maak Mollie recurring subscription aan voor alle recurring plannen
      if (customerId && planIntervals[plan]) {
        try {
          const mandates = await mollie.customerMandates.page({ customerId });
          const validMandate = mandates.find(m => m.status === 'valid' || m.status === 'pending');

          if (validMandate) {
            const startDate = periodEnd.toISOString().split('T')[0];
            const mollieSubscription = await mollie.customerSubscriptions.create({
              customerId,
              amount: { value: planAmountsByPlan[plan] || '9.95', currency: 'EUR' },
              interval: planIntervals[plan],
              description: planDescriptions[plan] || 'AI Examentrainer abonnement',
              startDate,
              webhookUrl: `${appUrl}/api/mollie-webhook`,
              metadata: { type: 'subscription_payment', email, plan }
            });

            await supabase
              .from('subscriptions')
              .update({ mollie_subscription_id: mollieSubscription.id })
              .eq('user_email', email);

            console.log('Created recurring subscription for resubscription:', mollieSubscription.id);
          }
        } catch (subError) {
          console.error('Error creating recurring subscription:', subError);
        }
      }

      // Stuur bevestigingsmail
      try {
        await sendSubscriptionRenewedEmail(email, plan, periodEnd);
        console.log('Subscription renewed email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send renewal email (non-fatal):', emailError);
      }

      console.log('Resubscription complete for:', email, 'plan:', plan);
    }

    // ========================================================================
    // [LEGACY] VERIFICATIE / ONE-TIME PURCHASE - Failed/Cancelled
    // ========================================================================
    if ((metadata.type === 'verification' || metadata.type === 'one_time_purchase') &&
        (payment.status === 'failed' || payment.status === 'canceled' || payment.status === 'expired')) {
      console.log('Payment failed for:', metadata.email, 'type:', metadata.type);

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
        console.log('Found subscription for user:', subscription.user_email, 'plan:', subscription.plan_type);

        const now = new Date();
        const periodEnd = new Date(now);

        // Plan-aware periode berekening (i.p.v. hardcoded 1 maand)
        const durationMonthsByPlan: Record<string, number> = {
          monthly: 1, quarterly: 3, yearly: 12, individual: 1, exam_package: 4,
        };
        const durationMonths = durationMonthsByPlan[subscription.plan_type] || 1;
        periodEnd.setMonth(periodEnd.getMonth() + durationMonths);

        const planDescriptions: Record<string, string> = {
          monthly: 'Maandelijks abonnement',
          quarterly: 'Kwartaalabonnement',
          yearly: 'Jaarpakket',
        };

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',  // trial → active bij eerste recurring payment
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString()
          })
          .eq('id', subscription.id);

        // Log payment (bedrag uit subscription record)
        await supabase
          .from('payments')
          .insert({
            subscription_id: subscription.id,
            mollie_payment_id: paymentId,
            amount_cents: subscription.price_cents || 995,
            currency: 'EUR',
            status: 'paid',
            description: planDescriptions[subscription.plan_type] || 'Abonnementsbetaling',
            payment_method: payment.method || null,
            paid_at: payment.paidAt || new Date().toISOString()
          });

        // Stuur verlengingsmail
        try {
          await sendSubscriptionRenewedEmail(subscription.user_email, subscription.plan_type, periodEnd);
          console.log('Subscription renewed email sent to:', subscription.user_email);
        } catch (emailError) {
          console.error('Failed to send renewal email (non-fatal):', emailError);
        }

        console.log('Subscription payment processed for:', subscription.user_email, 'new period end:', periodEnd.toISOString());
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

        // Stuur betaling mislukt email
        try {
          await sendPaymentFailedEmail(subscription.user_email);
          console.log('Payment failed email sent to:', subscription.user_email);
        } catch (emailError) {
          console.error('Failed to send payment failed email (non-fatal):', emailError);
        }

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
          amount_cents: 1495,
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

      // Stuur betaling mislukt email
      try {
        await sendPaymentFailedEmail(metadata.email!);
        console.log('Payment failed email sent to:', metadata.email);
      } catch (emailError) {
        console.error('Failed to send payment failed email (non-fatal):', emailError);
      }
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
