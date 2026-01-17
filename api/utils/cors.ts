import type { VercelResponse } from '@vercel/node';

/**
 * CORS Configuration Utility
 *
 * Staat alle origins toe voor eenvoud.
 */

/**
 * Set CORS headers op de response
 */
export function setCorsHeaders(
  res: VercelResponse,
  origin: string | undefined,
  methods: string = 'POST,OPTIONS'
): void {
  // Sta alle origins toe
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

/**
 * Check of een origin is toegestaan (altijd true)
 */
export function isAllowedOrigin(_origin: string | undefined): boolean {
  return true;
}
