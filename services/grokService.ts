import OpenAI from "openai";
import { Question } from "../types";

// xAI's Grok API is OpenAI-compatible
const apiKey = import.meta.env.VITE_GROK_API_KEY || '';

if (!apiKey) {
  console.warn('Grok API key not found. Set VITE_GROK_API_KEY in your .env file for look-alike exams.');
}

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: 'https://api.x.ai/v1',
  dangerouslyAllowBrowser: true // Required for client-side usage
});

// Generate Look-Alike exam questions using Grok 4 Fast
export const generateLookAlikeQuestions = async (
  subject: string,
  level: string,
  count: number = 10,
  topic?: string
): Promise<Question[]> => {
  // Check if API key is configured before making request
  if (!apiKey) {
    throw new Error('Grok API key is niet geconfigureerd. Voeg VITE_GROK_API_KEY toe aan je .env bestand.');
  }
  // Define level-specific exam requirements
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

  const prompt = `
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

  try {
    const completion = await client.chat.completions.create({
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
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '';

    if (!responseText.trim()) {
      throw new Error("AI gaf een lege response terug. Probeer het opnieuw.");
    }

    // Extract JSON from response (handle various markdown code block formats)
    let jsonText = responseText.trim();

    // Remove markdown code blocks with various formats
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

    // Parse JSON with specific error handling
    let questionsData: any[];
    try {
      questionsData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error. Raw response:", responseText.substring(0, 500));
      throw new Error("AI response kon niet worden verwerkt. Het antwoord was geen geldig JSON formaat.");
    }

    // Validate that we got an array
    if (!Array.isArray(questionsData)) {
      throw new Error("AI response bevatte geen vragenlijst. Probeer het opnieuw.");
    }

    if (questionsData.length === 0) {
      throw new Error("AI genereerde geen vragen. Probeer het opnieuw met een ander onderwerp.");
    }

    // Convert to Question format with validation
    const questions: Question[] = [];

    for (let index = 0; index < questionsData.length; index++) {
      const q = questionsData[index];

      // Validate required fields
      if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) {
        console.warn(`Vraag ${index + 1} heeft geen tekst, wordt overgeslagen`);
        continue;
      }

      const baseQuestion = {
        id: `grok-${Date.now()}-${index}`,
        type: q.type || 'MULTIPLE_CHOICE' as const,
        level: level as any,
        subject: subject,
        text: q.text.trim(),
        contextText: q.contextText ? q.contextText.trim() : undefined,
        examType: 'practice' as const,
        source: `Look-alike examen (${level} niveau)`,
      };

      // Add type-specific properties with validation
      if (q.type === 'OPEN') {
        questions.push({
          ...baseQuestion,
          type: 'OPEN' as const,
          modelAnswer: q.modelAnswer || 'Geen modelantwoord beschikbaar.',
        });
      } else {
        // Validate multiple choice specific fields
        if (!Array.isArray(q.options) || q.options.length < 2) {
          console.warn(`Vraag ${index + 1} heeft ongeldige opties, wordt overgeslagen`);
          continue;
        }

        // Ensure correctIndex is valid
        const correctIndex = typeof q.correctIndex === 'number'
          ? Math.max(0, Math.min(q.correctIndex, q.options.length - 1))
          : 0;

        questions.push({
          ...baseQuestion,
          type: 'MULTIPLE_CHOICE' as const,
          options: q.options.map((opt: any) => String(opt).trim()),
          correctIndex: correctIndex,
        });
      }
    }

    if (questions.length === 0) {
      throw new Error("Geen geldige vragen konden worden gegenereerd. Probeer het opnieuw.");
    }

    return questions;
  } catch (error: any) {
    console.error("Fout bij genereren Grok vragen:", error);

    // Re-throw with more specific error message
    if (error.message && !error.message.includes("Kon geen")) {
      throw error;
    }

    throw new Error("Kon geen look-alike examenvragen genereren. Controleer je internetverbinding en Grok API key.");
  }
};

// Check if Grok API is configured
export const isGrokConfigured = (): boolean => {
  return !!apiKey;
};
