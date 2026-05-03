import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { setCorsHeaders } from './utils/cors.js';
import { checkRateLimit, getClientIP, rateLimits } from './utils/rateLimiter.js';
import { buildLookalikePrompt, getExamStyleDescription } from './utils/lookalikePrompt.js';

/**
 * Gemini API Endpoint - Server-side AI calls via Vercel AI Gateway
 *
 * SECURITY: De AI Gateway API key blijft op de server en wordt NIET
 * geëxposeerd naar de browser. Alle AI calls gaan via deze endpoint.
 *
 * Environment variabele (server-side only, GEEN VITE_ prefix):
 * - AI_GATEWAY_API_KEY: De Vercel AI Gateway API key
 */

// Model configuration - AI Gateway format
const GEMINI_MODEL_FLASH = process.env.GEMINI_MODEL || 'google/gemini-2.0-flash';
const GEMINI_MODEL_PRO = process.env.GEMINI_MODEL_PRO || 'google/gemini-2.5-pro';

// Exacte vakken die een sterker model nodig hebben voor HAVO/VWO
const EXACT_SUBJECTS = ['Wiskunde B', 'Wiskunde A', 'Natuurkunde', 'Scheikunde'];
const PRO_LEVELS = ['HAVO', 'VWO'];

// Niveau-specifieke nakijk instructies gebaseerd op officiële eindexamen richtlijnen
function getGradingInstructionsForLevel(level?: string): string {
  switch (level) {
    case 'VMBO-TL':
    case 'VMBO-GL':
    case 'VMBO-BB':
    case 'VMBO-KB':
      return `
    NIVEAU: VMBO - Beoordeel SOEPEL
    Focus op basiskennis en herkenning van kernbegrippen.

    BEOORDELINGSCRITERIA:
    - CORRECT: Het antwoord bevat de kernbegrippen/het basisidee uit het modelantwoord. Exacte formulering is NIET vereist.
    - DEELS CORRECT: Het antwoord toont begrip van het onderwerp maar mist een kernbegrip of bevat een kleine fout.
    - INCORRECT: Het antwoord mist de kernbegrippen volledig of is feitelijk onjuist.

    Let op: Bij VMBO is het belangrijker DAT de leerling het begrijpt, niet HOE het geformuleerd is.`;

    case 'HAVO':
      return `
    NIVEAU: HAVO - Beoordeel GEMIDDELD
    Focus op correcte toepassing van kennis in praktische situaties.

    BEOORDELINGSCRITERIA:
    - CORRECT: Het antwoord bevat alle belangrijke elementen uit het modelantwoord en past de kennis correct toe.
    - DEELS CORRECT: Het antwoord bevat de meeste elementen maar mist een belangrijk onderdeel of de toepassing is onvolledig.
    - INCORRECT: Het antwoord mist meerdere belangrijke elementen of past de kennis verkeerd toe.

    Let op: Bij HAVO moet de leerling laten zien dat ze de kennis kunnen TOEPASSEN, niet alleen reproduceren.`;

    case 'VWO':
      return `
    NIVEAU: VWO - Beoordeel STRENG
    Focus op diepgaand begrip, verbanden leggen en onderbouwde redeneringen.

    BEOORDELINGSCRITERIA:
    - CORRECT: Het antwoord bevat alle elementen, toont begrip van de onderliggende concepten en is goed onderbouwd.
    - DEELS CORRECT: Het antwoord is inhoudelijk grotendeels correct maar mist diepgang, onderbouwing of een belangrijk verband.
    - INCORRECT: Het antwoord mist essentiële elementen, toont onvoldoende begrip of de redenering klopt niet.

    Let op: Bij VWO moet de leerling laten zien dat ze BEGRIJPEN waarom iets zo is, niet alleen WAT het antwoord is.`;

    default:
      return `
    BEOORDELINGSCRITERIA:
    - CORRECT: Antwoord bevat alle essentiële elementen van het modelantwoord.
    - DEELS CORRECT: Antwoord bevat sommige essentiële elementen maar mist belangrijke onderdelen.
    - INCORRECT: Antwoord mist de essentiële elementen of is feitelijk onjuist.`;
  }
}

