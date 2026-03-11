import type { VercelResponse } from '@vercel/node';

/**
 * CORS Configuration Utility
 *
 * Alleen toegestane origins mogen de API aanroepen.
 */

// Whitelist van toegestane origins
const ALLOWED_ORIGINS = [
  'https://ai-examentrainer.nl',
  'https://www.ai-examentrainer.nl',
];

// Regex patterns voor dynamische origins (Vercel previews, localhost, development)
const ALLOWED_PATTERNS = [
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/\[::1\]:\d+$/,
];

/**
 * Check of een origin is toegestaan
 */
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  // Check exacte matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Check patterns (Vercel previews, localhost)
  return ALLOWED_PATTERNS.some(pattern => pattern.test(origin));
}

/**
 * Set CORS headers op de response
 */
export function setCorsHeaders(
  res: VercelResponse,
  origin: string | undefined,
  methods: string = 'POST,OPTIONS'
): void {
  // Alleen toegestane origins krijgen CORS headers
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin!);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  // Als origin niet toegestaan is, sturen we geen CORS headers
  // Dit zorgt ervoor dat de browser de request blokkeert
}
