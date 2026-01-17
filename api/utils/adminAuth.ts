/**
 * Admin Authentication Utility
 *
 * Simpel en veilig token systeem voor admin authenticatie.
 * Tokens zijn HMAC-signed met een secret en verlopen na 24 uur.
 */

import type { VercelRequest } from '@vercel/node';
import { createHmac } from 'crypto';

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 uur

/**
 * Genereer een admin token
 */
export function generateAdminToken(username: string): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error('ADMIN_PASSWORD niet geconfigureerd');
  }

  const timestamp = Date.now();
  const payload = `${username}:${timestamp}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');

  // Token format: base64(username:timestamp:signature)
  const token = Buffer.from(`${payload}:${signature}`).toString('base64');
  return token;
}

/**
 * Verifieer een admin token
 * Retourneert de username als geldig, anders null
 */
export function verifyAdminToken(token: string): string | null {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    console.error('ADMIN_PASSWORD niet geconfigureerd');
    return null;
  }

  try {
    // Decode token
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');

    if (parts.length !== 3) {
      console.error('Ongeldige token format');
      return null;
    }

    const [username, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Check expiry
    if (Date.now() - timestamp > TOKEN_EXPIRY_MS) {
      console.error('Token verlopen');
      return null;
    }

    // Verify signature
    const expectedSignature = createHmac('sha256', secret)
      .update(`${username}:${timestamp}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Ongeldige token signature');
      return null;
    }

    return username;
  } catch (error) {
    console.error('Fout bij verifiëren token:', error);
    return null;
  }
}

/**
 * Haal admin token uit request header en verifieer
 * Retourneert username als geldig, anders null
 */
export function getAdminFromRequest(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyAdminToken(token);
}
