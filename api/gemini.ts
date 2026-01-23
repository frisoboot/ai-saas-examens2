import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";
import { setCorsHeaders } from './utils/cors.js';

/**
 * Gemini API Endpoint - Server-side AI calls
 *
 * SECURITY: De Gemini API key blijft op de server en wordt NIET
 * geëxposeerd naar de browser. Alle AI calls gaan via deze endpoint.
 *
 * Environment variabele (server-side only, GEEN VITE_ prefix):
 * - GEMINI_API_KEY: De Gemini API key
 */

// Lazy initialization
let _ai: GoogleGenAI | null = null;

// Model configuration
const GEMINI_MODEL_FLASH = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
const GEMINI_MODEL_PRO = process.env.GEMINI_MODEL_PRO || 'gemini-2.5-pro';
const GEMINI_MODEL_FALLBACK = 'gemini-2.5-flash';

// Exacte vakken die een sterker model nodig hebben voor HAVO/VWO
const EXACT_SUBJECTS = ['Wiskunde B', 'Wiskunde A', 'Natuurkunde', 'Scheikunde'];
const PRO_LEVELS = ['HAVO', 'VWO'];

// Bepaal welk model te gebruiken op basis van vak en niveau
function getModelForSubject(subject?: string, level?: string): string {
  if (subject && level && EXACT_SUBJECTS.includes(subject) && PRO_LEVELS.includes(level)) {
    console.log(`[Gemini API] Using Pro model for ${subject} (${level})`);
    return GEMINI_MODEL_PRO;
  }
  return GEMINI_MODEL_FLASH;
}

const getAI = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Gemini API] GEMINI_API_KEY environment variable not set');
    throw new Error('GEMINI_API_KEY environment variable not set');
  }
  // Log that we have an API key (don't log the key itself for security)
  console.log('[Gemini API] API key configured, length:', apiKey.length, 'model:', GEMINI_MODEL);
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
};

// Helper function to generate content with fallback model
async function generateWithFallback(
  ai: GoogleGenAI,
  contents: string,
  config?: { systemInstruction?: string },
  preferredModel?: string
): Promise<string> {
  let lastError: any = null;
  const primaryModel = preferredModel || GEMINI_MODEL_FLASH;

  // Try primary model
  try {
    console.log(`[Gemini API] Trying primary model: ${primaryModel}`);
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents,
      config,
    });
    return response.text || '';
  } catch (error: any) {
    console.warn(`[Gemini API] Primary model ${primaryModel} failed:`, error.message);
    lastError = error;
  }

  // Try fallback model
  try {
    console.log(`[Gemini API] Trying fallback model: ${GEMINI_MODEL_FALLBACK}`);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_FALLBACK,
      contents,
      config,
    });
    return response.text || '';
  } catch (error: any) {
    console.error(`[Gemini API] Fallback model ${GEMINI_MODEL_FALLBACK} also failed:`, error.message);
    // Throw the last error with more context
    throw new Error(`AI modellen niet beschikbaar. Primary: ${lastError?.message || 'unknown'}. Fallback: ${error.message}`);
  }
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

  try {
    const { action, payload } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const ai = getAI();

    switch (action) {
      case 'getExplanation': {
        const { question, studentAnswer } = payload;
        const result = await generateExplanation(ai, question, studentAnswer);
        return res.status(200).json({ result });
      }

      case 'generateQuestions': {
        const { subject, level, count, topic } = payload;
        const result = await generateAIQuestions(ai, subject, level, count, topic);
        return res.status(200).json({ result });
      }

      case 'generateLookalikeQuestions': {
        const { subject, level, count, topic, examStyle } = payload;
        const result = await generateLookalikeExamQuestions(ai, subject, level, count, topic, examStyle);
        return res.status(200).json({ result });
      }

      case 'generateExamSummary': {
        const { questions, answers, score, totalQuestions, studentName, subject } = payload;
        const result = await generateExamSummary(ai, questions, answers, score, totalQuestions, studentName, subject);
        return res.status(200).json({ result });
      }

      case 'generateFlashcards': {
        const { subject, level, count, topic } = payload;
        const result = await generateFlashcards(ai, subject, level, count, topic);
        return res.status(200).json({ result });
      }

      case 'chat': {
        const { message, systemInstruction } = payload;
        const result = await chat(ai, message, systemInstruction);
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

    // Provide more specific error messages
    let errorMessage = 'Er ging iets mis met de AI service';
    if (error.message?.includes('API_KEY')) {
      errorMessage = 'API key configuratie probleem';
    } else if (error.message?.includes('quota') || error.message?.includes('rate')) {
      errorMessage = 'API limiet bereikt, probeer het later opnieuw';
    } else if (error.message?.includes('model')) {
      errorMessage = 'Model niet beschikbaar: ' + error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      error: errorMessage
    });
  }
}

