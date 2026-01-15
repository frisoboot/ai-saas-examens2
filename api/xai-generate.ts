import type { VercelRequest, VercelResponse } from '@vercel/node';

// xAI API configuration - using grok-3 (best available model)
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_MODEL = 'grok-3';

interface GenerateRequest {
  subject: string;
  level: string;
  count: number;
  topic?: string;
}

interface Question {
  type: 'MULTIPLE_CHOICE' | 'OPEN';
  text: string;
  options?: string[];
  correctIndex?: number;
  modelAnswer?: string;
  contextText?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    console.error('XAI_API_KEY is not configured');
    return res.status(500).json({ error: 'xAI API key niet geconfigureerd op de server' });
  }

  try {
    const { subject, level, count, topic } = req.body as GenerateRequest;

    if (!subject || !level || !count) {
      return res.status(400).json({ error: 'Vak, niveau en aantal zijn verplicht' });
    }

    // Build the prompt for look-alike exam questions
    const prompt = buildLookAlikePrompt(subject, level, count, topic);

    const response = await fetch(XAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: [
          {
            role: 'system',
            content: `Je bent een ervaren examinator die authentieke ${level} eindexamenvragen maakt. Je specialiteit is het maken van "look-alike" vragen: vragen die qua stijl, structuur en moeilijkheidsgraad niet te onderscheiden zijn van echte CITO/CvTE eindexamenvragen. Antwoord ALTIJD in correct JSON formaat.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('xAI API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `xAI API fout: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'Geen response van xAI ontvangen' });
    }

    // Parse the JSON response
    const questions = parseQuestionsFromResponse(content, subject, level);

    return res.status(200).json({ questions });

  } catch (error: any) {
    console.error('Error generating xAI questions:', error);
    return res.status(500).json({
      error: 'Er ging iets mis bij het genereren van vragen',
      details: error.message
    });
  }
}

function buildLookAlikePrompt(subject: string, level: string, count: number, topic?: string): string {
  // Level-specific instructions for authentic exam style
  let levelStyle = '';
  switch (level) {
    case 'VMBO-TL':
      levelStyle = `
VMBO-TL EXAMENSTIJL:
- Taalgebruik: Helder en toegankelijk, korte zinnen
- Context: Praktische situaties uit het dagelijks leven
- Vraagtypen: Directe kennisvragen, herkenning, eenvoudige toepassing
- Afleiders: Duidelijk fout maar aannemelijk voor wie niet goed opgelet heeft
- Bronnen: Korte, concrete bronteksten met praktische informatie`;
      break;
    case 'HAVO':
      levelStyle = `
HAVO EXAMENSTIJL:
- Taalgebruik: Helder met correcte vakterminologie
- Context: Mix van praktijk en theorie, actuele onderwerpen
- Vraagtypen: Begrip, toepassing, eenvoudige analyse
- Afleiders: Gebaseerd op veelvoorkomende misconcepties
- Bronnen: Artikelen, grafieken, tabellen met enige complexiteit`;
      break;
    case 'VWO':
      levelStyle = `
VWO EXAMENSTIJL:
- Taalgebruik: Academisch, genuanceerd, wetenschappelijke terminologie
- Context: Complexe casussen, wetenschappelijke vraagstukken
- Vraagtypen: Analyse, synthese, evaluatie, kritisch denken
- Afleiders: Subtiele varianten die diep begrip vereisen om te onderscheiden
- Bronnen: Wetenschappelijke teksten, complexe data, meerdere perspectieven`;
      break;
  }

  return `
Je opdracht is om ${count} AUTHENTIEKE "look-alike" eindexamenvragen te maken voor ${subject} op ${level} niveau.

${levelStyle}

${topic ? `SPECIFIEK ONDERWERP: Alle vragen moeten gaan over "${topic}"` : 'ONDERWERPEN: Varieer over de belangrijkste eindexamenonderwerpen voor dit vak'}

KENMERKEN VAN AUTHENTIEKE EINDEXAMENVRAGEN:
1. Vraagstructuur: Begin met context/situatie, dan de eigenlijke vraag
2. Antwoordopties (MC): 4 opties die allemaal op het eerste gezicht plausibel lijken
3. Afleiders: Gebaseerd op echte denkfouten/misconcepties van leerlingen
4. Bronteksten: Realistische bronnen zoals je ze in echte examens tegenkomt
5. Puntenverdeling-gevoel: Vragen die 2-4 punten waard zouden zijn

VRAAGMIX:
- 70% Meerkeuzevragen (4 opties A-D)
- 30% Open vragen (kort antwoord, 2-4 zinnen)

BELANGRIJK - JSON FORMAT:
Geef je antwoord als een JSON array met EXACT dit formaat:
[
  {
    "type": "MULTIPLE_CHOICE",
    "text": "De volledige vraag inclusief eventuele context",
    "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
    "correctIndex": 0,
    "contextText": "Optionele brontekst (alleen als relevant)"
  },
  {
    "type": "OPEN",
    "text": "De open vraag",
    "modelAnswer": "Het uitgewerkte modelantwoord",
    "contextText": "Optionele brontekst (alleen als relevant)"
  }
]

Geef ALLEEN de JSON array terug, geen andere tekst.`;
}

function parseQuestionsFromResponse(content: string, subject: string, level: string): Question[] {
  let jsonText = content.trim();

  // Remove markdown code blocks
  const codeBlockRegex = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/;
  const match = jsonText.match(codeBlockRegex);
  if (match) {
    jsonText = match[1].trim();
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  // Try to find JSON array if there's extra text
  if (!jsonText.startsWith('[')) {
    const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      jsonText = arrayMatch[0];
    }
  }

  let questionsData: any[];
  try {
    questionsData = JSON.parse(jsonText);
  } catch (parseError) {
    console.error('JSON parse error:', parseError, 'Content:', content.substring(0, 500));
    throw new Error('Kon de AI response niet verwerken als JSON');
  }

  if (!Array.isArray(questionsData) || questionsData.length === 0) {
    throw new Error('Geen geldige vragen ontvangen van de AI');
  }

  // Convert to Question format with validation
  const questions: Question[] = [];

  for (let index = 0; index < questionsData.length; index++) {
    const q = questionsData[index];

    if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) {
      console.warn(`Question ${index + 1} has no text, skipping`);
      continue;
    }

    const baseQuestion = {
      id: `xai-${Date.now()}-${index}`,
      type: q.type || 'MULTIPLE_CHOICE',
      level: level,
      subject: subject,
      text: q.text.trim(),
      contextText: q.contextText ? q.contextText.trim() : undefined,
      examType: 'practice',
      source: `xAI Look-alike (${level} niveau)`,
    };

    if (q.type === 'OPEN') {
      questions.push({
        ...baseQuestion,
        type: 'OPEN',
        modelAnswer: q.modelAnswer || 'Geen modelantwoord beschikbaar.',
      });
    } else {
      if (!Array.isArray(q.options) || q.options.length < 2) {
        console.warn(`Question ${index + 1} has invalid options, skipping`);
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

  if (questions.length === 0) {
    throw new Error('Geen geldige vragen konden worden verwerkt');
  }

  return questions;
}
