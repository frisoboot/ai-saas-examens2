import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createMollieClient, type Payment } from '@mollie/api-client';
import { sendWelcomeEmail } from '../services/emailService';
import { checkRateLimit, getClientIP, rateLimits } from './utils/rateLimiter';

/**
 * SECURITY: Validates webhook URL to prevent SSRF attacks
 * - Only allows configured app domain
 * - Blocks private IP ranges, localhost, and internal networks
 * - Ensures HTTPS in production
 */
function isValidWebhookUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // SECURITY: Block private IP ranges and localhost
    const privatePatterns = [
      /^127\./,                          // Loopback IPv4
      /^localhost$/i,                     // Localhost
      /^192\.168\./,                      // RFC 1918 Class C
      /^10\./,                            // RFC 1918 Class A
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // RFC 1918 Class B
      /^169\.254\./,                      // Link-local
      /^0\./,                             // Current network
      /^::1$/,                            // IPv6 loopback
      /^fe80:/i,                          // IPv6 link-local
      /^fc00:/i,                          // IPv6 unique local
      /^fd[0-9a-f]{2}:/i,                // IPv6 unique local
      /\.local$/i,                        // mDNS/local domains
      /\.internal$/i,                     // Internal domains
      /\.localhost$/i,                    // Localhost subdomains
      /^modem\./i,                        // Common router names
      /^router\./i,
      /^gateway\./i,
      /^admin\./i,
    ];

    for (const pattern of privatePatterns) {
      if (pattern.test(hostname)) {
        console.warn(`[SECURITY] Blocked private/internal URL: ${hostname}`);
        return false;
      }
    }

    // SECURITY: Block non-standard ports commonly used by routers/modems
    const blockedPorts = [80, 8080, 8000, 8443, 443, 22, 23, 25, 53, 110, 143, 445, 3389, 5900];
    const port = urlObj.port ? parseInt(urlObj.port) : (urlObj.protocol === 'https:' ? 443 : 80);
    // Allow standard HTTPS (443) and HTTP (80), but block other common service ports
    if (![80, 443].includes(port) && blockedPorts.includes(port)) {
      console.warn(`[SECURITY] Blocked suspicious port: ${port}`);
      return false;
    }

    // SECURITY: In production, require HTTPS
    if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:') {
      console.warn(`[SECURITY] Blocked non-HTTPS URL in production: ${url}`);
      return false;
    }

    // SECURITY: Whitelist allowed domains
    const allowedDomains = [
      process.env.VITE_APP_URL ? new URL(process.env.VITE_APP_URL).hostname : null,
      // Add any other allowed domains here
    ].filter(Boolean) as string[];

    if (allowedDomains.length > 0 && !allowedDomains.includes(hostname)) {
      console.warn(`[SECURITY] Domain not in whitelist: ${hostname}. Allowed: ${allowedDomains.join(', ')}`);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[SECURITY] Invalid URL:', url, e);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Register student endpoint called');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting to prevent spam registrations
  const clientIP = getClientIP(req);
  const rateLimitKey = `registration:${clientIP}`;
  const rateLimit = checkRateLimit(rateLimitKey, rateLimits.registration);

  if (!rateLimit.allowed) {
    console.log(`[RATE LIMIT] Registration blocked for IP: ${clientIP}`);
    return res.status(429).json({
      error: 'Te veel registraties. Probeer het later opnieuw.'
    });
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

  // SECURITY: Validate name to prevent injection attacks
  const trimmedName = String(name).trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    return res.status(400).json({ error: 'Naam moet tussen 2 en 100 karakters zijn' });
  }
  // Only allow letters, numbers, spaces, hyphens, apostrophes, and common accented characters
  const nameRegex = /^[\p{L}\p{N}\s\-'.]+$/u;
  if (!nameRegex.test(trimmedName)) {
    return res.status(400).json({ error: 'Naam bevat ongeldige karakters' });
  }

  // SECURITY: Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Ongeldig emailadres' });
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
    // SECURITY: Use only configured app URL for webhooks to prevent SSRF
    const configuredAppUrl = process.env.VITE_APP_URL;
    if (!configuredAppUrl) {
      console.error('[SECURITY] VITE_APP_URL environment variable not set');
      return res.status(500).json({ error: 'Server configuratie fout: kon webhook URL niet bepalen.' });
    }

    // Construct webhook URL from configured app URL only (never from request headers)
    const webhookUrl = `${configuredAppUrl.replace(/\/$/, '')}/api/mollie-webhook`;

    // SECURITY: Validate the webhook URL before using it
    if (!isValidWebhookUrl(webhookUrl)) {
      console.error(`[SECURITY] Invalid webhook URL rejected: ${webhookUrl}`);
      return res.status(500).json({ error: 'Server configuratie fout: ongeldige webhook URL.' });
    }

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

    // Step 5: Create subscription (starts after 7 days)
    const trialDays = 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + trialDays);

    console.log('Creating Mollie subscription starting at:', startDate.toISOString().split('T')[0]);

    const subscription = await mollieClient.customerSubscriptions.create({
      customerId: customer.id,
      amount: {
        currency: 'EUR',
        value: '12.50'
      },
      interval: '1 month',
      description: 'AI Examen Trainer Abonnement',
      webhookUrl: webhookUrl,
      startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
      metadata: {
        type: 'subscription_payment',
        studentName: name,
        level: level
      }
    });

    console.log('Mollie subscription created:', subscription.id);

    // Step 6: Update profile with Mollie IDs
    await supabaseAdmin
      .from('student_profiles')
      .update({
        mollie_customer_id: customer.id,
        mollie_subscription_id: subscription.id
      })
      .eq('name', name);

    console.log('Profile updated with Mollie IDs');

    // Step 7: Send welcome email (don't block if it fails)
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
      customerId: customer.id,
      subscriptionId: subscription.id
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