// ============================================================================
// AI FUNCTIONS (server-side only)
// ============================================================================

async function generateExplanation(ai: GoogleGenAI, question: any, studentAnswer: number | string): Promise<string> {
  let prompt = '';

  if (question.type === 'MULTIPLE_CHOICE') {
    const ansIdx = studentAnswer as number;
    const ansText = question.options ? question.options[ansIdx] : '';
    const correctAnsText = question.options && question.correctIndex !== undefined ? question.options[question.correctIndex] : '';
    const isCorrect = ansIdx === question.correctIndex;

    prompt = `
      Je bent een behulpzame leraar. De leerling maakte een meerkeuzevraag.

      Vraag: "${question.text}"
      Onderwerp: ${question.subject}
      ${question.contextText ? `Context tekst: "${question.contextText.substring(0, 300)}..."` : ''}

      Leerling antwoord: "${ansText}"
      Juist antwoord: "${correctAnsText}"
      Resultaat: ${isCorrect ? 'Correct' : 'Fout'}

      Geef uitleg (max 3 zinnen). Als het fout is, leg uit waarom het goede antwoord juist is.
      Antwoord in het Nederlands.
    `;
  } else {
    const ansText = studentAnswer as string;

    prompt = `
      Je bent een strenge maar eerlijke leraar die een open vraag nakijkt.

      Vraag: "${question.text}"
      Onderwerp: ${question.subject}
      ${question.contextText ? `Context tekst: "${question.contextText.substring(0, 500)}..."` : ''}

      Modelantwoord (gebruik dit als referentie voor correctheid): "${question.modelAnswer}"

      Het antwoord van de leerling: "${ansText}"

      Opdracht:
      1. Beoordeel of het antwoord van de leerling inhoudelijk overeenkomt met het modelantwoord.
      2. Begin met "CORRECT", "DEELS CORRECT" of "INCORRECT".
      3. Geef daarna een korte uitleg (max 3 zinnen) waarom, en wat er eventueel mist.

      Antwoord in het Nederlands.
    `;
  }

  // Gebruik Pro model voor exacte vakken op HAVO/VWO
  const model = getModelForSubject(question.subject, question.level);
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text || "Geen uitleg beschikbaar.";
}

