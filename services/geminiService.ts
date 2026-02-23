/**
 * Gemini Service - Client-side wrapper voor server-side AI calls
 *
 * SECURITY: De Gemini API key wordt NIET in de browser geladen.
 * Alle AI calls gaan via de /api/gemini endpoint op de server.
 */

import { Question, StudentProfile, Flashcard, StudentLevel, AIStudyFeedback } from "../types";

// API endpoint for server-side Gemini calls
const GEMINI_API_ENDPOINT = '/api/gemini';

// Helper function to call the Gemini API endpoint
async function callGeminiAPI<T>(action: string, payload: Record<string, any>): Promise<T> {
  const response = await fetch(GEMINI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API call failed: ${response.status}`);
  }

  const data = await response.json();
  return data.result;
}

// Explanation for Exam Review
export const getExplanation = async (question: Question, studentAnswer: number | string): Promise<string> => {
  try {
    return await callGeminiAPI<string>('getExplanation', {
      question,
      studentAnswer,
    });
  } catch (error) {
    console.error("Fout bij ophalen AI uitleg:", error);
    return "Er ging iets mis bij het ophalen van de uitleg. Probeer het later opnieuw.";
  }
};

// Chat session state (kept client-side for conversation context)
interface ChatSession {
  systemInstruction: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// Maximum number of recent messages to send to the AI per turn.
// Keeps token usage constant regardless of conversation length.
// 8 messages = 4 full back-and-forth turns of context.
const MAX_CHAT_CONTEXT_MESSAGES = 8;

const chatSessions = new Map<string, ChatSession>();
const chatSessionTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Auto-cleanup stale sessions after 30 minutes of inactivity
const CHAT_SESSION_TTL_MS = 30 * 60 * 1000;

function scheduleSessionCleanup(sessionId: string) {
  // Clear previous timer if exists
  const existing = chatSessionTimers.get(sessionId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    chatSessions.delete(sessionId);
    chatSessionTimers.delete(sessionId);
  }, CHAT_SESSION_TTL_MS);
  chatSessionTimers.set(sessionId, timer);
}

// Subject Expert Chat - returns a chat-like interface
export const createSubjectChat = (subject: string, student: StudentProfile) => {
  // Define level-specific teaching strategies
  let levelGuidance = "";

  switch (student.level) {
    case 'VMBO-TL':
      levelGuidance = `
      - Taalgebruik: Eenvoudig, direct en concreet. Korte zinnen.
      - Uitleg: Gebruik veel praktijkvoorbeelden en analogieën uit het dagelijks leven.
      - Aanpak: Begeleid de leerling stap-voor-stap. Vermijd onnodig complex vakjargon.`;
      break;
    case 'HAVO':
      levelGuidance = `
      - Taalgebruik: Helder Nederlands met correct gebruik van vakterminologie.
      - Uitleg: Focus op de toepassing van theorie in de praktijk.
      - Aanpak: Vraag de leerling om structuur aan te brengen. Leg verbanden tussen oorzaak en gevolg.`;
      break;
    case 'VWO':
      levelGuidance = `
      - Taalgebruik: Academisch en genuanceerd.
      - Uitleg: Ga de diepte in, bespreek uitzonderingen en onderliggende mechanismen.
      - Aanpak: Daag de leerling uit tot kritisch denken en abstractie. Laat ze verbanden leggen over hoofdstukken heen.`;
      break;
    default:
      levelGuidance = "- Pas je aan aan het niveau van de leerling.";
  }

  const systemInstruction = `
    Je bent een inspirerende en deskundige ${subject} docent.
    Je spreekt met ${student.name}, een leerling op ${student.level} niveau.

    JOUW DOCENT-STIJL (${student.level}):
    ${levelGuidance}

    HET STRUIKELBLOK VAN DE LEERLING:
    De leerling heeft specifiek aangegeven moeite te hebben met: "${student.strugglePoints}".
    ⚠️ BELANGRIJK: Als het gesprek dit onderwerp raakt:
    1. Vertraag het tempo.
    2. Check extra vaak of de leerling het begrijpt ("Snap je wat ik bedoel?").
    3. Geef een extra, simpel voorbeeld.
    4. Wees extra geduldig en bemoedigend.

    ALGEMENE REGELS:
    1. Geef NOOIT direct het antwoord op een huiswerkvraag ("zeg het maar gewoon"). Gebruik de Socratische methode: stel vragen terug om de leerling zelf het antwoord te laten vinden.
    2. Houd je antwoorden beknopt (max 100 woorden per keer) zodat het een dialoog blijft, geen college.
    3. Richt je puur op de examenstof voor ${subject}.
    4. Sluit af en toe af met een korte quizvraag om kennis te testen.

    CONVERSATIE CONTEXT:
    Je krijgt de recente gespreksgeschiedenis mee bij elke vraag.
  `;

  // Create a unique session ID
  const sessionId = `${subject}-${student.name}-${Date.now()}`;
  chatSessions.set(sessionId, {
    systemInstruction,
    messages: [],
  });
  scheduleSessionCleanup(sessionId);

  // Return a chat-like interface
  return {
    sessionId,
    async sendMessage(message: string): Promise<string> {
      const session = chatSessions.get(sessionId);
      if (!session) {
        throw new Error('Chat session not found');
      }

      // Add user message to history and refresh session timer
      session.messages.push({ role: 'user', content: message });
      scheduleSessionCleanup(sessionId);

      // Build conversation context using only recent messages (sliding window).
      // The system instruction already contains student level, subject, and struggle points,
      // so older messages can be dropped without losing critical context.
      const recentMessages = session.messages.slice(-MAX_CHAT_CONTEXT_MESSAGES);

      const conversationContext = recentMessages
        .map(m => `${m.role === 'user' ? 'Leerling' : 'Docent'}: ${m.content}`)
        .join('\n\n');

      const fullMessage = `${conversationContext}\n\nDocent:`;

      try {
        const response = await callGeminiAPI<string>('chat', {
          message: fullMessage,
          systemInstruction: session.systemInstruction,
        });

        // Add assistant response to history
        session.messages.push({ role: 'assistant', content: response });

        return response;
      } catch (error) {
        console.error("Fout bij chat:", error);
        throw new Error("Er ging iets mis bij het gesprek. Probeer het opnieuw.");
      }
    },
  };
};

// Generate exam summary with feedback and tips
export const generateExamSummary = async (
  questions: Question[],
  answers: Record<string, number | string>,
  score: number,
  totalQuestions: number,
  studentName: string,
  subject: string
): Promise<{
  overall: string;
  strengths: string[];
  improvements: string[];
  studyTips: string[];
}> => {
  try {
    return await callGeminiAPI('generateExamSummary', {
      questions,
      answers,
      score,
      totalQuestions,
      studentName,
      subject,
    });
  } catch (error: any) {
    console.error("Fout bij genereren examen samenvatting:", error);
    throw new Error(error.message || "Kon geen examen samenvatting genereren.");
  }
};

// Generate Look-alike Exam Questions (mimic real Dutch final exams)
export const generateLookalikeExamQuestions = async (
  subject: string,
  level: StudentLevel,
  count: number = 10,
  topic?: string,
  examStyle?: 'tijdvak1' | 'tijdvak2' | 'mixed'
): Promise<Question[]> => {
  try {
    return await callGeminiAPI<Question[]>('generateLookalikeQuestions', {
      subject,
      level,
      count,
      topic,
      examStyle,
    });
  } catch (error: any) {
    console.error("Fout bij genereren look-alike examenvragen:", error);
    throw new Error(error.message || "Kon geen look-alike examenvragen genereren. Controleer je internetverbinding en probeer het opnieuw.");
  }
};

// Grade an open question automatically
export const gradeOpenQuestion = async (
  question: Question,
  studentAnswer: string
): Promise<{ grade: 'correct' | 'partial' | 'incorrect'; feedback: string }> => {
  try {
    return await callGeminiAPI<{ grade: 'correct' | 'partial' | 'incorrect'; feedback: string }>('gradeOpenQuestion', {
      question,
      studentAnswer,
    });
  } catch (error) {
    console.error("Fout bij nakijken open vraag:", error);
    return { grade: 'incorrect', feedback: 'Kon antwoord niet automatisch nakijken.' };
  }
};

// Generate personalized AI study feedback
export const generateStudyFeedback = async (
  studentName: string,
  level: StudentLevel,
  subjectAnalyses: Array<{ subject: string; averageScore: number; totalExams: number; weakTopics: string[] }>,
  overallProgress: { totalExams: number; averageScore: number; improvementRate: number }
): Promise<AIStudyFeedback> => {
  try {
    const result = await callGeminiAPI<{ personalizedAdvice: string; prioritySubjects: Array<{ subject: string; advice: string }>; weeklyGoal: string }>('generateStudyFeedback', {
      studentName,
      level,
      subjectAnalyses,
      overallProgress,
    });
    return {
      ...result,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Fout bij genereren studieadvies:", error);
    throw new Error("Kon geen studieadvies genereren. Probeer het later opnieuw.");
  }
};

// Stream Look-alike Exam Questions via SSE for faster perceived generation
const GEMINI_STREAM_ENDPOINT = '/api/gemini-stream';

export const streamLookalikeExamQuestions = async (
  subject: string,
  level: StudentLevel,
  count: number = 10,
  topic?: string,
  examStyle?: string,
  onQuestion?: (question: Question) => void
): Promise<Question[]> => {
  const response = await fetch(GEMINI_STREAM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, level, count, topic, examStyle }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Stream failed: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Streaming niet ondersteund door de browser.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const questions: Question[] = [];
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop()!; // Keep the last (potentially incomplete) line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        let parsed: any;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue; // Skip unparseable SSE lines
        }

        if (parsed.error) {
          throw new Error(parsed.error);
        }

        questions.push(parsed as Question);
        onQuestion?.(parsed as Question);
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (questions.length === 0) {
    throw new Error('Kon geen look-alike examenvragen genereren. Probeer het opnieuw.');
  }

  return questions;
};

// Generate AI flashcards for a subject
export const generateFlashcards = async (
  subject: string,
  level: StudentLevel,
  count: number = 10,
  topic?: string
): Promise<Flashcard[]> => {
  try {
    return await callGeminiAPI<Flashcard[]>('generateFlashcards', {
      subject,
      level,
      count,
      topic,
    });
  } catch (error: any) {
    console.error("Fout bij genereren flashcards:", error);
    throw new Error(error.message || "Kon geen flashcards genereren. Controleer je internetverbinding en probeer het opnieuw.");
  }
};
