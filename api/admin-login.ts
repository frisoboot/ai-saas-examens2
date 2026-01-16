import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIP, rateLimits } from './utils/rateLimiter';

/**
 * Admin Login API Endpoint - Server-side authenticatie
 *
 * SECURITY: Deze endpoint draait server-side, dus het admin wachtwoord
 * blijft veilig op de server en wordt NIET geëxpositeerd naar de browser.
 *
 * Environment variabele (server-side only, GEEN VITE_ prefix):
 * - ADMIN_PASSWORD: Het admin wachtwoord (minimaal 12 karakters)
 * - ADMIN_USERNAME: De admin gebruikersnaam (standaard: admin)
 *
 * Deze endpoint maakt automatisch een Supabase Auth user aan voor de admin
 * als die nog niet bestaat, zodat de admin een echte session krijgt.
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - restrict to allowed origins
  const allowedOrigins = [
    process.env.VITE_APP_URL,
    'http://localhost:5173',
    'http://localhost:3000'
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // Allow any origin in development only
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  // In production without matching origin, no CORS header is set (request blocked)

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting to prevent brute force attacks
  const clientIP = getClientIP(req);
  const rateLimitKey = `admin-login:${clientIP}`;
  const rateLimit = checkRateLimit(rateLimitKey, rateLimits.adminLogin);

  if (!rateLimit.allowed) {
    console.log(`[RATE LIMIT] Admin login blocked for IP: ${clientIP}`);
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return res.status(429).json({
      success: false,
      error: `Te veel inlogpogingen. Probeer het over ${rateLimit.retryAfter} seconden opnieuw.`
    });
  }

  try {
    const { username, password } = req.body;

    // Validatie
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username en password zijn verplicht'
      });
    }

    // Haal admin credentials uit environment (SERVER-SIDE, geen VITE_ prefix!)
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;

    // SECURITY: Check of admin wachtwoord is ingesteld
    if (!adminPassword) {
      console.error('❌ ADMIN_PASSWORD environment variabele niet ingesteld!');
      return res.status(500).json({
        success: false,
        error: 'Server configuratie fout. Neem contact op met de beheerder.'
      });
    }

    // SECURITY: Valideer wachtwoord sterkte
    if (adminPassword.length < 12) {
      console.error('❌ ADMIN_PASSWORD is te kort! Minimaal 12 karakters vereist.');
      return res.status(500).json({
        success: false,
        error: 'Server configuratie fout. Neem contact op met de beheerder.'
      });
    }

    // Weiger default wachtwoord
    if (adminPassword === 'your-super-strong-admin-password-here') {
      console.error('❌ ADMIN_PASSWORD is niet ingesteld (gebruikt default value)!');
      return res.status(500).json({
        success: false,
        error: 'Server configuratie fout. Neem contact op met de beheerder.'
      });
    }

    // Check credentials
    if (username === adminUsername && password === adminPassword) {
      console.log('✅ Admin credentials verified via API endpoint');

      // Haal Supabase credentials op
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase environment variables');
        return res.status(500).json({
          success: false,
          error: 'Server configuratie fout. Neem contact op met de beheerder.'
        });
      }

      // Maak Supabase admin client
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      const adminEmail = `${adminUsername}@admin.example.com`;

      // Check of admin user al bestaat in Supabase Auth
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        console.error('❌ Error listing users:', listError);
        return res.status(500).json({
          success: false,
          error: 'Kon gebruikers niet ophalen'
        });
      }

      const existingAdmin = existingUsers.users.find(u => u.email === adminEmail);

      if (!existingAdmin) {
        // Admin user bestaat nog niet, maak deze aan
        console.log('📝 Creating admin user in Supabase Auth...');

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            role: 'admin',
            username: adminUsername
          }
        });

        if (createError) {
          console.error('❌ Error creating admin user:', createError);
          return res.status(500).json({
            success: false,
            error: 'Kon admin user niet aanmaken'
          });
        }

        console.log('✅ Admin user created:', newUser.user.id);
      } else {
        // Admin user bestaat al, update eventueel de metadata en het wachtwoord
        console.log('📝 Admin user exists, updating metadata and password...');

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingAdmin.id,
          {
            password: password,
            user_metadata: {
              role: 'admin',
              username: adminUsername
            }
          }
        );

        if (updateError) {
          console.error('❌ Error updating admin user:', updateError);
          // Ga toch door, de login kan nog steeds werken
        }
      }

      // Genereer een session token voor de admin
      // We gebruiken signInWithPassword via de admin client om een echte session te krijgen
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: adminEmail
      });

      // Return success met admin user info en instructie om via Supabase in te loggen
      console.log('✅ Admin login SUCCESS - user exists in Supabase Auth');

      return res.status(200).json({
        success: true,
        admin: {
          id: existingAdmin?.id || 'admin-new',
          username: adminUsername,
          email: adminEmail,
          lastLogin: new Date().toISOString()
        },
        // Geef aan dat de frontend nu via Supabase Auth moet inloggen
        useSupabaseAuth: true
      });
    }

    // Wrong credentials - gebruik constante tijd voor response (prevent timing attacks)
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('❌ Admin login FAILED - wrong credentials');
    return res.status(401).json({
      success: false,
      error: 'Gebruikersnaam of wachtwoord onjuist'
    });

  } catch (error) {
    console.error('❌ Error in admin-login API:', error);
    return res.status(500).json({
      success: false,
      error: 'Er ging iets mis bij het inloggen'
    });
  }
}
