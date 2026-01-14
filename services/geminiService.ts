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

  return ai.chats.create({
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
  // Detailed level-specific exam requirements
  const levelRequirements: Record<string, string> = {
    'VMBO-TL': `VMBO-TL EINDEXAMEN EISEN:
- Begrijpelijk Nederlands, korte zinnen, dagelijks taalgebruik
- Focus op reproductie en basisbegrip (kennen & kunnen)
- Praktische vragen met herkenbare situaties
- Duidelijke antwoordopties zonder verwarring
- Feiten, definities, eenvoudige concepten
- Stappenplannen en procedures`,

    'HAVO': `HAVO EINDEXAMEN EISEN:
- Correcte vakterminologie en wetenschappelijke begrippen
- Focus op begrip en toepassing (begrijpen & toepassen)
- Vragen vereisen redeneren en verbanden leggen
- Analyse van praktijksituaties en casussen
- Oorzaak-gevolg relaties en processen
- Vergelijken, uitleggen, verklaren`,

    'VWO': `VWO EINDEXAMEN EISEN:
- Academisch taalgebruik en complexe terminologie
- Focus op analyse en synthese (analyseren & evalueren)
- Hogere-orde denkvragen en abstractievermogen
- Kritisch beoordelen en argumenteren
- Complexe verbanden en interdisciplinaire vragen
- Theorie toepassen in nieuwe contexten`
  };

  // Subject-specific curriculum guidance (based on Dutch exam curriculum)
  const subjectGuidance: Record<string, string> = {
    'Wiskunde A': 'statistiek, kansrekening, groei/verval, grafieken, functies, afgeleide',
    'Wiskunde B': 'calculus, goniometrie, vectoren, integralen, exponentiële functies',
    'Wiskunde C': 'toegepaste wiskunde, statistiek, modelleren, kansrekening, grafieken',
    'Nederlands': 'tekstanalyse, argumentatie, stijlfiguren, taalbeschouwing, literatuur, schrijfvaardigheid',
    'Engels': 'reading comprehension, grammar, vocabulary, writing skills, text types, idioms',
    'Duits': 'Leseverstehen, Grammatik, Wortschatz, Schreiben, Landeskunde',
    'Frans': 'compréhension écrite, grammaire, vocabulaire, expression écrite, culture',
    'Biologie': 'cellen, DNA/erfelijkheid, evolutie, ecosystemen, menselijk lichaam, fotosynthese, homeostase',
    'Scheikunde': 'atoommodel, stoichiometrie, zuren/basen, redox, organische chemie, reactiesnelheden',
    'Natuurkunde': 'mechanica, energie, elektriciteit, golven, straling, moderne natuurkunde',
    'Geschiedenis': 'tijdvakken, ontwikkelingen, oorzaken, historische context, bronanalyse, periodesoverzicht',
    'Aardrijkskunde': 'gebieden, processen, mens-omgeving relaties, landschappen, globalisering, duurzaamheid',
    'Economie': 'vraag/aanbod, marktwerking, overheid, internationale handel, conjunctuur, bedrijfsvoering',
    'Bedrijfseconomie': 'bedrijfsvoering, financiële administratie, marketing, HRM, ondernemerschap',
    'Maatschappijwetenschappen': 'sociologie, psychologie, pedagogiek, maatschappelijke vraagstukken, cultuur',
    'Kunst Algemeen': 'kunstgeschiedenis, kunstbeschouwing, stromingen, kunstwerken analyseren, cultuurhistorie'
  };

  const examRequirements = levelRequirements[level] || levelRequirements['HAVO'];
  const curriculumHints = subjectGuidance[subject] || 'relevante examenstof';

  const prompt = `Je bent examinator voor OFFICIËLE Nederlandse eindexamens. Maak ${count} authentieke ${level} examenvragen voor ${subject}${topic ? ` specifiek over "${topic}"` : ''}.

${examRequirements}

VAKINHOUD ${subject} voor ${level}:
Behandel onderwerpen uit: ${curriculumHints}
${topic ? `FOCUS: Alle vragen moeten gaan over "${topic}" binnen dit vak` : 'Varieer over verschillende examenstofonderdelen'}

BELANGRIJK - NIVEAU-SPECIFIEKE STOFBEHANDELING voor ${level}:

${level === 'VMBO-TL' ? `
VMBO-TL: Selecteer ALLEEN de MEEST BASALE en PRAKTISCHE onderwerpen:
- Wiskunde: Simpele grafieken lezen, basale statistiek (gemiddelde), eenvoudige percentages
- Biologie: Zichtbare celstructuren, basisvoeding, eenvoudige ecosystemen
- Scheikunde: Herkenbare stoffen, simpele scheidingsmethoden, pH met voorbeelden
- Natuurkunde: Alledaagse krachten, eenvoudige stroomkringen, herkenbare energie
- Talen: Korte teksten, basale grammatica, praktische communicatie
- Geschiedenis: Hoofdlijnen tijdvakken, bekende gebeurtenissen, herkenbare bronnen
Gebruik GEEN complexe formules, abstracte theorie of multi-stap redeneringen!` : ''}

${level === 'HAVO' ? `
HAVO: Behandel STANDAARD examenstof met TOEPASSINGEN:
- Wiskunde: Functies analyseren, kansberekeningen, afgeleide toepassen
- Biologie: DNA-structuur, basale genetica, eenvoudige ecologie, lichaamssystemen
- Scheikunde: Reactievergelijkingen, mol-berekeningen, zuur-base, eenvoudige organische chemie
- Natuurkunde: Bewegingsvergelijkingen, energieomzettingen, Wet van Ohm, simpele golven
- Talen: Langere teksten analyseren, gevorderde grammatica, argumenteren
- Geschiedenis: Oorzaken & gevolgen, bronvergelijking, tijdvak-verbanden
Gebruik standaard formules en 2-3 stappen redenering.` : ''}

${level === 'VWO' ? `
VWO: Behandel ALLE complexe stof met DIEPGANG en ABSTRACTIE:
- Wiskunde: Integralen, vectorruimten, complexe modellen, bewijsvoering
- Biologie: Genregulatie, evolutionaire mechanismen, biochemische cycli, epigenetica
- Scheikunde: Evenwichtsreacties, thermodynamica, complexe syntheses, reactiemechanismen
- Natuurkunde: Relativiteit, quantummechanica, complexe trillingen, veldentheorie
- Talen: Literaire analyse, complexe argumentatie, nuances, wetenschappelijke teksten
- Geschiedenis: Historiografie, interpretaties, lange termijn processen, interdisciplinair
Gebruik complexe formules, multi-stap redeneringen en abstracte concepten!` : ''}

Kies de JUISTE DIEPGANG voor ${level} binnen ${subject}!

VRAAGKWALITEIT:
- Gebruik realistische examensituaties en authentieke data
- Afleidingsantwoorden: gebaseerd op veelgemaakte denkfouten
- Open vragen: Vraag om uitleg/onderbouwing, niet alleen een feit
- Moeilijkheid: passend bij ${level} eindexamen niveau

VERDELING: 70% meerkeuze (4 opties, 1 correct), 30% open (met modelantwoord 2-4 zinnen)

OUTPUT (alleen JSON, geen extra tekst):
[
  {"type":"MULTIPLE_CHOICE","text":"vraag","options":["A","B","C","D"],"correctIndex":0},
  {"type":"OPEN","text":"vraag","modelAnswer":"antwoord met uitleg"}
]`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp', // Faster model
      contents: prompt,
      config: {
        temperature: 0.7, // Slightly lower for faster, more focused responses
        maxOutputTokens: 4096, // Limit output length
      }
    });

    const responseText = response.text || '';

    // Extract JSON from response (sometimes AI adds markdown code blocks)
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const questionsData = JSON.parse(jsonText);

    // Convert to Question format
    const questions: Question[] = questionsData.map((q: any, index: number) => {
      const baseQuestion = {
        id: `ai-${Date.now()}-${index}`,
        type: q.type || 'MULTIPLE_CHOICE' as const,
        level: level as any,
        subject: subject,
        text: q.text,
        contextText: q.contextText || undefined,
        examType: 'practice' as const,
        source: `AI-gegenereerd (${level} niveau)`,
      };

      // Add type-specific properties
      if (q.type === 'OPEN') {
        return {
          ...baseQuestion,
          type: 'OPEN' as const,
          modelAnswer: q.modelAnswer || '',
        };
      } else {
        return {
          ...baseQuestion,
          type: 'MULTIPLE_CHOICE' as const,
          options: q.options,
          correctIndex: q.correctIndex,
        };
      }
    });

    return questions;
  } catch (error) {
    console.error("Fout bij genereren AI vragen:", error);
    throw new Error("Kon geen AI vragen genereren. Probeer het later opnieuw.");
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
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const responseText = response.text || '';
    let jsonText = responseText.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const summary = JSON.parse(jsonText);

    return {
      overall: summary.overall || "Goed geprobeerd!",
      strengths: summary.strengths || [],
      improvements: summary.improvements || [],
      studyTips: summary.studyTips || []
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