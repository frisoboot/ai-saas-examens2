import { GoogleGenAI, Chat } from "@google/genai";
import { Question, StudentProfile, Flashcard, StudentLevel } from "../types";

// Fix: Use Vite's import.meta.env instead of process.env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('Gemini API key not found. Set VITE_GEMINI_API_KEY in your .env file.');
}

// Lazy initialization to prevent crashes with empty API key
let _ai: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
  if (!apiKey) {
    throw new Error('Gemini API key niet geconfigureerd. Stel VITE_GEMINI_API_KEY in je .env bestand in.');
  }
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
};

// Explanation for Exam Review
export const getExplanation = async (question: Question, studentAnswer: number | string): Promise<string> => {
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
      // OPEN QUESTION
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

  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Geen uitleg beschikbaar.";
  } catch (error) {
    console.error("Fout bij ophalen AI uitleg:", error);
    return "Er ging iets mis bij het ophalen van de uitleg. Probeer het later opnieuw.";
  }
};

// New: Subject Expert Chat
export const createSubjectChat = (subject: string, student: StudentProfile): Chat => {
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
  `;

  return getAI().chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: systemInstruction
    }
  });
};

// Generate AI practice questions
export const generateAIQuestions = async (
  subject: string,
  level: string,
  count: number = 10,
  topic?: string
): Promise<Question[]> => {
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

  // Bepaal of het vak tekstbegrip/leesvaardigheid vragen nodig heeft
  const isLanguageSubject = ['Nederlands', 'Engels', 'Duits', 'Frans', 'Spaans'].includes(subject);
  const needsReadingComprehension = isLanguageSubject ||
    (topic && ['Leesvaardigheid', 'Tekstbegrip', 'Tekstanalyse', 'Argumentatieve vaardigheden', 'Samenvatten'].some(t => topic.toLowerCase().includes(t.toLowerCase())));

  const readingComprehensionInstructions = needsReadingComprehension ? `
    TEKSTBEGRIP INSTRUCTIES (ZEER BELANGRIJK):
    - Voeg bij MINSTENS 60% van de vragen een contextText toe met een Nederlandse brontekst
    - De brontekst moet een authentieke Nederlandse tekst zijn (artikel, column, essay, nieuwsbericht, etc.)
    - Schrijf de brontekst ALTIJD in het Nederlands, ook als het vak een vreemde taal is (de vraag toetst begrip, niet de taal van de brontekst)
    - De brontekst moet 150-400 woorden lang zijn
    - Maak de tekst interessant en relevant voor ${level} leerlingen
    - Voorbeelden van geschikte teksten:
      * Krantenartikelen over actuele onderwerpen
      * Opiniestukken en columns
      * Fragmenten uit non-fictie boeken
      * Wetenschappelijke artikelen (aangepast aan niveau)
      * Historische bronnen of verslagen
    - De vragen moeten gaan over de inhoud, structuur, of argumentatie van de tekst
    - Varieer in vraagtypen: hoofdgedachte, tekstdoel, woordbetekenis, verwijswoorden, argumentatie
  ` : '';

  const prompt = `
    Je bent een ervaren examinator die officiële ${level} eindexamenvragen maakt voor het vak ${subject}.
    ${topic ? `SPECIFIEK ONDERWERP: Focus ALLE vragen op het onderwerp: "${topic}".` : ''}

    ${levelInstructions}

    ${exampleTypes}

    VAKSPECIFIEKE EISEN VOOR ${subject}:
    - Gebruik authentieke begrippen en situaties uit het vakgebied
    - Zorg dat de vragen aansluiten bij de kerndoelen en eindtermen voor ${level}
    - Maak vragen die typerend zijn voor ${subject} examens
    ${topic ? `- Zorg dat alle vragen gaan over ${topic}` : ''}
    ${readingComprehensionInstructions}

    OPDRACHT:
    Maak PRECIES ${count} vragen die volledig voldoen aan ${level} eindexamen niveau.

    VRAAGTYPE MIX:
    - Maak ongeveer 70% MEERKEUZEVRAGEN en 30% OPEN VRAGEN
    - Varieer de vraagtypen door het examen heen voor een realistisch eindexamen

    Voor MEERKEUZEVRAGEN:
    - 4 antwoordopties hebben (A, B, C, D)
    - 1 duidelijk correct antwoord hebben
    - 3 plausibele maar incorrecte afleidingsantwoorden (veelgemaakte fouten, dichtbij maar net niet goed)

    Voor OPEN VRAGEN:
    - Vraag die een uitgebreid antwoord vereist (2-4 zinnen)
    - Geef een duidelijk modelantwoord
    - Geschikt voor dieper begrip en analyse

    BELANGRIJK: Geef je antwoord als JSON array met dit EXACTE format:
    [
      {
        "type": "MULTIPLE_CHOICE",
        "text": "De vraag hier",
        "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
        "correctIndex": 0,
        "contextText": "Nederlandse brontekst hier (150-400 woorden). VERPLICHT voor tekstbegrip vragen."
      },
      {
        "type": "OPEN",
        "text": "De open vraag hier",
        "modelAnswer": "Het modelantwoord hier (2-4 zinnen)",
        "contextText": "Nederlandse brontekst hier indien van toepassing"
      }
    ]

    Geef ALLEEN de JSON array terug, geen extra tekst ervoor of erna.
  `;

  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const responseText = response.text || '';

    if (!responseText.trim()) {
      throw new Error("AI gaf een lege response terug. Probeer het opnieuw.");
    }

    // Extract JSON from response (handle various markdown code block formats)
    let jsonText = responseText.trim();

    // Remove markdown code blocks with various formats
    // Handles: ```json, ``` json, ```JSON, ```, etc.
    const codeBlockRegex = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/;
    const match = jsonText.match(codeBlockRegex);
    if (match) {
      jsonText = match[1].trim();
    } else if (jsonText.startsWith('```')) {
      // Fallback: remove any backticks at start/end
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
        id: `ai-${Date.now()}-${index}`,
        type: q.type || 'MULTIPLE_CHOICE' as const,
        level: level as any,
        subject: subject,
        text: q.text.trim(),
        contextText: q.contextText ? q.contextText.trim() : undefined,
        examType: 'practice' as const,
        source: `AI-gegenereerd (${level} niveau)`,
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
    console.error("Fout bij genereren AI vragen:", error);

    // Re-throw with more specific error message
    if (error.message && !error.message.includes("Kon geen AI vragen")) {
      throw error;
    }

    throw new Error("Kon geen AI vragen genereren. Controleer je internetverbinding en probeer het opnieuw.");
  }
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
  // Analyze answers
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
    - Aantal vragen: ${totalQuestions}

    GOED BEANTWOORD (${correctQuestions.length}):
    ${correctQuestions.slice(0, 5).join('\n') || 'Geen'}

    FOUT BEANTWOORD (${incorrectQuestions.length}):
    ${incorrectQuestions.slice(0, 5).join('\n') || 'Geen'}

    OPDRACHT:
    Maak een constructieve en bemoedigende samenvatting van het examen.
    Geef je antwoord als JSON met dit EXACTE format:

    {
      "overall": "1-2 zinnen algemene feedback over de prestatie",
      "strengths": ["punt 1", "punt 2"],
      "improvements": ["verbeterpunt 1", "verbeterpunt 2", "verbeterpunt 3"],
      "studyTips": ["concrete tip 1", "concrete tip 2", "concrete tip 3"]
    }

    TONE:
    - Positief en bemoedigend, ook bij lage scores
    - Specifiek en actionable (geen vage adviezen)
    - Motiverend om verder te oefenen

    Geef ALLEEN de JSON terug, geen extra tekst.
  `;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  const responseText = response.text || '';

  if (!responseText.trim()) {
    throw new Error("AI gaf een lege response terug voor examen samenvatting.");
  }

  let jsonText = responseText.trim();

  // Remove markdown code blocks with various formats
  const codeBlockRegex = /^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/;
  const match = jsonText.match(codeBlockRegex);
  if (match) {
    jsonText = match[1].trim();
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  // Try to find JSON object if there's extra text
  if (!jsonText.startsWith('{')) {
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonText = objectMatch[0];
    }
  }

  let summary;
  try {
    summary = JSON.parse(jsonText);
  } catch (parseError) {
    throw new Error("AI response voor examen samenvatting kon niet worden verwerkt als JSON.");
  }

  return {
    overall: summary.overall || "Goed geprobeerd!",
    strengths: Array.isArray(summary.strengths) ? summary.strengths : [],
    improvements: Array.isArray(summary.improvements) ? summary.improvements : [],
    studyTips: Array.isArray(summary.studyTips) ? summary.studyTips : []
  };
};

// Generate Look-alike Exam Questions (mimic real Dutch final exams)
export const generateLookalikeExamQuestions = async (
  subject: string,
  level: StudentLevel,
  count: number = 10,
  topic?: string,
  examStyle?: 'tijdvak1' | 'tijdvak2' | 'mixed'
): Promise<Question[]> => {
  // Determine exam style description
  const examStyleDesc = examStyle === 'tijdvak1'
    ? 'eerste tijdvak (mei/juni)'
    : examStyle === 'tijdvak2'
      ? 'tweede tijdvak (juni/juli, vaak iets moeilijker)'
      : 'mix van beide tijdvakken';

  // Level-specific exam characteristics
  let levelExamStyle = "";
  let cognitiveRequirements = "";

  switch (level) {
    case 'VMBO-TL':
      levelExamStyle = `
      VMBO-TL CENTRAAL EXAMEN KENMERKEN:
      - Examenduur indicatie: ~90-120 minuten voor volledige toets
      - Taalgebruik: Helder, direct en toegankelijk Nederlands
      - Vraagstelling: Praktisch gericht met herkenbare contexten
      - Tekstlengte bronnen: 200-400 woorden per brontekst
      - Antwoordopties: 4 opties bij meerkeuze, duidelijk onderscheidbaar
      - Puntenweging: Meeste vragen 1-2 punten
      `;
      cognitiveRequirements = `
      Cognitieve niveaus (Bloom):
      - 50% Onthouden en Begrijpen (feiten, basisbegrippen)
      - 35% Toepassen (regels en procedures in bekende situaties)
      - 15% Analyseren (eenvoudige verbanden leggen)
      `;
      break;

    case 'HAVO':
      levelExamStyle = `
      HAVO CENTRAAL EXAMEN KENMERKEN:
      - Examenduur indicatie: ~150-180 minuten voor volledige toets
      - Taalgebruik: Correct Nederlands met vakspecifieke terminologie
      - Vraagstelling: Mix van kennis, toepassing en inzicht
      - Tekstlengte bronnen: 300-600 woorden per brontekst
      - Antwoordopties: 4 opties met plausibele afleiders
      - Puntenweging: Variërend 1-4 punten per vraag
      `;
      cognitiveRequirements = `
      Cognitieve niveaus (Bloom):
      - 30% Onthouden en Begrijpen
      - 40% Toepassen (in nieuwe contexten)
      - 25% Analyseren (verbanden en structuren)
      - 5% Evalueren (beoordelen van informatie)
      `;
      break;

    case 'VWO':
      levelExamStyle = `
      VWO CENTRAAL EXAMEN KENMERKEN:
      - Examenduur indicatie: ~180-210 minuten voor volledige toets
      - Taalgebruik: Academisch, genuanceerd met wetenschappelijke terminologie
      - Vraagstelling: Complex, vereist abstractievermogen en kritisch denken
      - Tekstlengte bronnen: 400-800 woorden per brontekst
      - Antwoordopties: 4 opties met subtiele nuanceverschillen
      - Puntenweging: Variërend 1-6 punten per vraag
      `;
      cognitiveRequirements = `
      Cognitieve niveaus (Bloom):
      - 20% Onthouden en Begrijpen
      - 30% Toepassen
      - 30% Analyseren (complexe structuren en verbanden)
      - 15% Evalueren (kritisch beoordelen)
      - 5% Creëren (synthese van informatie)
      `;
      break;

    default:
      levelExamStyle = "Pas de vraagstelling aan aan het eindexamenniveau.";
      cognitiveRequirements = "";
  }

  // Subject-specific exam requirements with Dutch reading texts
  const isLanguageSubject = ['Nederlands', 'Engels', 'Duits', 'Frans', 'Spaans'].includes(subject);
  const isDutch = subject === 'Nederlands';

  // Enhanced reading text instructions for language subjects (especially Dutch)
  let readingTextInstructions = '';

  if (isDutch) {
    readingTextInstructions = `
    BELANGRIJK - NEDERLANDS CENTRAAL EXAMEN LEESTEKSTEN:
    Je genereert vragen voor het centraal examen Nederlands. Dit examen draait VOLLEDIG om tekstbegrip.

    VERPLICHTE STRUCTUUR:
    - ELKE vraag MOET een contextText bevatten met een volledige Nederlandse brontekst
    - Bronteksten moeten authentiek en examenwaardig zijn

    TEKST VEREISTEN (per brontekst):
    - Lengte: MINIMAAL 250 woorden, MAXIMAAL 500 woorden
    - Genre variatie vereist:
      * Informatieve teksten (nieuwsartikelen, wetenschapsjournalistiek)
      * Betoogend teksten (columns, opiniestukken, essays)
      * Beschouwende teksten (recensies, analyses)
      * Verhalende non-fictie (reportages, autobiografische fragmenten)

    TEKSTKENMERKEN:
    - Actuele, maatschappelijk relevante onderwerpen
    - Duidelijke argumentatiestructuur bij betogen
    - Rijke woordenschat passend bij ${level} niveau
    - Complexe zinsstructuren (bijzinnen, tangconstructies)
    - Verwijswoorden en signaalwoorden
    - Impliciete informatie die geïnfereerd moet worden

    VRAAGTYPEN VOOR TEKSTBEGRIP (varieer door hele toets):
    1. Hoofdgedachte/kern van de tekst (15%)
    2. Tekstdoel en doelgroep (10%)
    3. Argumentatieanalyse: standpunt, argument, tegenargument (20%)
    4. Woordbetekenis in context (15%)
    5. Verwijswoorden: waar slaat 'dit', 'deze', 'dat' op? (15%)
    6. Alinea-functie en tekststructuur (10%)
    7. Toon en schrijfstijl (10%)
    8. Samenvatten en parafraseren (5%)

    VOORBEELDTEKST (gebruik als inspiratie voor niveau en stijl):
    "De discussie over kunstmatige intelligentie in het onderwijs laait weer op. Voorstanders wijzen op de mogelijkheden: gepersonaliseerd leren, directe feedback en toegang tot onbeperkte kennis. Tegenstanders vrezen dat leerlingen hun kritisch denkvermogen verliezen wanneer antwoorden letterlijk voor het oprapen liggen.

    Onderwijskundige Dr. Maria Jansen nuanceert: 'Het gaat niet om óf we AI inzetten, maar hóé.' Volgens haar moeten docenten leerlingen juist leren om AI kritisch te bevragen. 'Een chatbot kan fouten maken. Leerlingen moeten leren die te herkennen.'

    Deze visie sluit aan bij het rapport 'Onderwijs in 2030' van de Onderwijsraad. Hierin wordt gepleit voor een curriculum waarin digitale geletterdheid centraal staat. Niet als apart vak, maar geïntegreerd in alle vakken. De vraag is echter of scholen hier klaar voor zijn. Uit onderzoek blijkt dat slechts 34% van de docenten zich voldoende bekwaam acht om AI-tools in te zetten."
    `;
  } else if (isLanguageSubject) {
    readingTextInstructions = `
    TEKSTBEGRIP VOOR ${subject.toUpperCase()}:
    - Voeg bij MINIMAAL 70% van de vragen een Nederlandse brontekst toe
    - De brontekst moet in het Nederlands zijn (het examen toetst begripsvaardigheid)
    - Teksten: 200-450 woorden, relevant voor ${level} leerlingen
    - Varieer in tekstsoorten: nieuwsartikelen, essays, verhalen, betogen
    - Vragen kunnen gaan over: hoofdgedachte, tekstdoel, woordbetekenis, verwijswoorden
    `;
  } else {
    // Non-language subjects may also have context texts
    readingTextInstructions = `
    BRONMATERIAAL VOOR ${subject.toUpperCase()}:
    - Voeg bij 40-60% van de vragen een korte context/casus toe
    - Dit kunnen zijn: grafieken beschrijvingen, experimenten, nieuwsberichten over ${subject}
    - Lengte: 100-300 woorden waar relevant
    - Maak de context realistisch en examenwaardig
    `;
  }

  const prompt = `
    Je bent een ervaren CITO-examinator die authentieke ${level} centraal eindexamenvragen maakt voor ${subject}.
    Je taak is om vragen te genereren die NIET te onderscheiden zijn van echte examenvragen uit ${examStyleDesc}.
    ${topic ? `\nSPECIFIEK ONDERWERP: Focus alle vragen op: "${topic}"` : ''}

    ${levelExamStyle}

    ${cognitiveRequirements}

    ${readingTextInstructions}

    AUTHENTIEKE EXAMENKENMERKEN:
    1. Begin meerkeuze-vragen NOOIT met "Welke van de volgende..." - gebruik natuurlijke vraagformuleringen
    2. Vraagnummering: Gebruik geen vraagnummers in de vraagtekst zelf
    3. Verwijs naar de brontekst waar relevant: "In de tekst staat...", "De auteur beweert...", "Uit alinea 3 blijkt..."
    4. Bij meerkeuze: formuleer het juiste antwoord NIET als het langste of meest gedetailleerde
    5. Afleiders moeten gebaseerd zijn op veelgemaakte fouten of misconcepties

    EXAMENVRAAG FORMULERINGEN (voorbeelden per type):
    - Hoofdgedachte: "Welke uitspraak geeft de kern van de tekst het beste weer?"
    - Tekstdoel: "Met welk doel heeft de schrijver deze tekst geschreven?"
    - Argumentatie: "Welke bewering uit de tekst is een argument voor het standpunt van de auteur?"
    - Woordbetekenis: "Wat wordt bedoeld met '...' in regel X?"
    - Verwijswoord: "Waarop slaat 'dit' in de zin '...'?"
    - Structuur: "Wat is de functie van alinea 3 in de tekst?"

    OPEN VRAGEN FORMULERING:
    - Vraag om onderbouwing: "Leg uit waarom... Gebruik informatie uit de tekst."
    - Vraag om analyse: "De auteur gebruikt een bepaald stijlmiddel. Noem dit stijlmiddel en leg uit wat het effect ervan is."
    - Maximaal aantal woorden aangeven: "Vat de tekst samen in maximaal 50 woorden."

    OPDRACHT:
    Genereer PRECIES ${count} examenvragen die authentiek aanvoelen als het centraal examen ${subject} ${level}.

    MIX VAN VRAAGTYPEN:
    - Ongeveer 70% meerkeuze (MULTIPLE_CHOICE)
    - Ongeveer 30% open vragen (OPEN)

    MEERKEUZE VEREISTEN:
    - Precies 4 antwoordopties (A, B, C, D)
    - Één duidelijk correct antwoord
    - Drie plausibele maar incorrecte afleiders
    - Opties van vergelijkbare lengte

    OPEN VRAAG VEREISTEN:
    - Duidelijke vraagstelling
    - Modelantwoord met scoringselementen
    - Passend bij ${level} verwachtingsniveau

    BELANGRIJK - JSON FORMAT:
    Geef je antwoord als JSON array met dit EXACTE format:
    [
      {
        "type": "MULTIPLE_CHOICE",
        "text": "De examenvraag hier",
        "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
        "correctIndex": 0,
        "contextText": "De volledige Nederlandse brontekst hier (250-500 woorden voor Nederlands, korter voor andere vakken)"
      },
      {
        "type": "OPEN",
        "text": "De open examenvraag hier",
        "modelAnswer": "Volledig modelantwoord met verwachte elementen",
        "contextText": "Brontekst indien van toepassing"
      }
    ]

    Geef ALLEEN de JSON array terug, geen extra tekst.
  `;

  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const responseText = response.text || '';

    if (!responseText.trim()) {
      throw new Error("AI gaf een lege response terug. Probeer het opnieuw.");
    }

    // Extract JSON from response
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

    let questionsData: any[];
    try {
      questionsData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error. Raw response:", responseText.substring(0, 500));
      throw new Error("AI response kon niet worden verwerkt als geldig JSON.");
    }

    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      throw new Error("AI genereerde geen examenvragen. Probeer het opnieuw.");
    }

    // Convert to Question format
    const questions: Question[] = [];
    const now = Date.now();

    for (let index = 0; index < questionsData.length; index++) {
      const q = questionsData[index];

      if (!q.text || typeof q.text !== 'string' || q.text.trim().length === 0) {
        console.warn(`Examenvraag ${index + 1} heeft geen tekst, wordt overgeslagen`);
        continue;
      }

      const baseQuestion = {
        id: `lookalike-${now}-${index}`,
        type: q.type || 'MULTIPLE_CHOICE' as const,
        level: level,
        subject: subject,
        text: q.text.trim(),
        contextText: q.contextText ? q.contextText.trim() : undefined,
        examType: 'practice' as const,
        source: `Look-alike Examen (${level} - ${examStyleDesc})`,
      };

      if (q.type === 'OPEN') {
        questions.push({
          ...baseQuestion,
          type: 'OPEN' as const,
          modelAnswer: q.modelAnswer || 'Geen modelantwoord beschikbaar.',
        });
      } else {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          console.warn(`Examenvraag ${index + 1} heeft ongeldige opties, wordt overgeslagen`);
          continue;
        }

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
      throw new Error("Geen geldige examenvragen konden worden gegenereerd.");
    }

    return questions;
  } catch (error: any) {
    console.error("Fout bij genereren look-alike examenvragen:", error);

    if (error.message && !error.message.includes("Kon geen")) {
      throw error;
    }

    throw new Error("Kon geen look-alike examenvragen genereren. Controleer je internetverbinding en probeer het opnieuw.");
  }
};

// Generate AI flashcards for a subject
export const generateFlashcards = async (
  subject: string,
  level: StudentLevel,
  count: number = 10,
  topic?: string
): Promise<Flashcard[]> => {
  // Define level-specific complexity
  let levelInstructions = "";

  switch (level) {
    case 'VMBO-TL':
      levelInstructions = `
      VMBO-TL NIVEAU:
      - Taal: Eenvoudig en direct, gebruik herkenbare voorbeelden
      - Vragen: Focus op feiten, basisbegrippen en definities
      - Antwoorden: Kort en bondig, max 1-2 zinnen
      - Complexiteit: Reproductie en basisbegrip
      `;
      break;
    case 'HAVO':
      levelInstructions = `
      HAVO NIVEAU:
      - Taal: Helder met correcte vakterminologie
      - Vragen: Mix van feiten, begrippen en toepassingen
      - Antwoorden: Volledig maar beknopt, 1-3 zinnen
      - Complexiteit: Begrip en toepassing van concepten
      `;
      break;
    case 'VWO':
      levelInstructions = `
      VWO NIVEAU:
      - Taal: Academisch met wetenschappelijke terminologie
      - Vragen: Complexe concepten, verbanden en analyses
      - Antwoorden: Volledig met nuance waar nodig, 2-4 zinnen
      - Complexiteit: Diepgaand begrip, analyse en synthese
      `;
      break;
    default:
      levelInstructions = "Pas het niveau aan aan de eindexamenstof.";
  }

  const prompt = `
    Je bent een ervaren ${subject} docent die flashcards maakt voor ${level} eindexamenstof.
    ${topic ? `SPECIFIEK ONDERWERP: Focus ALLE kaarten op het onderwerp: "${topic}".` : ''}

    ${levelInstructions}

    OPDRACHT:
    Maak PRECIES ${count} flashcards die helpen bij het studeren voor het ${level} eindexamen ${subject}.

    FLASHCARD RICHTLIJNEN:
    - Elke kaart heeft een VOORKANT (vraag/begrip) en een ACHTERKANT (antwoord/uitleg)
    - Maak een goede mix van:
      * Definitie-kaarten ("Wat is...?")
      * Feitenkaarten ("Wanneer/Waar/Wie...?")
      * Begripskaarten ("Leg uit waarom...")
      * Toepassingskaarten ("Wat gebeurt er als...?")
    - Zorg dat de voorkant een duidelijke vraag of begrip is
    - Zorg dat de achterkant een volledig maar beknopt antwoord geeft
    ${topic ? `- Alle kaarten moeten gaan over: ${topic}` : ''}

    BELANGRIJK: Geef je antwoord als JSON array met dit EXACTE format:
    [
      {
        "front": "Wat is fotosynthese?",
        "back": "Het proces waarbij planten zonlicht gebruiken om CO2 en water om te zetten in glucose en zuurstof."
      },
      {
        "front": "Noem 3 factoren die fotosynthese beïnvloeden.",
        "back": "1. Lichtintensiteit\\n2. CO2-concentratie\\n3. Temperatuur"
      }
    ]

    Geef ALLEEN de JSON array terug, geen extra tekst ervoor of erna.
  `;

  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const responseText = response.text || '';

    if (!responseText.trim()) {
      throw new Error("AI gaf een lege response terug. Probeer het opnieuw.");
    }

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

    // Parse JSON
    let cardsData: any[];
    try {
      cardsData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error. Raw response:", responseText.substring(0, 500));
      throw new Error("AI response kon niet worden verwerkt. Het antwoord was geen geldig JSON formaat.");
    }

    if (!Array.isArray(cardsData) || cardsData.length === 0) {
      throw new Error("AI genereerde geen flashcards. Probeer het opnieuw.");
    }

    // Convert to Flashcard format
    const now = new Date().toISOString();
    const flashcards: Flashcard[] = [];

    for (let index = 0; index < cardsData.length; index++) {
      const card = cardsData[index];

      if (!card.front || !card.back) {
        console.warn(`Flashcard ${index + 1} mist front of back, wordt overgeslagen`);
        continue;
      }

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
      throw new Error("Geen geldige flashcards konden worden gegenereerd. Probeer het opnieuw.");
    }

    return flashcards;
  } catch (error: any) {
    console.error("Fout bij genereren flashcards:", error);

    if (error.message && !error.message.includes("Kon geen flashcards")) {
      throw error;
    }

    throw new Error("Kon geen flashcards genereren. Controleer je internetverbinding en probeer het opnieuw.");
  }
};