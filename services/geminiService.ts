import { GoogleGenAI, Chat } from "@google/genai";
import { Question, StudentProfile } from "../types";

// Fix: Use Vite's import.meta.env instead of process.env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('Gemini API key not found. Set VITE_GEMINI_API_KEY in your .env file.');
}

const ai = new GoogleGenAI({ apiKey });

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
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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

  return ai.chats.create({
    model: 'gemini-2.0-flash',
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const responseText = response.text || '';
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

    const summary = JSON.parse(jsonText);

    return {
      overall: summary.overall || "Goed geprobeerd!",
      strengths: Array.isArray(summary.strengths) ? summary.strengths : [],
      improvements: Array.isArray(summary.improvements) ? summary.improvements : [],
      studyTips: Array.isArray(summary.studyTips) ? summary.studyTips : []
    };
  } catch (error) {
    console.error("Fout bij genereren examen samenvatting:", error);
    // Fallback summary
    return {
      overall: `Je hebt ${score} van de ${totalQuestions} vragen goed beantwoord (${percentage}%). Blijf oefenen!`,
      strengths: percentage >= 60 ? ["Je hebt de basis onder de knie"] : ["Je hebt je best gedaan"],
      improvements: percentage < 60 ? ["Bestudeer de theorie nog eens", "Maak meer oefenexamens"] : ["Let goed op details"],
      studyTips: ["Herhaal de stof regelmatig", "Maak aantekeningen", "Oefen met verschillende vraagtypen"]
    };
  }
};