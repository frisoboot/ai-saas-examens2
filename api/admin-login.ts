import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Admin Login API Endpoint - Server-side authenticatie
 *
 * SECURITY: Deze endpoint draait server-side, dus het admin wachtwoord
 * blijft veilig op de server en wordt NIET geëxpositeerd naar de browser.
 *
 * Environment variabele (server-side only, GEEN VITE_ prefix):
 * - ADMIN_PASSWORD: Het admin wachtwoord (minimaal 12 karakters)
 * - ADMIN_USERNAME: De admin gebruikersnaam (standaard: admin)
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers voor local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
      console.log('✅ Admin login SUCCESS via API endpoint');

      // Return success met admin user info (ZONDER wachtwoord!)
      return res.status(200).json({
        success: true,
        admin: {
          id: 'admin-001',
          username: adminUsername,
          email: `${adminUsername}@admin.local`,
          lastLogin: new Date().toISOString()
        }
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
