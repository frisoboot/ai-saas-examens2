import { Question } from "../types";

/**
 * Generate Look-Alike exam questions using Grok via Vercel AI Gateway
 *
 * SECURITY: API calls gaan via server-side /api/generate-grok-questions
 * De API key blijft veilig op de server en wordt nooit naar de browser gestuurd.
 */
export const generateLookAlikeQuestions = async (
  subject: string,
  level: string,
  count: number = 10,
  topic?: string
): Promise<Question[]> => {
  try {
    const response = await fetch('/api/generate-grok-questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject,
        level,
        count,
        topic
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Fout bij genereren van vragen');
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

/**
 * Check if Grok is available (via AI Gateway)
 * Since it's server-side, we assume it's configured if the app is deployed
 */
export const isGrokConfigured = (): boolean => {
  // In production, we assume AI Gateway is configured on Vercel
  // The actual check happens server-side
  return true;
};
