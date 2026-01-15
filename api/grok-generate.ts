import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Grok API Endpoint - Server-side AI vraag generatie
 *
 * SECURITY: De API key blijft server-side en wordt NIET blootgesteld aan de browser.
 *
 * Environment variabele (server-side only):
 * - AI_GATEWAY_API_KEY: De Grok/xAI API key
 */

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
    const { subject, level, count, topic } = req.body;

    // Validatie
    if (!subject || !level) {
      return res.status(400).json({
        success: false,
        error: 'Subject en level zijn verplicht'
      });
    }

    // Haal API key uit environment (SERVER-SIDE)
    const apiKey = process.env.AI_GATEWAY_API_KEY;

    if (!apiKey) {
      console.error('❌ AI_GATEWAY_API_KEY niet ingesteld');
      return res.status(500).json({
        success: false,
        error: 'Grok API is niet geconfigureerd. Neem contact op met de beheerder.'
      });
    }

    // Bouw de prompt
    const prompt = buildPrompt(subject, level, count || 10, topic);

    // Maak request naar xAI/Grok API
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-4-fast',
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
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Grok API error:', response.status, errorData);

      if (response.status === 401) {
        return res.status(500).json({
          success: false,
          error: 'Grok API key is ongeldig. Neem contact op met de beheerder.'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Er ging iets mis bij het genereren van vragen.'
      });
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || '';

    if (!responseText.trim()) {
      return res.status(500).json({
        success: false,
        error: 'AI gaf een lege response terug. Probeer het opnieuw.'
      });
    }

    // Parse en valideer de vragen
    const questions = parseQuestions(responseText, subject, level);

    return res.status(200).json({
      success: true,
      questions
    });

  } catch (error) {
    console.error('❌ Error in grok-generate API:', error);
    return res.status(500).json({
      success: false,
      error: 'Er ging iets mis bij het genereren van vragen.'
    });
  }
}

function buildPrompt(subject: string, level: string, count: number, topic?: string): string {
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

  return `
    Je bent een ervaren examinator van het College voor Toetsen en Examens (CvTE) die OFFICIËLE ${level} eindexamenvragen maakt voor het vak ${subject}.

    BELANGRIJKE OPDRACHT: Maak vragen die NIET te onderscheiden zijn van echte Nederlandse eindexamenvragen.
    ${topic ? `SPECIFIEK ONDERWERP: Focus ALLE vragen op het onderwerp: "${topic}".` : ''}

    ${levelInstructions}

    ${exampleTypes}

    LOOK-ALIKE EXAMEN EISEN:
    - Gebruik de EXACTE schrijfstijl en opmaak van officiële Nederlandse eindexamens
    - Voeg realistische bronvermeldingen toe waar van toepassing
    - Gebruik authentieke contexten en casussen die je in echte examens zou zien
    - Zorg voor de juiste moeilijkheidsgraad en vraagformulering
    - Elk meerkeuze-antwoord moet een letter hebben (A, B, C, D)
    - Open vragen moeten duidelijk aangeven hoeveel punten ze waard zijn

    VAKSPECIFIEKE EISEN VOOR ${subject}:
    - Gebruik authentieke begrippen en situaties uit het vakgebied
    - Zorg dat de vragen aansluiten bij de kerndoelen en eindtermen voor ${level}
    - Maak vragen die typerend zijn voor ${subject} examens
    ${topic ? `- Zorg dat alle vragen gaan over ${topic}` : ''}

    OPDRACHT:
    Maak PRECIES ${count} vragen die IDENTIEK zijn aan echte ${level} eindexamen vragen.

    VRAAGTYPE MIX:
    - Maak ongeveer 70% MEERKEUZEVRAGEN en 30% OPEN VRAGEN
    - Varieer de vraagtypen door het examen heen voor een realistisch eindexamen

    Voor MEERKEUZEVRAGEN:
    - 4 antwoordopties hebben (A, B, C, D)
    - 1 duidelijk correct antwoord hebben
    - 3 plausibele maar incorrecte afleidingsantwoorden (veelgemaakte fouten, dichtbij maar net niet goed)

    Voor OPEN VRAGEN:
    - Vraag die een uitgebreid antwoord vereist (2-4 zinnen)
    - Geef een duidelijk modelantwoord zoals in het officiële correctievoorschrift
    - Geschikt voor dieper begrip en analyse

    BELANGRIJK: Geef je antwoord als JSON array met dit EXACTE format:
    [
      {
        "type": "MULTIPLE_CHOICE",
        "text": "De vraag hier",
        "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
        "correctIndex": 0,
        "contextText": "Optionele brontekst of context (alleen toevoegen als relevant voor de vraag)"
      },
      {
        "type": "OPEN",
        "text": "De open vraag hier",
        "modelAnswer": "Het modelantwoord hier (2-4 zinnen)",
        "contextText": "Optionele brontekst of context (alleen toevoegen als relevant voor de vraag)"
      }
    ]

    Geef ALLEEN de JSON array terug, geen extra tekst ervoor of erna.
  `;
}

function parseQuestions(responseText: string, subject: string, level: string): any[] {
  // Extract JSON from response
  let jsonText = responseText.trim();

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

  const questionsData = JSON.parse(jsonText);

  if (!Array.isArray(questionsData) || questionsData.length === 0) {
    throw new Error('Geen geldige vragen ontvangen');
  }

  // Convert to Question format
  const questions: any[] = [];

  for (let index = 0; index < questionsData.length; index++) {
    const q = questionsData[index];

    if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) {
      continue;
    }

    const baseQuestion = {
      id: `grok-${Date.now()}-${index}`,
      type: q.type || 'MULTIPLE_CHOICE',
      level: level,
      subject: subject,
      text: q.text.trim(),
      contextText: q.contextText ? q.contextText.trim() : undefined,
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

  if (questions.length === 0) {
    throw new Error('Geen geldige vragen konden worden gegenereerd');
  }

  return questions;
}
