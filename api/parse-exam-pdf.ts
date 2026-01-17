import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

/**
 * Parse Exam PDF API Endpoint
 *
 * Parses PDF exam files (questions and answers) using Gemini AI
 * and returns structured question data ready for import.
 *
 * POST /api/parse-exam-pdf
 * Body: {
 *   questionsBase64: string,    // Base64 encoded PDF with questions
 *   answersBase64?: string,     // Base64 encoded PDF/text with answers (optional)
 *   answersText?: string,       // Plain text answers (alternative to PDF)
 *   subject: string,            // e.g., "Geschiedenis"
 *   level: string,              // "VMBO-TL" | "HAVO" | "VWO"
 *   examYear: number,           // e.g., 2024
 *   source?: string             // e.g., "Tijdvak 1"
 * }
 */

// Lazy initialization
let _ai: GoogleGenAI | null = null;

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const getAI = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable not set');
  }
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      questionsBase64,
      answersBase64,
      answersText,
      subject,
      level,
      examYear,
      source
    } = req.body;

    // Validation
    if (!questionsBase64) {
      return res.status(400).json({ error: 'questionsBase64 is verplicht' });
    }
    if (!subject) {
      return res.status(400).json({ error: 'subject is verplicht' });
    }
    if (!level || !['VMBO-TL', 'HAVO', 'VWO'].includes(level)) {
      return res.status(400).json({ error: 'level moet VMBO-TL, HAVO, of VWO zijn' });
    }
    if (!examYear || examYear < 2000 || examYear > 2100) {
      return res.status(400).json({ error: 'examYear is verplicht (2000-2100)' });
    }

    const ai = getAI();

    // Step 1: Parse the questions PDF
    console.log('[Parse Exam PDF] Parsing questions PDF...');
    const questionsResult = await parseQuestionsPDF(ai, questionsBase64, subject, level, examYear);

    if (!questionsResult.questions || questionsResult.questions.length === 0) {
      return res.status(400).json({
        error: 'Kon geen vragen extraheren uit de PDF',
        details: questionsResult.error
      });
    }

    // Step 2: Parse answers if provided
    let answersMap: Record<string, any> = {};
    if (answersBase64 || answersText) {
      console.log('[Parse Exam PDF] Parsing answers...');
      answersMap = await parseAnswers(
        ai,
        answersBase64 || null,
        answersText || null,
        questionsResult.questions.length
      );
    }

    // Step 3: Match answers to questions
    const finalQuestions = matchAnswersToQuestions(
      questionsResult.questions,
      answersMap,
      subject,
      level,
      examYear,
      source
    );

    console.log(`[Parse Exam PDF] Successfully parsed ${finalQuestions.length} questions`);

    return res.status(200).json({
      success: true,
      questions: finalQuestions,
      totalParsed: finalQuestions.length,
      questionsWithAnswers: finalQuestions.filter(q =>
        q.type === 'MULTIPLE_CHOICE' ? q.correctAnswer : q.modelAnswer
      ).length
    });

  } catch (error: any) {
    console.error('[Parse Exam PDF] Error:', error);

    let errorMessage = 'Er ging iets mis bij het parsen van de PDF';
    if (error.message?.includes('API_KEY')) {
      errorMessage = 'API key configuratie probleem';
    } else if (error.message?.includes('quota') || error.message?.includes('rate')) {
      errorMessage = 'API limiet bereikt, probeer het later opnieuw';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return res.status(500).json({ error: errorMessage });
  }
}

/**
 * Parse questions from a PDF using Gemini
 */
async function parseQuestionsPDF(
  ai: GoogleGenAI,
  pdfBase64: string,
  subject: string,
  level: string,
  examYear: number
): Promise<{ questions: any[]; error?: string }> {

  const prompt = `
Je bent een expert in het analyseren van Nederlandse eindexamens. Analyseer deze PDF van een ${level} ${subject} eindexamen uit ${examYear}.

OPDRACHT: Extraheer ALLE vragen uit dit examen en zet ze om naar JSON formaat.

BELANGRIJK:
- Behoud de EXACTE vraagtekst zoals deze in het examen staat
- Nummer de vragen correct (vraag 1, 2, 3, etc.)
- Herken het vraagtype: MULTIPLE_CHOICE (met A, B, C, D opties) of OPEN (vrije tekst antwoord)
- Voor meerkeuze: extraheer alle antwoordopties exact zoals ze in het examen staan
- Voor open vragen: noteer dat het een open vraag is
- Als er een brontekst/tekstfragment bij de vraag hoort, neem deze op in contextText
- Let op: sommige vragen verwijzen naar eerdere bronnen/teksten in het examen

BELANGRIJK OVER BRONTEKSTEN:
- Als meerdere vragen naar DEZELFDE brontekst verwijzen, kopieer de volledige brontekst bij ELKE vraag die ernaar verwijst
- Bronnen/teksten staan vaak aan het begin van een vragengroep met een titel als "Tekst 1", "Bron A", etc.
- Neem de volledige brontekst over, niet alleen een samenvatting

JSON FORMAT (geef ALLEEN deze array terug, geen andere tekst):
[
  {
    "questionNumber": 1,
    "type": "MULTIPLE_CHOICE",
    "text": "De exacte vraagtekst hier",
    "contextText": "Eventuele brontekst die bij deze vraag hoort (volledig overnemen)",
    "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
    "hasImage": false,
    "imageDescription": ""
  },
  {
    "questionNumber": 2,
    "type": "OPEN",
    "text": "De exacte open vraag hier",
    "contextText": "Eventuele brontekst",
    "maxScore": 3,
    "hasImage": true,
    "imageDescription": "Beschrijving van afbeelding/grafiek indien aanwezig"
  }
]

Analyseer nu de PDF en extraheer alle vragen:
`;

  try {
    // Remove data URL prefix if present
    let cleanBase64 = pdfBase64;
    if (pdfBase64.includes(',')) {
      cleanBase64 = pdfBase64.split(',')[1];
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: cleanBase64
              }
            }
          ]
        }
      ]
    });

    const responseText = response.text || '';
    if (!responseText.trim()) {
      return { questions: [], error: 'AI gaf een lege response' };
    }

    // Extract JSON from response
    let jsonText = responseText.trim();
    const codeBlockRegex = /```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/;
    const match = jsonText.match(codeBlockRegex);
    if (match) {
      jsonText = match[1].trim();
    }

    // Find array in response
    if (!jsonText.startsWith('[')) {
      const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonText = arrayMatch[0];
      }
    }

    const questions = JSON.parse(jsonText);

    if (!Array.isArray(questions)) {
      return { questions: [], error: 'Ongeldig JSON formaat' };
    }

    return { questions };

  } catch (error: any) {
    console.error('[parseQuestionsPDF] Error:', error);
    return {
      questions: [],
      error: error.message || 'Kon PDF niet parsen'
    };
  }
}

/**
 * Parse answers from PDF or text
 */
async function parseAnswers(
  ai: GoogleGenAI,
  answersPdfBase64: string | null,
  answersText: string | null,
  expectedQuestionCount: number
): Promise<Record<string, any>> {

  const prompt = `
