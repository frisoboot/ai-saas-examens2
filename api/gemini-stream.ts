import type { VercelRequest, VercelResponse } from '@vercel/node';
import { streamText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { setCorsHeaders } from './utils/cors.js';
import { checkRateLimit, getClientIP, rateLimits } from './utils/rateLimiter.js';

/**
 * Streaming Exam Generation Endpoint
 *
 * Uses Server-Sent Events (SSE) to stream generated exam questions
 * one-by-one as they are parsed from the AI response. This allows
 * the student to start the exam while remaining questions generate.
 */

export const maxDuration = 60;

// Model configuration - same as gemini.ts
const GEMINI_MODEL_FLASH = process.env.GEMINI_MODEL || 'google/gemini-2.0-flash';
const GEMINI_MODEL_PRO = process.env.GEMINI_MODEL_PRO || 'google/gemini-2.5-pro';
const EXACT_SUBJECTS = ['Wiskunde B', 'Wiskunde A', 'Natuurkunde', 'Scheikunde'];
const PRO_LEVELS = ['HAVO', 'VWO'];

function getModelForSubject(subject?: string, level?: string) {
  const modelId = (subject && level && EXACT_SUBJECTS.includes(subject) && PRO_LEVELS.includes(level))
    ? GEMINI_MODEL_PRO
    : GEMINI_MODEL_FLASH;
  return gateway(modelId);
}

/**
 * Incrementally extract complete JSON objects from a streaming buffer.
 * Uses brace-depth tracking with string-awareness to find balanced {...} blocks.
 */
function extractCompleteObjects(buffer: string): { objects: any[]; remaining: string } {
  const objects: any[] = [];
  let startIdx = -1;
  let braceDepth = 0;
  let inString = false;
  let escapeNext = false;
  let lastExtractEnd = 0;

  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      if (braceDepth === 0) startIdx = i;
      braceDepth++;
    } else if (char === '}') {
      braceDepth--;
      if (braceDepth === 0 && startIdx !== -1) {
        const jsonStr = buffer.substring(startIdx, i + 1);
        try {
          const obj = JSON.parse(jsonStr);
          objects.push(obj);
          lastExtractEnd = i + 1;
        } catch {
          // Malformed JSON - skip this object
          lastExtractEnd = i + 1;
        }
        startIdx = -1;
      }
    }
  }

  const remaining = startIdx !== -1
    ? buffer.substring(startIdx)
    : buffer.substring(lastExtractEnd);

  return { objects, remaining };
}

