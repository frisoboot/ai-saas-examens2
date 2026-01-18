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
// Vercel preview URLs: ai-saas-examens2-*.vercel.app
const ALLOWED_PATTERNS = [
  // Vercel preview URLs specifiek voor dit project
  /^https:\/\/ai-saas-examens2(-[a-z0-9-]+)?\.vercel\.app$/,
  // Vercel preview URLs met git branch info
  /^https:\/\/ai-saas-examens2-git-[a-z0-9-]+-[a-z0-9]+\.vercel\.app$/,
  // Localhost development
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
  // Als origin niet toegestaan is, sturen we geen Access-Control-Allow-Origin header
  // Dit zorgt ervoor dat de browser de request blokkeert

  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}