Je bent een expert in het analyseren van Nederlandse eindexamen antwoordmodellen/correctievoorschriften.

OPDRACHT: Extraheer ALLE antwoorden uit dit correctievoorschrift/antwoordmodel.

BELANGRIJK:
- Koppel elk antwoord aan het juiste vraagnummer
- Voor meerkeuze: geef het juiste antwoord (A, B, C, of D)
- Voor open vragen: geef het modelantwoord of de beoordelingscriteria
- Er zijn ongeveer ${expectedQuestionCount} vragen verwacht

JSON FORMAT (geef ALLEEN dit object terug):
{
  "1": {
    "type": "MULTIPLE_CHOICE",
    "correctAnswer": "B",
    "explanation": "Korte uitleg indien aanwezig"
  },
  "2": {
    "type": "OPEN",
    "modelAnswer": "Het volledige modelantwoord hier",
    "scoringCriteria": "Eventuele beoordelingscriteria",
    "maxScore": 3
  }
}

Analyseer nu en extraheer alle antwoorden:
`;

  try {
    let response;

    if (answersPdfBase64) {
      // Parse PDF
      let cleanBase64 = answersPdfBase64;
      if (answersPdfBase64.includes(',')) {
        cleanBase64 = answersPdfBase64.split(',')[1];
      }

      response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: cleanBase64
                }
              }
            ]
          }
        ]
      });
    } else if (answersText) {
      // Parse text
      response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt + '\n\nANTWOORDEN TEKST:\n' + answersText
      });
    } else {
      return {};
    }

    const responseText = response?.text || '';
    if (!responseText.trim()) {
      return {};
    }

    // Extract JSON from response
    let jsonText = responseText.trim();
    const codeBlockRegex = /```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```/;
    const match = jsonText.match(codeBlockRegex);
    if (match) {
      jsonText = match[1].trim();
    }

    // Find object in response
    if (!jsonText.startsWith('{')) {
      const objectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonText = objectMatch[0];
      }
    }

    return JSON.parse(jsonText);

  } catch (error: any) {
    console.error('[parseAnswers] Error:', error);
    return {};
  }
}

/**
 * Match parsed answers to questions and create final import-ready format
 */
function matchAnswersToQuestions(
  questions: any[],
  answersMap: Record<string, any>,
  subject: string,
  level: string,
  examYear: number,
  source?: string
): any[] {

  return questions.map((q, index) => {
    const questionNumber = q.questionNumber || (index + 1);
    const answer = answersMap[questionNumber.toString()] || {};

    const baseQuestion: any = {
      subject,
      level,
      type: q.type || 'OPEN',
      text: q.text || '',
      examYear,
      contextText: q.contextText || undefined,
      source: source || `${subject} ${level} ${examYear}`,
      questionNumber,
      hasImage: q.hasImage || false,
      imageDescription: q.imageDescription || undefined
    };

    if (q.type === 'MULTIPLE_CHOICE') {
      baseQuestion.options = q.options || [];

      // Match correct answer
      if (answer.correctAnswer) {
        const answerLetter = answer.correctAnswer.toUpperCase();
        const letterIndex = ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(answerLetter);
        if (letterIndex !== -1 && letterIndex < (q.options?.length || 0)) {
          baseQuestion.correctAnswer = q.options[letterIndex];
        } else {
          baseQuestion.correctAnswer = answer.correctAnswer;
        }
      }
    } else {
      // Open question
      baseQuestion.modelAnswer = answer.modelAnswer || answer.scoringCriteria || '';
      if (answer.maxScore || q.maxScore) {
        baseQuestion.maxScore = answer.maxScore || q.maxScore;
      }
    }

    return baseQuestion;
  });
}
