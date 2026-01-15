import { Question } from "../types";

/**
 * Grok Service - Veilige server-side AI vraag generatie
 *
 * SECURITY: Alle API calls gaan via de server-side /api/grok-generate endpoint.
 * De API key wordt NOOIT blootgesteld aan de browser.
 */

// Generate Look-Alike exam questions using Grok 4 Fast (via secure API)
export const generateLookAlikeQuestions = async (
  subject: string,
  level: string,
  count: number = 10,
  topic?: string
): Promise<Question[]> => {
  try {
    const response = await fetch('/api/grok-generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject,
        level,
        count,
        topic
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Er ging iets mis bij het genereren van vragen.');
    }

    return data.questions as Question[];
  } catch (error: any) {
    console.error("Fout bij genereren Grok vragen:", error);

    if (error.message) {
      throw error;
    }

    throw new Error("Kon geen look-alike examenvragen genereren. Controleer je internetverbinding.");
  }
};

// Check if Grok API is configured (via server check)
export const isGrokConfigured = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/grok-generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: 'test',
        level: 'test',
        count: 0
      })
    });

    // If we get 500 with "niet geconfigureerd", it's not configured
    // Any other response means it's configured (even if count=0 fails validation)
    const data = await response.json();
    return !data.error?.includes('niet geconfigureerd');
  } catch {
    return false;
  }
};
