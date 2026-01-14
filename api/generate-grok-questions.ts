import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Generate Look-Alike Exam Questions via Vercel AI Gateway
 *
 * SECURITY: API key blijft server-side, wordt nooit naar de browser gestuurd.
 *
 * Environment variabele (server-side only):
 * - AI_GATEWAY_API_KEY: Vercel AI Gateway API key
 */

interface GenerateRequest {
  subject: string;
  level: 'VMBO-TL' | 'HAVO' | 'VWO';
  count: number;
  topic?: string;
}

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
    const { subject, level, count, topic } = req.body as GenerateRequest;

    // Validatie
    if (!subject || !level || !count) {
      return res.status(400).json({
        success: false,
        error: 'subject, level en count zijn verplicht'
      });
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY;

    if (!apiKey) {
      console.error('AI_GATEWAY_API_KEY niet geconfigureerd');
      return res.status(500).json({
        success: false,
        error: 'AI Gateway niet geconfigureerd. Neem contact op met de beheerder.'
      });
    }

    // Build level-specific instructions
    const levelInstructions = getLevelInstructions(level);
    const prompt = buildPrompt(subject, level, count, topic, levelInstructions);

    // Call Vercel AI Gateway with Grok
    const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'xai/grok-4-fast',
        messages: [
          {
            role: 'system',
            content: 'Je bent een expert examinator van het College voor Toetsen en Examens. Je maakt authentieke Nederlandse eindexamenvragen die niet te onderscheiden zijn van echte examens. Antwoord altijd in valid JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        stream: false
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return res.status(500).json({
        success: false,
        error: 'Fout bij communicatie met AI Gateway'
      });
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || '';

    if (!responseText.trim()) {
      return res.status(500).json({
        success: false,
        error: 'AI gaf een lege response terug'
      });
    }

    // Parse JSON from response
    const questions = parseQuestionsFromResponse(responseText, subject, level);

    if (questions.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Geen geldige vragen konden worden gegenereerd'
      });
    }

    return res.status(200).json({
      success: true,
      questions
    });

  } catch (error) {
    console.error('Error generating questions:', error);
    return res.status(500).json({
      success: false,
      error: 'Er ging iets mis bij het genereren van vragen'
    });
  }
}

function getLevelInstructions(level: string): string {
  switch (level) {
    case 'VMBO-TL':
      return `
      VMBO-TL EINDEXAMEN KENMERKEN:
      - Taal: Helder, direct en concreet. Vermijd complexe zinnen.
      - Vraagstelling: Praktisch gericht, herkenbaar uit het dagelijks leven
      - Antwoorden: Duidelijk onderscheidbaar, geen verwarring
      - Diepgang: Reproductie en begrip, beperkte analyse
      - Focus op: Feiten, basisbegrippen, praktische toepassing
      `;
    case 'HAVO':
      return `
      HAVO EINDEXAMEN KENMERKEN:
      - Taal: Correct Nederlands met juiste vakterminologie
      - Vraagstelling: Mix van kennis en toepassing, vaak met praktijksituatie
      - Antwoorden: Vereisen goed begrip en kunnen afleidingsantwoorden bevatten
      - Diepgang: Reproductie, begrip en toepassing. Leerling moet verbanden leggen.
      - Focus op: Concepten uitleggen, theorie toepassen, redeneerketen volgen
      `;
    case 'VWO':
      return `
      VWO EINDEXAMEN KENMERKEN:
      - Taal: Academisch, genuanceerd met correcte wetenschappelijke terminologie
      - Vraagstelling: Complex, vereist diepgaand begrip en abstractievermogen
      - Antwoorden: Vaak subtiele verschillen, vereist kritisch denken
      - Diepgang: Alle niveaus: kennis, begrip, toepassing, analyse, synthese
      - Focus op: Complexe verbanden, uitzonderingen, onderliggende principes
      `;
    default:
      return 'Pas de vraagstelling aan aan het eindexamen niveau.';
  }
}

function buildPrompt(subject: string, level: string, count: number, topic: string | undefined, levelInstructions: string): string {
  return `
    Je bent een ervaren examinator van het College voor Toetsen en Examens (CvTE) die OFFICIELE ${level} eindexamenvragen maakt voor het vak ${subject}.

    BELANGRIJKE OPDRACHT: Maak vragen die NIET te onderscheiden zijn van echte Nederlandse eindexamenvragen.
    ${topic ? `SPECIFIEK ONDERWERP: Focus ALLE vragen op het onderwerp: "${topic}".` : ''}

    ${levelInstructions}

    LOOK-ALIKE EXAMEN EISEN:
    - Gebruik de EXACTE schrijfstijl en opmaak van officiele Nederlandse eindexamens
    - Voeg realistische bronvermeldingen toe waar van toepassing
    - Gebruik authentieke contexten en casussen die je in echte examens zou zien
    - Zorg voor de juiste moeilijkheidsgraad en vraagformulering

    OPDRACHT:
    Maak PRECIES ${count} vragen die IDENTIEK zijn aan echte ${level} eindexamen vragen.

    VRAAGTYPE MIX:
    - Maak ongeveer 70% MEERKEUZEVRAGEN en 30% OPEN VRAGEN

    Voor MEERKEUZEVRAGEN:
    - 4 antwoordopties (A, B, C, D)
    - 1 duidelijk correct antwoord
    - 3 plausibele maar incorrecte afleidingsantwoorden

    Voor OPEN VRAGEN:
    - Vraag die een uitgebreid antwoord vereist (2-4 zinnen)
    - Geef een duidelijk modelantwoord

    BELANGRIJK: Geef je antwoord als JSON array:
    [
      {
        "type": "MULTIPLE_CHOICE",
        "text": "De vraag hier",
        "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
        "correctIndex": 0,
        "contextText": "Optionele brontekst"
      },
      {
        "type": "OPEN",
        "text": "De open vraag hier",
        "modelAnswer": "Het modelantwoord hier",
        "contextText": "Optionele brontekst"
      }
    ]

    Geef ALLEEN de JSON array terug, geen extra tekst.
  `;
}

function parseQuestionsFromResponse(responseText: string, subject: string, level: string): any[] {
  let jsonText = responseText.trim();

  // Remove markdown code blocks
  const codeBlockRegex = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/;
  const match = jsonText.match(codeBlockRegex);
  if (match) {
    jsonText = match[1].trim();
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  // Find JSON array
  if (!jsonText.startsWith('[')) {
    const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonText = arrayMatch[0];
    }
  }

  let questionsData: any[];
  try {
    questionsData = JSON.parse(jsonText);
  } catch {
    console.error('JSON parse error:', responseText.substring(0, 500));
    return [];
  }

  if (!Array.isArray(questionsData)) {
    return [];
  }

  // Convert to Question format
  const questions: any[] = [];

  for (let index = 0; index < questionsData.length; index++) {
    const q = questionsData[index];

    if (!q.text || typeof q.text !== 'string') {
      continue;
    }

    const baseQuestion = {
      id: `grok-${Date.now()}-${index}`,
      type: q.type || 'MULTIPLE_CHOICE',
      level: level,
      subject: subject,
      text: q.text.trim(),
      contextText: q.contextText?.trim(),
      examType: 'practice',
      source: `Look-alike examen (${level} niveau)`,
    };

    if (q.type === 'OPEN') {
      questions.push({
        ...baseQuestion,
        type: 'OPEN',
        modelAnswer: q.modelAnswer || 'Geen modelantwoord beschikbaar.',
      });
    } else {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        continue;
      }

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

  return questions;
}