// Bepaal welk model te gebruiken op basis van vak en niveau
function getModelForSubject(subject?: string, level?: string) {
  const modelId = (subject && level && EXACT_SUBJECTS.includes(subject) && PRO_LEVELS.includes(level))
    ? GEMINI_MODEL_PRO
    : GEMINI_MODEL_FLASH;

  if (modelId === GEMINI_MODEL_PRO) {
    console.log(`[Gemini API] Using Pro model for ${subject} (${level})`);
  }

  // Return AI Gateway model provider
  // API key is automatically read from AI_GATEWAY_API_KEY environment variable
  return gateway(modelId);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - ondersteunt productie, Vercel previews, en localhost
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting - prevent AI API abuse
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(`ai:${clientIP}`, rateLimits.aiApi);

  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', String(rateLimitResult.retryAfter || 60));
    res.setHeader('X-RateLimit-Limit', String(rateLimits.aiApi.maxRequests));
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(rateLimitResult.resetTime / 1000)));
    return res.status(429).json({
      error: 'Te veel verzoeken. Probeer het later opnieuw.',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  // Add rate limit headers to successful responses
  res.setHeader('X-RateLimit-Limit', String(rateLimits.aiApi.maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(rateLimitResult.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(rateLimitResult.resetTime / 1000)));

  try {
    const { action, payload } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Verify API key is configured
    if (!process.env.AI_GATEWAY_API_KEY) {
      console.error('[Gemini API] AI_GATEWAY_API_KEY environment variable not set');
      throw new Error('AI_GATEWAY_API_KEY environment variable not set');
    }

    // Input validation helpers
    const validLevels = ['VMBO-TL', 'VMBO-GL', 'VMBO-BB', 'VMBO-KB', 'HAVO', 'VWO'];
    const MAX_TEXT_LENGTH = 10000;
    const MAX_QUESTION_COUNT = 50;

    switch (action) {
      case 'getExplanation': {
        const { question, studentAnswer } = payload;
        if (!question || !question.text || typeof question.text !== 'string') {
          return res.status(400).json({ error: 'Ongeldige vraag' });
        }
        if (question.text.length > MAX_TEXT_LENGTH) {
          return res.status(400).json({ error: 'Vraagtekst te lang' });
        }
        const result = await generateExplanation(question, studentAnswer);
        return res.status(200).json({ result });
      }

      case 'generateLookalikeQuestions': {
        const { subject, level, count, topic, examStyle } = payload;
        if (!subject || typeof subject !== 'string' || !subject.trim()) {
          return res.status(400).json({ error: 'Ongeldig vak' });
        }
        if (!level || !validLevels.includes(level)) {
          return res.status(400).json({ error: 'Ongeldig niveau' });
        }
        const safeCount = typeof count === 'number' ? Math.min(Math.max(1, count), MAX_QUESTION_COUNT) : 10;
        const result = await generateLookalikeExamQuestions(subject, level, safeCount, topic, examStyle);
        return res.status(200).json({ result });
      }

      case 'generateExamSummary': {
        const { questions, answers, score, totalQuestions, studentName, subject } = payload;
        if (!Array.isArray(questions) || questions.length === 0) {
          return res.status(400).json({ error: 'Geen vragen meegegeven' });
        }
        if (typeof score !== 'number' || typeof totalQuestions !== 'number' || totalQuestions <= 0) {
          return res.status(400).json({ error: 'Ongeldige score gegevens' });
        }
        const result = await generateExamSummary(questions, answers, score, totalQuestions, studentName, subject);
        return res.status(200).json({ result });
      }

      case 'generateFlashcards': {
        const { subject, level, count, topic } = payload;
        if (!subject || typeof subject !== 'string' || !subject.trim()) {
          return res.status(400).json({ error: 'Ongeldig vak' });
        }
        if (!level || !validLevels.includes(level)) {
          return res.status(400).json({ error: 'Ongeldig niveau' });
        }
        const safeCount = typeof count === 'number' ? Math.min(Math.max(1, count), MAX_QUESTION_COUNT) : 10;
        const result = await generateFlashcards(subject, level, safeCount, topic);
        return res.status(200).json({ result });
      }

      case 'chat': {
        const { message, systemInstruction } = payload;
        if (!message || typeof message !== 'string' || !message.trim()) {
          return res.status(400).json({ error: 'Leeg bericht' });
        }
        if (message.length > MAX_TEXT_LENGTH) {
          return res.status(400).json({ error: 'Bericht te lang' });
        }
        const result = await chat(message, systemInstruction);
        return res.status(200).json({ result });
      }

      case 'gradeOpenQuestion': {
        const { question, studentAnswer } = payload;
        if (!question || !question.text || typeof question.text !== 'string') {
          return res.status(400).json({ error: 'Ongeldige vraag' });
        }
        if (typeof studentAnswer !== 'string' || studentAnswer.length > MAX_TEXT_LENGTH) {
          return res.status(400).json({ error: 'Ongeldig antwoord' });
        }
        const result = await gradeOpenQuestion(question, studentAnswer);
        return res.status(200).json({ result });
      }

      case 'generateStudyFeedback': {
        const { studentName, level, subjectAnalyses, overallProgress } = payload;
        if (!studentName || typeof studentName !== 'string') {
          return res.status(400).json({ error: 'Ongeldige leerlingnaam' });
        }
        if (!level || !validLevels.includes(level)) {
          return res.status(400).json({ error: 'Ongeldig niveau' });
        }
        const result = await generateStudyFeedback(studentName, level, subjectAnalyses, overallProgress);
        return res.status(200).json({ result });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error: any) {
    console.error('[Gemini API] Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      response: error.response?.data || error.response?.statusText,
    });

    // Provide user-friendly error messages without leaking internal details
    let errorMessage = 'Er ging iets mis met de AI service';
    if (error.message?.includes('API_KEY') || error.message?.includes('API key')) {
      errorMessage = 'API configuratie probleem - neem contact op met support';
    } else if (error.message?.includes('quota') || error.message?.includes('rate')) {
      errorMessage = 'API limiet bereikt, probeer het later opnieuw';
    } else if (error.message?.includes('model')) {
      errorMessage = 'AI model tijdelijk niet beschikbaar';
    }

    return res.status(500).json({
      error: errorMessage
    });
  }
}

// ============================================================================
// AI FUNCTIONS (server-side only) - Using Vercel AI Gateway
// ============================================================================

async function generateExplanation(question: any, studentAnswer: number | string): Promise<string> {
  let prompt = '';
  const gradingInstructions = getGradingInstructionsForLevel(question.level);
  const levelLabel = question.level || 'dit niveau';

  if (question.type === 'MULTIPLE_CHOICE') {
    const ansIdx = studentAnswer as number;
    const ansText = question.options ? question.options[ansIdx] : '';
    const correctAnsText = question.options && question.correctIndex !== undefined ? question.options[question.correctIndex] : '';
    const isCorrect = ansIdx === question.correctIndex;

    const escapedQuestionText = escapePromptString(question.text);
    const escapedSubject = escapePromptString(question.subject);
    const escapedAnsText = escapePromptString(ansText);
    const escapedCorrectAnsText = escapePromptString(correctAnsText);

    prompt = `
      Je bent een behulpzame leraar voor ${levelLabel} leerlingen. De leerling maakte een meerkeuzevraag.

      Vraag: "${escapedQuestionText}"
      Onderwerp: ${escapedSubject}

      Leerling antwoord: "${escapedAnsText}"
      Juist antwoord: "${escapedCorrectAnsText}"
      Resultaat: ${isCorrect ? 'Correct' : 'Fout'}

      Geef uitleg (max 3 zinnen) op ${levelLabel} niveau. Als het fout is, leg uit waarom het goede antwoord juist is.
      Antwoord in het Nederlands.
    `;
  } else {
    const ansText = studentAnswer as string;

    const escapedQuestionText = escapePromptString(question.text);
    const escapedSubject = escapePromptString(question.subject);
    const escapedModelAnswer = escapePromptString(question.modelAnswer);
    const escapedAnsText = escapePromptString(ansText);

    prompt = `
      Je bent een leraar die een open vraag nakijkt voor ${levelLabel} leerlingen.

      Vraag: "${escapedQuestionText}"
      Onderwerp: ${escapedSubject}

      Modelantwoord (gebruik dit als referentie voor correctheid): "${escapedModelAnswer}"

      Het antwoord van de leerling: "${escapedAnsText}"
      ${gradingInstructions}

      Opdracht:
      1. Beoordeel het antwoord volgens de beoordelingscriteria hierboven.
      2. Begin met "CORRECT", "DEELS CORRECT" of "INCORRECT".
      3. Geef daarna een korte uitleg (max 3 zinnen) waarom, en wat er eventueel mist.

      Antwoord in het Nederlands.
    `;
  }

  // Gebruik Pro model voor exacte vakken op HAVO/VWO
  const model = getModelForSubject(question.subject, question.level);

  const { text } = await generateText({
    model,
    prompt,
  });

  return text || "Geen uitleg beschikbaar.";
}

async function generateLookalikeExamQuestions(
  subject: string,
  level: string,
  count: number = 10,
  topic?: string,
  examStyle?: 'tijdvak1' | 'tijdvak2' | 'mixed'
): Promise<any[]> {
  const examStyleDesc = getExamStyleDescription(examStyle);
  const prompt = buildLookalikePrompt(subject, level, count, topic, examStyle);

  // Gebruik Pro model voor exacte vakken op HAVO/VWO
  const modelLookalike = getModelForSubject(subject, level);

  const { text: responseText } = await generateText({
    model: modelLookalike,
    prompt,
  });

  if (!responseText?.trim()) {
    throw new Error("AI gaf een lege response terug.");
  }

  let jsonText = responseText.trim();
  const codeBlockRegex = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/;
  const match = jsonText.match(codeBlockRegex);
  if (match) {
    jsonText = match[1].trim();
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  if (!jsonText.startsWith('[')) {
    const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonText = arrayMatch[0];
    }
  }

  const questionsData = JSON.parse(jsonText);
  if (!Array.isArray(questionsData) || questionsData.length === 0) {
    throw new Error("AI genereerde geen examenvragen.");
  }

  const questions = [];
  const now = Date.now();

  for (let index = 0; index < questionsData.length; index++) {
    const q = questionsData[index];
    if (!q.text || typeof q.text !== 'string') continue;

    const baseQuestion = {
      id: `lookalike-${now}-${index}`,
      type: q.type || 'MULTIPLE_CHOICE',
      level: level,
      subject: subject,
      text: q.text.trim(),
      contextText: q.contextText ? q.contextText.trim() : undefined,
      examType: 'practice',
      source: `Look-alike Examen (${level} - ${examStyleDesc})`,
    };

    if (q.type === 'OPEN') {
      questions.push({
        ...baseQuestion,
        type: 'OPEN',
        modelAnswer: q.modelAnswer || 'Geen modelantwoord beschikbaar.',
        score: typeof q.score === 'number' ? q.score : 2,
      });
    } else {
      if (!Array.isArray(q.options) || q.options.length < 2) continue;
      const correctIndex = typeof q.correctIndex === 'number'
        ? Math.max(0, Math.min(q.correctIndex, q.options.length - 1))
        : 0;
      questions.push({
        ...baseQuestion,
        type: 'MULTIPLE_CHOICE',
        options: q.options.map((opt: any) => String(opt).trim()),
        correctIndex: correctIndex,
        score: 1,
      });
    }
  }

  if (questions.length === 0) {
    throw new Error("Geen geldige examenvragen konden worden gegenereerd.");
  }

  return questions;
}

async function generateExamSummary(
  questions: any[],
  answers: Record<string, number | string>,
  score: number,
  totalQuestions: number,
  studentName: string,
  subject: string
): Promise<{ overall: string; strengths: string[]; improvements: string[]; studyTips: string[] }> {
  const correctQuestions: string[] = [];
  const incorrectQuestions: string[] = [];

  questions.forEach((q, idx) => {
    if (q.type === 'MULTIPLE_CHOICE') {
      if (answers[q.id] === q.correctIndex) {
        correctQuestions.push(`Vraag ${idx + 1}: ${q.text.substring(0, 50)}...`);
      } else {
        incorrectQuestions.push(`Vraag ${idx + 1}: ${q.text.substring(0, 50)}...`);
      }
    }
  });

  const percentage = Math.round((score / totalQuestions) * 100);

  const escapedStudentName = escapePromptString(studentName);
  const escapedSubject = escapePromptString(subject);

  const prompt = `
    Je bent een ervaren ${escapedSubject} docent die een examen heeft nagekeken van ${escapedStudentName}.

    EXAMEN RESULTAAT:
    - Vak: ${escapedSubject}
    - Score: ${score}/${totalQuestions} (${percentage}%)

    GOED BEANTWOORD (${correctQuestions.length}):
    ${correctQuestions.slice(0, 5).join('\n') || 'Geen'}

    FOUT BEANTWOORD (${incorrectQuestions.length}):
    ${incorrectQuestions.slice(0, 5).join('\n') || 'Geen'}

    Geef je antwoord als JSON:
    {
      "overall": "1-2 zinnen algemene feedback",
      "strengths": ["punt 1", "punt 2"],
      "improvements": ["verbeterpunt 1", "verbeterpunt 2"],
      "studyTips": ["tip 1", "tip 2"]
    }

    Geef ALLEEN de JSON terug.
  `;

  // Haal level uit eerste vraag voor model selectie
  const level = questions[0]?.level;
  const modelSummary = getModelForSubject(subject, level);

  const { text: responseText } = await generateText({
    model: modelSummary,
    prompt,
  });

  if (!responseText?.trim()) {
    throw new Error("AI gaf een lege response terug.");
  }

  let jsonText = responseText.trim();
  const codeBlockRegex = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/;
  const match = jsonText.match(codeBlockRegex);
  if (match) {
    jsonText = match[1].trim();
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  if (!jsonText.startsWith('{')) {
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonText = objectMatch[0];
    }
  }

  const summary = JSON.parse(jsonText);

  return {
    overall: summary.overall || "Goed geprobeerd!",
    strengths: Array.isArray(summary.strengths) ? summary.strengths : [],
    improvements: Array.isArray(summary.improvements) ? summary.improvements : [],
    studyTips: Array.isArray(summary.studyTips) ? summary.studyTips : []
  };
}

async function generateFlashcards(
  subject: string,
  level: string,
  count: number = 10,
  topic?: string
): Promise<any[]> {
  let levelInstructions = "";

  switch (level) {
    case 'VMBO-TL':
      levelInstructions = `VMBO-TL NIVEAU:
      - Taal: Eenvoudig en direct
      - Vragen: Focus op feiten en basisbegrippen
      - Antwoorden: Kort, max 1-2 zinnen`;
      break;
    case 'HAVO':
      levelInstructions = `HAVO NIVEAU:
      - Taal: Helder met vakterminologie
      - Vragen: Mix van feiten en toepassingen
      - Antwoorden: 1-3 zinnen`;
      break;
    case 'VWO':
      levelInstructions = `VWO NIVEAU:
      - Taal: Academisch
      - Vragen: Complexe concepten en analyses
      - Antwoorden: 2-4 zinnen met nuance`;
      break;
    default:
      levelInstructions = "Pas aan aan het niveau.";
  }

  const prompt = `
    Je bent een ${subject} docent die flashcards maakt voor ${level} eindexamenstof.
    ${topic ? `ONDERWERP: "${topic}"` : ''}

    ${levelInstructions}

    Maak PRECIES ${count} flashcards als JSON array:
    [
      { "front": "Vraag/begrip", "back": "Antwoord/uitleg" }
    ]

    Geef ALLEEN de JSON array terug.
  `;

  // Gebruik Pro model voor exacte vakken op HAVO/VWO
  const modelFlashcards = getModelForSubject(subject, level);

  const { text: responseText } = await generateText({
    model: modelFlashcards,
    prompt,
  });

  if (!responseText?.trim()) {
    throw new Error("AI gaf een lege response terug.");
  }

  let jsonText = responseText.trim();
  const codeBlockRegex = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/;
  const match = jsonText.match(codeBlockRegex);
  if (match) {
    jsonText = match[1].trim();
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  if (!jsonText.startsWith('[')) {
    const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonText = arrayMatch[0];
    }
  }

  const cardsData = JSON.parse(jsonText);
  if (!Array.isArray(cardsData) || cardsData.length === 0) {
    throw new Error("AI genereerde geen flashcards.");
  }

  const now = new Date().toISOString();
  const flashcards = [];

  for (let index = 0; index < cardsData.length; index++) {
    const card = cardsData[index];
    if (!card.front || !card.back) continue;

    flashcards.push({
      id: `fc-${Date.now()}-${index}`,
      subject: subject,
      level: level,
      front: card.front.trim(),
      back: card.back.trim(),
      topic: topic,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (flashcards.length === 0) {
    throw new Error("Geen geldige flashcards konden worden gegenereerd.");
  }

  return flashcards;
}

async function chat(message: string, systemInstruction: string): Promise<string> {
  // Chat gebruikt altijd het flash model (snel en goedkoop voor conversaties)
  // API key is automatically read from AI_GATEWAY_API_KEY environment variable
  const chatModel = gateway(GEMINI_MODEL_FLASH);

  const { text } = await generateText({
    model: chatModel,
    system: systemInstruction,
    prompt: message,
  });

  return text || "Geen antwoord.";
}

/**
 * Escape special characters in strings to prevent prompt injection attacks
 */
function escapePromptString(str: string): string {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

async function generateStudyFeedback(
  studentName: string,
  level: string,
  subjectAnalyses: Array<{ subject: string; averageScore: number; totalExams: number; weakTopics: string[] }>,
  overallProgress: { totalExams: number; averageScore: number; improvementRate: number }
): Promise<{ personalizedAdvice: string; prioritySubjects: Array<{ subject: string; advice: string }>; weeklyGoal: string }> {
  const escapedName = escapePromptString(studentName);

  const subjectLines = subjectAnalyses.map(s =>
    `- ${escapePromptString(s.subject)}: ${s.averageScore}% gemiddeld, ${s.totalExams} toetsen gemaakt${s.weakTopics.length > 0 ? `, zwakke onderwerpen: ${s.weakTopics.join(', ')}` : ''}`
  ).join('\n');

  const prompt = `
    Je bent een ervaren studiecoach voor een ${level} leerling genaamd ${escapedName}.

    VOORTGANGSGEGEVENS:
    - Totaal ${overallProgress.totalExams} toetsen gemaakt
    - Gemiddelde score: ${overallProgress.averageScore}%
    - Verbeteringssnelheid: ${overallProgress.improvementRate}%

    PER VAK:
    ${subjectLines || 'Nog geen vakgegevens beschikbaar.'}

    OPDRACHT:
    Geef persoonlijk, motiverend studieadvies in het Nederlands. Wees specifiek en concreet.

    Geef je antwoord als JSON:
    {
      "personalizedAdvice": "2-3 zinnen persoonlijk studieadvies gericht op de zwakste punten",
      "prioritySubjects": [
        { "subject": "Vaknaam", "advice": "Specifiek advies voor dit vak (1-2 zinnen)" }
      ],
      "weeklyGoal": "Een concreet, haalbaar weekdoel"
    }

    Geef ALLEEN de JSON terug. Maximaal 3 prioriteitsvakken.
  `;

  // Use flash model - this doesn't require deep subject knowledge
  const model = gateway(GEMINI_MODEL_FLASH);

  const { text: responseText } = await generateText({
    model,
    prompt,
  });

  if (!responseText?.trim()) {
    throw new Error("AI gaf een lege response terug.");
  }

  let jsonText = responseText.trim();
  const codeBlockRegex = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/;
  const match = jsonText.match(codeBlockRegex);
  if (match) {
    jsonText = match[1].trim();
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  if (!jsonText.startsWith('{')) {
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonText = objectMatch[0];
    }
  }

  const feedback = JSON.parse(jsonText);

  return {
    personalizedAdvice: feedback.personalizedAdvice || 'Blijf oefenen en focus op je zwakke punten.',
    prioritySubjects: Array.isArray(feedback.prioritySubjects) ? feedback.prioritySubjects.slice(0, 3) : [],
    weeklyGoal: feedback.weeklyGoal || 'Maak deze week minstens 3 oefentoetsen.'
  };
}

async function gradeOpenQuestion(
  question: any,
  studentAnswer: string
): Promise<{ grade: 'correct' | 'partial' | 'incorrect'; feedback: string }> {
  const escapedQuestionText = escapePromptString(question.text);
  const escapedModelAnswer = escapePromptString(question.modelAnswer);
  const escapedStudentAnswer = escapePromptString(studentAnswer);
  const gradingInstructions = getGradingInstructionsForLevel(question.level);

  const prompt = `
    Je bent een examinator die een open vraag nakijkt.
    Beoordeel ALLEEN op inhoudelijke correctheid, niet op spelling of grammatica.

    VRAAG: "${escapedQuestionText}"

    MODELANTWOORD (de standaard voor correctheid): "${escapedModelAnswer}"

    ANTWOORD VAN LEERLING: "${escapedStudentAnswer}"
    ${gradingInstructions}

    Geef je antwoord als JSON:
    {
      "grade": "correct" | "partial" | "incorrect",
      "feedback": "Korte uitleg (max 2 zinnen) waarom dit cijfer"
    }

    Geef ALLEEN de JSON terug.
  `;

  const model = getModelForSubject(question.subject, question.level);

  const { text: responseText } = await generateText({
    model,
    prompt,
  });

  if (!responseText?.trim()) {
    return { grade: 'incorrect', feedback: 'Kon antwoord niet beoordelen.' };
  }

  let jsonText = responseText.trim();
  const codeBlockRegex = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/;
  const match = jsonText.match(codeBlockRegex);
  if (match) {
    jsonText = match[1].trim();
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  if (!jsonText.startsWith('{')) {
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonText = objectMatch[0];
    }
  }

  try {
    const result = JSON.parse(jsonText);
    const validGrades = ['correct', 'partial', 'incorrect'];
    const grade = validGrades.includes(result.grade) ? result.grade : 'incorrect';
    return {
      grade,
      feedback: result.feedback || 'Geen feedback beschikbaar.'
    };
  } catch {
    return { grade: 'incorrect', feedback: 'Kon beoordeling niet verwerken.' };
  }
}
