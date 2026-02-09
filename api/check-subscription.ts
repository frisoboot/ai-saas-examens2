/**
 * Vercel Serverless Function - Check Subscription
 *
 * Controleert of een gebruiker een actieve subscription heeft.
 * Retourneert subscription status en details.
 */

import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './utils/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - ondersteunt productie, Vercel previews, en localhost
  setCorsHeaders(res, req.headers.origin, 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
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

    // Haal email uit query params (GET) of body (POST)
    const email = req.method === 'GET'
      ? (req.query.email as string)
      : req.body?.email;

    if (!email) {
      return res.status(400).json({ error: 'Email is verplicht' });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Haal subscription op
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription:', error);
      return res.status(500).json({ error: 'Database fout' });
    }

    // Geen subscription gevonden
    if (!subscription) {
      return res.status(200).json({
        hasAccess: false,
        status: 'none',
        message: 'Geen abonnement gevonden',
        planType: null
      });
    }

    // Normalize plan type: treat 'individual' as 'monthly'
    const planType = subscription.plan_type === 'individual' ? 'monthly' : subscription.plan_type;

    const now = new Date();

    // Check trial status
    if (subscription.status === 'trial') {
      const trialEnds = new Date(subscription.trial_ends_at);

      if (trialEnds > now) {
        const daysLeft = Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return res.status(200).json({
          hasAccess: true,
          status: 'trial',
          trialEndsAt: subscription.trial_ends_at,
          daysLeft: daysLeft,
          message: `Proefperiode actief - nog ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagen'}`,
          planType
        });
      } else {
        // Trial verlopen
        return res.status(200).json({
          hasAccess: false,
          status: 'trial_expired',
          message: 'Proefperiode verlopen',
          planType
        });
      }
    }

    // Check active subscription
    if (subscription.status === 'active') {
      const periodEnd = new Date(subscription.current_period_end);

      if (periodEnd > now) {
        return res.status(200).json({
          hasAccess: true,
          status: 'active',
          periodEnd: subscription.current_period_end,
          message: 'Abonnement actief',
          planType
        });
      } else {
        // Subscription verlopen (payment failed?)
        return res.status(200).json({
          hasAccess: false,
          status: 'expired',
          message: 'Abonnement verlopen',
          planType
        });
      }
    }

    // Pending status
    if (subscription.status === 'pending') {
      return res.status(200).json({
        hasAccess: false,
        status: 'pending',
        message: 'Betaling wordt verwerkt',
        planType
      });
    }

    // Cancelled - check of de gebruiker nog tijd heeft in huidige periode
    if (subscription.status === 'cancelled') {
      // Check trial periode
      if (subscription.trial_ends_at) {
        const trialEnds = new Date(subscription.trial_ends_at);
        if (trialEnds > now) {
          const daysLeft = Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return res.status(200).json({
            hasAccess: true,
            status: 'cancelled',
            trialEndsAt: subscription.trial_ends_at,
            daysLeft: daysLeft,
            message: `Opgezegd - nog ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagen'} toegang`,
            planType
          });
        }
      }
      // Check betaalperiode
      if (subscription.current_period_end) {
        const periodEnd = new Date(subscription.current_period_end);
        if (periodEnd > now) {
          const daysLeft = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return res.status(200).json({
            hasAccess: true,
            status: 'cancelled',
            periodEnd: subscription.current_period_end,
            daysLeft: daysLeft,
            message: `Opgezegd - nog ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagen'} toegang`,
            planType
          });
        }
      }
    }

    // Expired/overige statussen
    return res.status(200).json({
      hasAccess: false,
      status: subscription.status,
      message: 'Abonnement niet actief',
      planType
    });

  } catch (error) {
    console.error('Check subscription error:', error);
    return res.status(500).json({
      error: 'Er ging iets mis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