function getSubjectSpecificInstructions(subject: string, level: string): string {
  const s = subject.toLowerCase();

  if (s === 'nederlands') {
    const textLength = level === 'VMBO-TL' ? '150-250' : '250-400';
    return `VAKEIGEN INSTRUCTIES NEDERLANDS:
    LEESVAARDIGHEID (meerkeuze):
    - Gebruik ALTIJD een realistische brontekst als contextText (${textLength} woorden): krantenartikel, column, informatieve tekst of betoog
    - Vraagsoorten: strekking van een alinea, schrijfdoel, betekenis van woord/zinsdeel, tekststructuur, verwijswoorden, hoofd- en bijzaak, toon/register, argumentatieschema
    - Formuleringen: "Wat is de strekking van alinea X?", "Welk schrijfdoel heeft de auteur?", "Wat bedoelt de auteur met '...'?", "Welk verband heeft alinea X met alinea Y?"
    - Meerkeuze opties zijn ALTIJD volledige zinnen
    SCHRIJFVAARDIGHEID (open vragen):
    - Geef een concrete schrijfopdracht met doelgroep, tekstsoort en min. woordlengterichtlijn
    - Voorbeeld: "Schrijf een overtuigende reactie van minimaal 150 woorden op het standpunt van de auteur. Gebruik minimaal twee argumenten."
    - ModelAnswer beschrijft correctiecriteria: inhoud, structuur, argumentatie, taalgebruik\n`;
  }

  if (s === 'engels' || s === 'duits' || s === 'frans') {
    const textLength = level === 'VMBO-TL' ? '150-250' : '250-400';
    const langLabel = s === 'engels' ? 'English' : s === 'duits' ? 'Deutsch' : 'français';
    return `VAKEIGEN INSTRUCTIES ${subject.toUpperCase()}:
    - Gebruik ALTIJD een authentieke brontekst als contextText (${textLength} woorden) in het ${langLabel}
    - Vraagsoorten: main idea, author's purpose, meaning of words/phrases in context, text structure, inference, detail questions
    - Meerkeuze opties zijn volledige zinnen of duidelijke uitdrukkingen
    - Woordenschatvragen: één of twee MC-vragen over woordbetekenis in context (geen losse vertalingen)
    - Open vragen: tekstbegrip of korte schrijfopdracht in de doeltaal\n`;
  }

  if (s.includes('wiskunde')) {
    const isB = s.includes('b');
    const isA = s.includes('a') && !s.includes('b') && !s.includes('c');
    return `VAKEIGEN INSTRUCTIES ${subject.toUpperCase()}:
    - Formuleer opgaven ALTIJD in een realistische context (bijv. "Een aannemer berekent...", "Een meteoroloog meet...")
    - Gebruik LaTeX voor wiskundige notatie: $f(x) = 2x+3$, $\\frac{dy}{dx}$, $\\int_0^1 x^2\\,dx$, $P(X=k)$
    - Open vragen: verdeel complexe problemen in sub-onderdelen a), b), c) in de vraagtekst zelf
    - Meerkeuze opties zijn altijd getallen, uitdrukkingen of compacte formules (geen volzinnen)
    - maxPoints voor open: 1 punt (directe berekening), 2-3 punten (meerstaps met tussenstap tonen), 4-5 punten (bewijs of afleiding)
    ${isB ? '- Wiskunde B: zorg voor afleidingen, goniometrie, meetkunde met coördinaten en integralen' : ''}
    ${isA ? '- Wiskunde A: focus op statistiek, kansen, verbanden/grafieken en contextproblemen' : ''}\n`;
  }

  if (s === 'natuurkunde') {
    return `VAKEIGEN INSTRUCTIES NATUURKUNDE:
    - Beschrijf een concrete experimentopstelling of praktijksituatie in contextText (bijv. vallend voorwerp, elektrische schakeling)
    - Gebruik correcte SI-eenheden en LaTeX voor formules: $F = ma$, $P = \\frac{U^2}{R}$, $E_k = \\frac{1}{2}mv^2$
    - Vraagtypen: verklaar het verschijnsel, bereken de gevraagde grootheid, wat verandert er als variabele X toeneemt?
    - Open modelantwoord: formule noemen → grootheden invullen → uitkomst met juiste eenheid
    - Meerkeuze distractors: plausibele rekenfouten (factor 2 fout, eenheid niet omgezet, teken fout)
    - maxPoints: 1 punt (definitie/feit), 2 punten (eenvoudige berekening), 3-4 punten (meerstaps)\n`;
  }

  if (s === 'scheikunde') {
    return `VAKEIGEN INSTRUCTIES SCHEIKUNDE:
    - Gebruik correcte, gebalanceerde reactievergelijkingen waar relevant: $2H_2 + O_2 \\rightarrow 2H_2O$
    - Contextscenario's: industrieel proces, milieuchemie, laboratoriumexperiment (beschreven in tekst)
    - Vraagtypen: geef de reactievergelijking, bereken de massa/concentratie via mol, verklaar de evenwichtsligging, benoem het reactietype
    - Open modelantwoord: stapsgewijs (mol → massa/volume → conclusie)
    - maxPoints: 1-4 punten afhankelijk van complexiteit\n`;
  }

  if (s === 'biologie') {
    return `VAKEIGEN INSTRUCTIES BIOLOGIE:
    - Gebruik een realistische biologische casus als contextText: patiëntcasus, ecologisch scenario, genetisch probleem of experimentbeschrijving
    - Vraagformuleringen: "Leg uit waarom...", "Noem twee kenmerken van...", "Beschrijf het proces van...", "Verklaar het verband tussen..."
    - Gebruik correcte biologische terminologie zonder uitleg in de vraag (leerling moet die kennen)
    - Erfelijkheidsopgaven: beschrijf een stamboom in tekst en vraag naar genotype/kansen
    - Open modelantwoord: bevat exacte sleuteltermen die de leerling moet noemen
    - maxPoints: 1 punt (benoemvraag), 2 punten (uitlegvraag), 3-4 punten (redeneer- of berekeningsvraag)\n`;
  }

  if (s === 'geschiedenis') {
    return `VAKEIGEN INSTRUCTIES GESCHIEDENIS:
    - Voeg ALTIJD een korte historische bron toe als contextText (80-150 woorden): citaat, document of samenvatting met vermelding van auteur, jaar en type
    - Vraagtypen: broninterpretatie ("Geef een verklaring voor het standpunt van de auteur"), oorzaak-gevolg, vergelijking van periodes, continuïteit en verandering
    - Gebruik officiële tijdvaktermen en historische contexten correct
    - Open vragen vragen ALTIJD om een redenering onderbouwd met historische feiten
    - maxPoints: 2 punten (feitenvraag), 4-6 punten (historiografisch redeneren)\n`;
  }

  if (s === 'aardrijkskunde') {
    return `VAKEIGEN INSTRUCTIES AARDRIJKSKUNDE:
    - Schets een geografisch vraagstuk als contextText (bijv. klimaatverandering in een regio, migratiestroom, verstedelijking)
    - Vraagtypen: beschrijf het patroon, verklaar het proces, leg het verband uit tussen menselijk handelen en fysische omgeving
    - Gebruik geografische kernbegrippen: push-pull-factoren, urbanisatie, duurzame ontwikkeling, hydrologische cyclus
    - Open: "Leg het verband uit tussen...", "Geef een oorzaak voor...", "Beschrijf de gevolgen van..."
    - maxPoints: 1-3 punten per open vraag\n`;
  }

  if (s === 'economie' || s === 'bedrijfseconomie') {
    return `VAKEIGEN INSTRUCTIES ${subject.toUpperCase()}:
    - Gebruik een economische situatieschets als contextText met concrete cijfers (bijv. prijs stijgt van €X naar €Y, vraag daalt met Z%)
    - Vraagtypen: berekeningen (elasticiteit, winst, btw, rentabiliteit), marktanalyse, beleidsevaluatie
    - Gebruik economische begrippen correct: vraagelasticiteit, consumentensurplus, begrotingstekort, liquiditeit
    - Open modelantwoord: economische redenering met oorzaak → gevolg → conclusie
    - maxPoints: 1-4 punten\n`;
  }

  if (s === 'maatschappijwetenschappen') {
    return `VAKEIGEN INSTRUCTIES MAATSCHAPPIJWETENSCHAPPEN:
    - Gebruik een actuele maatschappelijke casus als contextText (100-200 woorden): nieuwsartikel over politiek besluit, sociale kwestie of maatschappelijk debat
    - Vraagtypen: begrip toepassen op casus, standpunten vergelijken, sociaal-politieke verbanden leggen, dilemma's analyseren
    - Kernconcepten: rechtsstaat, democratie, pluriforme samenleving, socialisatie, macht en gezag
    - Open: "Pas het begrip X toe op de casus", "Geef een argument voor én een argument tegen...", "Leg uit hoe..."
    - maxPoints: 1-4 punten\n`;
  }

  if (s === 'kunst algemeen') {
    return `VAKEIGEN INSTRUCTIES KUNST ALGEMEEN:
    - Beschrijf een kunstwerk, cultuurperiode of kunstenaar in contextText (50-120 woorden)
    - Vraagtypen: stijlkenmerken benoemen, kunstwerk in historische context plaatsen, interpretatie van symboliek, vergelijking van stijlen
    - Gebruik correcte kunsthistorische terminologie: iconografie, compositie, kleurgebruik, perspectief
    - Open: "Noem twee kenmerken van de stijl...", "Leg uit hoe dit werk past binnen de periode..."
    - maxPoints: 1-3 punten\n`;
  }

  return '';
}

