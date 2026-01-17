/**
 * Admin Login API - Simpel en veilig
 *
 * Verifieert admin credentials en geeft een signed token terug.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, getClientIP, rateLimits } from './utils/rateLimiter';
import { setCorsHeaders } from './utils/cors';
import { generateAdminToken } from './utils/adminAuth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(`admin-login:${clientIP}`, rateLimits.adminLogin);

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return res.status(429).json({
      success: false,
      error: `Te veel pogingen. Wacht ${rateLimit.retryAfter} seconden.`
    });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Gebruikersnaam en wachtwoord zijn verplicht'
      });
    }

    // Haal admin credentials uit environment
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || adminPassword.length < 12) {
      console.error('ADMIN_PASSWORD niet of incorrect geconfigureerd');
      return res.status(500).json({
        success: false,
        error: 'Server configuratie fout'
      });
    }

    // Verifieer credentials
    if (username === adminUsername && password === adminPassword) {
      const token = generateAdminToken(username);

      return res.status(200).json({
        success: true,
        token,
        admin: {
          username: adminUsername
        }
      });
    }

    // Timing attack prevention
    await new Promise(resolve => setTimeout(resolve, 100));

    return res.status(401).json({
      success: false,
      error: 'Gebruikersnaam of wachtwoord onjuist'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Er ging iets mis'
    });
  }
}