async function generateAIQuestions(
  ai: GoogleGenAI,
  subject: string,
  level: string,
  count: number = 10,
  topic?: string
): Promise<any[]> {
  let levelInstructions = "";
  let exampleTypes = "";

  switch (level) {
    case 'VMBO-TL':
      levelInstructions = `
      VMBO-TL EINDEXAMEN KENMERKEN:
      - Taal: Helder, direct en concreet. Vermijd complexe zinnen.
      - Vraagstelling: Praktisch gericht, herkenbaar uit het dagelijks leven
      - Antwoorden: Duidelijk onderscheidbaar, geen verwarring
      - Diepgang: Reproductie en begrip, beperkte analyse
      - Focus op: Feiten, basisbegrippen, praktische toepassing
      `;
      exampleTypes = `
      Voorbeeldvragen:
      - Feitelijke kennisvragen ("In welk jaar...", "Wat is de hoofdstad van...")
      - Herkenningsvragen met duidelijke context
      - Eenvoudige oorzaak-gevolg relaties
      `;
      break;

    case 'HAVO':
      levelInstructions = `
      HAVO EINDEXAMEN KENMERKEN:
      - Taal: Correct Nederlands met juiste vakterminologie
      - Vraagstelling: Mix van kennis en toepassing, vaak met praktijksituatie
      - Antwoorden: Vereisen goed begrip en kunnen afleidingsantwoorden bevatten
      - Diepgang: Reproductie, begrip én toepassing. Leerling moet verbanden leggen.
      - Focus op: Concepten uitleggen, theorie toepassen, redeneerketen volgen
      `;
      exampleTypes = `
      Voorbeeldvragen:
      - Toepassingsvragen ("Wat gebeurt er als...", "Welk effect heeft...")
      - Vraagstukken met korte context/casus
      - Vragen die begrip van mechanismen testen
      - Vergelijkingsvragen ("Wat is het verschil tussen...")
      `;
      break;

    case 'VWO':
      levelInstructions = `
      VWO EINDEXAMEN KENMERKEN:
      - Taal: Academisch, genuanceerd met correcte wetenschappelijke terminologie
      - Vraagstelling: Complex, vereist diepgaand begrip en abstractievermogen
      - Antwoorden: Vaak subtiele verschillen, vereist kritisch denken
      - Diepgang: Alle niveaus: kennis, begrip, toepassing, analyse, synthese
      - Focus op: Complexe verbanden, uitzonderingen, onderliggende principes, kritische analyse
      `;
      exampleTypes = `
      Voorbeeldvragen:
      - Analytische vragen ("Verklaar waarom...", "Analyseer de oorzaken van...")
      - Multi-stap redeneringen
      - Vragen die abstractievermogen vereisen
      - Vraagstukken met onverwachte wendingen of uitzonderingen
      - Vragen die dwarsverbanden tussen verschillende onderdelen vereisen
      `;
      break;

    default:
      levelInstructions = "Pas de vraagstelling aan aan het eindexamen niveau.";
      exampleTypes = "";
  }

  const isLanguageSubject = ['Nederlands', 'Engels', 'Duits', 'Frans', 'Spaans'].includes(subject);
  const needsReadingComprehension = isLanguageSubject ||
    (topic && ['Leesvaardigheid', 'Tekstbegrip', 'Tekstanalyse', 'Argumentatieve vaardigheden', 'Samenvatten'].some(t => topic.toLowerCase().includes(t.toLowerCase())));

  const readingComprehensionInstructions = needsReadingComprehension ? `
    TEKSTBEGRIP INSTRUCTIES (ZEER BELANGRIJK):
    - Voeg bij MINSTENS 60% van de vragen een contextText toe met een Nederlandse brontekst
    - De brontekst moet een authentieke Nederlandse tekst zijn (artikel, column, essay, nieuwsbericht, etc.)
    - Schrijf de brontekst ALTIJD in het Nederlands, ook als het vak een vreemde taal is
    - De brontekst moet 150-400 woorden lang zijn
    - Maak de tekst interessant en relevant voor ${level} leerlingen
  ` : '';

  const prompt = `
    Je bent een ervaren examinator die officiële ${level} eindexamenvragen maakt voor het vak ${subject}.
    ${topic ? `SPECIFIEK ONDERWERP: Focus ALLE vragen op het onderwerp: "${topic}".` : ''}

    ${levelInstructions}

    ${exampleTypes}

    ${readingComprehensionInstructions}

    OPDRACHT:
    Maak PRECIES ${count} vragen die volledig voldoen aan ${level} eindexamen niveau.

    VRAAGTYPE MIX:
    - Maak ongeveer 70% MEERKEUZEVRAGEN en 30% OPEN VRAGEN

    Voor MEERKEUZEVRAGEN:
    - 4 antwoordopties hebben (A, B, C, D)
    - 1 duidelijk correct antwoord hebben
    - 3 plausibele maar incorrecte afleidingsantwoorden

    Voor OPEN VRAGEN:
    - Vraag die een uitgebreid antwoord vereist (2-4 zinnen)
    - Geef een duidelijk modelantwoord

    BELANGRIJK: Geef je antwoord als JSON array met dit EXACTE format:
    [
      {
        "type": "MULTIPLE_CHOICE",
        "text": "De vraag hier",
        "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
        "correctIndex": 0,
        "contextText": "Brontekst hier indien van toepassing"
      },
      {
        "type": "OPEN",
        "text": "De open vraag hier",
        "modelAnswer": "Het modelantwoord hier",
        "contextText": "Brontekst hier indien van toepassing"
      }
    ]

    Geef ALLEEN de JSON array terug, geen extra tekst.
  `;

  // Gebruik Pro model voor exacte vakken op HAVO/VWO
  const model = getModelForSubject(subject, level);
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  const responseText = response.text || '';
  if (!responseText.trim()) {
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
    throw new Error("AI genereerde geen vragen.");
  }

  // Convert to Question format
  const questions = [];
  const now = Date.now();

  for (let index = 0; index < questionsData.length; index++) {
    const q = questionsData[index];
    if (!q.text || typeof q.text !== 'string') continue;

    const baseQuestion = {
      id: `ai-${now}-${index}`,
      type: q.type || 'MULTIPLE_CHOICE',
      level: level,
      subject: subject,
      text: q.text.trim(),
      contextText: q.contextText ? q.contextText.trim() : undefined,
      examType: 'practice',
      source: `AI-gegenereerd (${level} niveau)`,
    };

    if (q.type === 'OPEN') {
      questions.push({
        ...baseQuestion,
        type: 'OPEN',
        modelAnswer: q.modelAnswer || 'Geen modelantwoord beschikbaar.',
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
      });
    }
  }

  if (questions.length === 0) {
    throw new Error("Geen geldige vragen konden worden gegenereerd.");
  }

  return questions;
}

