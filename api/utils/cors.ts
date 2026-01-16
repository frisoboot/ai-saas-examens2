/**
 * CORS Security Utilities
 *
 * SECURITY: Provides secure CORS configuration for API endpoints.
 * Never uses wildcard (*) in production to prevent cross-origin attacks.
 */

import type { VercelResponse } from '@vercel/node';

/**
 * List of allowed origins for CORS
 * - In production: only VITE_APP_URL and explicitly configured domains
 * - In development: also allows localhost origins
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Add configured app URL
  if (process.env.VITE_APP_URL) {
    origins.push(process.env.VITE_APP_URL.replace(/\/$/, ''));
  }

  // In development, allow localhost origins
  if (process.env.NODE_ENV !== 'production') {
    origins.push(
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    );
  }

  return origins.filter(Boolean);
}

/**
 * Set secure CORS headers on the response
 *
 * @param res - Vercel response object
 * @param origin - Request origin header
 * @param options - Additional CORS options
 * @returns true if origin is allowed, false otherwise
 */
export function setCorsHeaders(
  res: VercelResponse,
  origin: string | undefined,
  options: {
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  } = {}
): boolean {
  const {
    methods = ['GET', 'POST', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
    credentials = true
  } = options;

  const allowedOrigins = getAllowedOrigins();

  // Check if origin is allowed
  const isAllowed = origin && allowedOrigins.includes(origin);

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production' && origin) {
    // In development, log unrecognized origins but still allow configured ones
    console.warn(`[CORS] Origin not in allowlist: ${origin}`);
  }
  // In production with no matching origin: no Access-Control-Allow-Origin header is set
  // This effectively blocks the request from a browser perspective

  // Always set these headers
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', headers.join(', '));

  if (credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  return isAllowed || false;
}

/**
 * Handle OPTIONS preflight request
 *
 * @param res - Vercel response object
 * @param origin - Request origin header
 * @returns Response for preflight request
 */
export function handlePreflight(
  res: VercelResponse,
  origin: string | undefined,
  options?: {
    methods?: string[];
    headers?: string[];
  }
): VercelResponse {
  setCorsHeaders(res, origin, options);
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  return res.status(200).end();
}
