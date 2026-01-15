import { Question, StudentLevel } from '../types';

// Get the API base URL - in development use relative path, in production use VITE_APP_URL
const getApiBaseUrl = (): string => {
  const appUrl = import.meta.env.VITE_APP_URL;
  if (appUrl && appUrl !== 'http://localhost:5173') {
    return appUrl;
  }
  // In development, use relative path for Vercel dev server
  return '';
};

/**
 * Generate "look-alike" exam questions using xAI's Grok model.
 * These questions are designed to closely mimic real Dutch exam questions.
 */
export const generateLookAlikeQuestions = async (
  subject: string,
  level: StudentLevel,
  count: number = 10,
  topic?: string
): Promise<Question[]> => {
  const baseUrl = getApiBaseUrl();
  const apiUrl = `${baseUrl}/api/xai-generate`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject,
        level,
        count,
        topic: topic || undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `Server fout: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error('Ongeldige response van de server');
    }

    // Add required Question fields that might be missing from API response
    const questions: Question[] = data.questions.map((q: any, index: number) => ({
      id: q.id || `xai-${Date.now()}-${index}`,
      type: q.type as 'MULTIPLE_CHOICE' | 'OPEN',
      subject: subject,
      level: level,
      text: q.text,
      contextText: q.contextText,
      options: q.options,
      correctIndex: q.correctIndex,
      modelAnswer: q.modelAnswer,
      examType: 'practice' as const,
      source: `xAI Look-alike (${level} niveau)`,
    }));

    return questions;

  } catch (error: any) {
    console.error('Error generating xAI look-alike questions:', error);

    // Provide user-friendly error messages
    if (error.message?.includes('API key')) {
      throw new Error('xAI API key is niet geconfigureerd. Neem contact op met de beheerder.');
    }
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      throw new Error('Kan geen verbinding maken met de server. Controleer je internetverbinding.');
    }
    if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
      throw new Error('Te veel verzoeken. Probeer het over een paar minuten opnieuw.');
    }

    throw error;
  }
};
