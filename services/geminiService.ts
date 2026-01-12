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
  count: number = 10
): Promise<Question[]> => {
  const prompt = `
    Je bent een ervaren docent die examenvragen maakt voor ${subject} op ${level} niveau.

    Maak PRECIES ${count} meerkeuzevragen (MULTIPLE_CHOICE) voor dit onderwerp.
    De vragen moeten:
    - Geschikt zijn voor ${level} niveau eindexamen
    - Realistisch en relevant zijn voor de examenstof
    - 4 antwoordopties hebben (A, B, C, D)
    - Een duidelijk juist antwoord hebben

    BELANGRIJK: Geef je antwoord als JSON array met dit exacte format:
    [
      {
        "text": "De vraag hier",
        "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
        "correctIndex": 0
      }
    ]

    Geef ALLEEN de JSON array terug, geen extra tekst ervoor of erna.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
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
    const questions: Question[] = questionsData.map((q: any, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      type: 'MULTIPLE_CHOICE' as const,
      level: level as any,
      subject: subject,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      examType: 'ai_practice' as const,
    }));

    return questions;
  } catch (error) {
    console.error("Fout bij genereren AI vragen:", error);
    throw new Error("Kon geen AI vragen genereren. Probeer het later opnieuw.");
  }
};