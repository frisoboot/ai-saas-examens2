import type { VercelResponse } from '@vercel/node';

/**
 * CORS Configuration Utility
 *
 * Ondersteunt:
 * - Productie URL (VITE_APP_URL)
 * - Vercel preview deployments (*.vercel.app)
 * - Localhost development
 */

// Vercel project naam voor preview URL validatie
const VERCEL_PROJECT_NAME = 'ai-saas-examens2';

/**
 * Check of een origin is toegestaan
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  // Altijd toegestaan: productie URL (inclusief www variant)
  if (process.env.VITE_APP_URL) {
    const appUrl = process.env.VITE_APP_URL;

    // Exacte match
    if (origin === appUrl) {
      return true;
    }

    // Check www/non-www variant automatisch
    // Als VITE_APP_URL = https://ai-examentrainer.nl, sta ook https://www.ai-examentrainer.nl toe
    // Als VITE_APP_URL = https://www.ai-examentrainer.nl, sta ook https://ai-examentrainer.nl toe
    try {
      const appUrlParsed = new URL(appUrl);
      const originParsed = new URL(origin);

      // Zelfde protocol en path vereist
      if (appUrlParsed.protocol === originParsed.protocol) {
        const appHost = appUrlParsed.hostname;
        const originHost = originParsed.hostname;

        // Check of het de www/non-www variant is
        if (appHost === `www.${originHost}` || `www.${appHost}` === originHost) {
          return true;
        }
      }
    } catch {
      // URL parsing failed, skip www check
    }
  }

  // Localhost development
  if (origin === 'http://localhost:5173' || origin === 'http://localhost:3000') {
    return true;
  }

  // Vercel preview deployments: check of het een .vercel.app URL is
  // Format: https://<project>-<hash>-<team>.vercel.app of https://<project>-<hash>.vercel.app
  if (origin.endsWith('.vercel.app')) {
    try {
      const url = new URL(origin);
      const hostname = url.hostname;

      // Check of de hostname begint met ons project naam
      // Dit voorkomt dat andere Vercel projecten toegang krijgen
      if (hostname.startsWith(`${VERCEL_PROJECT_NAME}-`) || hostname.startsWith('ai-examentrainer')) {
        return true;
      }

      // Ook toestaan als VERCEL_URL is gezet (automatisch door Vercel)
      if (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Set CORS headers op de response
 */
export function setCorsHeaders(
  res: VercelResponse,
  origin: string | undefined,
  methods: string = 'POST,OPTIONS'
): void {
  // Check of origin is toegestaan
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // In development: sta alles toe voor gemak
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  // In production zonder matching origin: geen header = geblokkeerd door browser

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}