async function generateLookalikeExamQuestions(
  ai: GoogleGenAI,
  subject: string,
  level: string,
  count: number = 10,
  topic?: string,
  examStyle?: 'tijdvak1' | 'tijdvak2' | 'mixed'
): Promise<any[]> {
  const examStyleDesc = examStyle === 'tijdvak1'
    ? 'eerste tijdvak (mei/juni)'
    : examStyle === 'tijdvak2'
      ? 'tweede tijdvak (juni/juli, vaak iets moeilijker)'
      : 'mix van beide tijdvakken';

  let levelExamStyle = "";
  let cognitiveRequirements = "";

  switch (level) {
    case 'VMBO-TL':
      levelExamStyle = `VMBO-TL CENTRAAL EXAMEN KENMERKEN:
      - Examenduur indicatie: ~90-120 minuten voor volledige toets
      - Taalgebruik: Helder, direct en toegankelijk Nederlands`;
      cognitiveRequirements = `Cognitieve niveaus (Bloom):
      - 50% Onthouden en Begrijpen
      - 35% Toepassen
      - 15% Analyseren`;
      break;
    case 'HAVO':
      levelExamStyle = `HAVO CENTRAAL EXAMEN KENMERKEN:
      - Examenduur indicatie: ~150-180 minuten voor volledige toets
      - Taalgebruik: Correct Nederlands met vakspecifieke terminologie`;
      cognitiveRequirements = `Cognitieve niveaus (Bloom):
      - 30% Onthouden en Begrijpen
      - 40% Toepassen
      - 25% Analyseren
      - 5% Evalueren`;
      break;
    case 'VWO':
      levelExamStyle = `VWO CENTRAAL EXAMEN KENMERKEN:
      - Examenduur indicatie: ~180-210 minuten voor volledige toets
      - Taalgebruik: Academisch, genuanceerd`;
      cognitiveRequirements = `Cognitieve niveaus (Bloom):
      - 20% Onthouden en Begrijpen
      - 30% Toepassen
      - 30% Analyseren
      - 15% Evalueren
      - 5% Creëren`;
      break;
    default:
      levelExamStyle = "Pas aan aan het niveau.";
      cognitiveRequirements = "";
  }

  const prompt = `
    Je bent een ervaren CITO-examinator die authentieke ${level} centraal eindexamenvragen maakt voor ${subject}.
    ${topic ? `SPECIFIEK ONDERWERP: Focus alle vragen op: "${topic}"` : ''}

    ${levelExamStyle}
    ${cognitiveRequirements}

    OPDRACHT: Genereer PRECIES ${count} examenvragen (70% meerkeuze, 30% open).

    JSON FORMAT:
    [
      {
        "type": "MULTIPLE_CHOICE",
        "text": "De examenvraag",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 0,
        "contextText": "Brontekst indien van toepassing"
      },
      {
        "type": "OPEN",
        "text": "Open vraag",
        "modelAnswer": "Modelantwoord",
        "contextText": "Brontekst indien van toepassing"
      }
    ]

    Geef ALLEEN de JSON array terug.
  `;

  // Gebruik Pro model voor exacte vakken op HAVO/VWO
  const modelLookalike = getModelForSubject(subject, level);
  const response = await ai.models.generateContent({
    model: modelLookalike,
    contents: prompt,
  });

  const responseText = response.text || '';
  if (!responseText.trim()) {
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
      });
    }
  }

  if (questions.length === 0) {
    throw new Error("Geen geldige examenvragen konden worden gegenereerd.");
  }

  return questions;
}

async function generateExamSummary(
  ai: GoogleGenAI,
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

  const prompt = `
    Je bent een ervaren ${subject} docent die een examen heeft nagekeken van ${studentName}.

    EXAMEN RESULTAAT:
    - Vak: ${subject}
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
  const response = await ai.models.generateContent({
    model: modelSummary,
    contents: prompt,
  });

  const responseText = response.text || '';
  if (!responseText.trim()) {
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
  ai: GoogleGenAI,
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
  const response = await ai.models.generateContent({
    model: modelFlashcards,
    contents: prompt,
  });

  const responseText = response.text || '';
  if (!responseText.trim()) {
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

async function chat(ai: GoogleGenAI, message: string, systemInstruction: string): Promise<string> {
  const result = await generateWithFallback(ai, message, { systemInstruction });
  return result || "Geen antwoord.";
}