/**
 * Transform a raw AI-generated question object into a proper Question shape
 * with ID, metadata, and validation.
 */
function transformRawQuestion(
  q: any,
  index: number,
  now: number,
  subject: string,
  level: string,
  examStyleDesc: string
): any | null {
  if (!q.text || typeof q.text !== 'string') return null;

  const baseQuestion = {
    id: `lookalike-${now}-${index}`,
    type: q.type || 'MULTIPLE_CHOICE',
    level,
    subject,
    text: q.text.trim(),
    contextText: q.contextText ? q.contextText.trim() : undefined,
    examType: 'practice',
    source: `Look-alike Examen (${level} - ${examStyleDesc})`,
  };

  if (q.type === 'OPEN') {
    return {
      ...baseQuestion,
      type: 'OPEN',
      modelAnswer: q.modelAnswer || 'Geen modelantwoord beschikbaar.',
      score: typeof q.maxPoints === 'number' && q.maxPoints > 0 ? q.maxPoints : undefined,
    };
  } else {
    if (!Array.isArray(q.options) || q.options.length < 2) return null;
    const correctIndex = typeof q.correctIndex === 'number'
      ? Math.max(0, Math.min(q.correctIndex, q.options.length - 1))
      : 0;
    return {
      ...baseQuestion,
      type: 'MULTIPLE_CHOICE',
      options: q.options.map((opt: any) => String(opt).trim()),
      correctIndex,
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin, 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimitResult = checkRateLimit(`ai:${clientIP}`, rateLimits.aiApi);

  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', String(rateLimitResult.retryAfter || 60));
    return res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' });
  }

  const { subject, level, count = 10, topic, examStyle } = req.body;

  if (!subject || !level) {
    return res.status(400).json({ error: 'Subject en level zijn verplicht.' });
  }

  // Build the exam generation prompt (same as gemini.ts)
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

  const subjectInstructions = getSubjectSpecificInstructions(subject, level);

  const prompt = `
Je bent een ervaren CITO-examinator die authentieke ${level} centraal eindexamenvragen maakt voor ${subject}.
${topic ? `SPECIFIEK ONDERWERP: Focus alle vragen op: "${topic}"` : ''}

${levelExamStyle}
${cognitiveRequirements}

${subjectInstructions}
OPDRACHT: Genereer PRECIES ${count} examenvragen (70% meerkeuze, 30% open).

KWALITEITSEISEN EXAMENVRAGEN:
1. MEERKEUZE: Vier opties (A t/m D). De drie foute opties zijn PLAUSIBELE distractors: veelgemaakte denkfouten, deels-juiste antwoorden, of logisch klinkende maar fout-redenerende opties. Nooit willekeurig foutieve opties.
2. OPEN VRAGEN: Gebruik altijd een officieel signaalwerkwoord dat past bij het gevraagde:
   - "Noem [X]..." → feitelijke opsomming, 1 punt per correct item
   - "Leg uit waarom..." → causale redenering, 2-3 punten
   - "Beschrijf..." → uitgebreide situatiebeschrijving, 2-3 punten
   - "Bereken..." → rekenopgave met stapsgewijze uitwerking, 2-4 punten
   - "Geef een verklaring voor..." → analytisch antwoord, 2-3 punten
   - "Toon aan dat..." → bewijs of afleiding, 3-5 punten
   - "Vergelijk..." → overeenkomsten en/of verschillen benoemen, 2-4 punten
3. CONTEXTTEXT: Gebruik contextText voor bronteksten, bronmateriaal of situatieschetsen conform de vakspecifieke instructies hierboven.

BELANGRIJK - GEEN VISUELE BRONNEN:
- Genereer GEEN vragen die verwijzen naar afbeeldingen, kaarten, grafieken, diagrammen, tabellen, figuren of andere visuele bronnen
- Alle informatie moet VOLLEDIG in tekstvorm worden gegeven

JSON FORMAT:
[
  {
    "type": "MULTIPLE_CHOICE",
    "text": "De examenvraag",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctIndex": 0,
    "contextText": "Brontekst of situatieschets indien van toepassing"
  },
  {
    "type": "OPEN",
    "text": "Open vraag (begin met een signaalwerkwoord)",
    "modelAnswer": "Stapsgewijs modelantwoord met sleuteltermen",
    "maxPoints": 2,
    "contextText": "Brontekst of situatieschets indien van toepassing"
  }
]

Geef ALLEEN de JSON array terug.
  `;

  // Verify API key
  if (!process.env.AI_GATEWAY_API_KEY) {
    return res.status(500).json({ error: 'AI_GATEWAY_API_KEY not configured' });
  }

  const model = getModelForSubject(subject, level);

  // Set SSE headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const result = streamText({ model, prompt });

    let buffer = '';
    let questionIndex = 0;
    const now = Date.now();

    for await (const chunk of result.textStream) {
      buffer += chunk;

      const { objects, remaining } = extractCompleteObjects(buffer);
      buffer = remaining;

      for (const obj of objects) {
        const question = transformRawQuestion(obj, questionIndex, now, subject, level, examStyleDesc);
        if (question) {
          res.write(`data: ${JSON.stringify(question)}\n\n`);
          questionIndex++;
        }
      }
    }

    // Try to parse any remaining buffer content
    if (buffer.trim()) {
      const { objects } = extractCompleteObjects(buffer);
      for (const obj of objects) {
        const question = transformRawQuestion(obj, questionIndex, now, subject, level, examStyleDesc);
        if (question) {
          res.write(`data: ${JSON.stringify(question)}\n\n`);
          questionIndex++;
        }
      }
    }

    if (questionIndex === 0) {
      res.write(`data: ${JSON.stringify({ error: 'Geen examenvragen gegenereerd.' })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('[Gemini Stream] Error:', error.message);

    let errorMessage = 'Er ging iets mis met de AI service';
    if (error.message?.includes('API_KEY') || error.message?.includes('API key')) {
      errorMessage = 'API key configuratie probleem';
    } else if (error.message?.includes('quota') || error.message?.includes('rate')) {
      errorMessage = 'API limiet bereikt, probeer het later opnieuw';
    }

    // If headers already sent (streaming started), send error as SSE event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: errorMessage });
    }
  }
}
