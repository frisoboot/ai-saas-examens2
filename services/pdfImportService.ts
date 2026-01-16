import { GoogleGenAI } from "@google/genai";
import { BulkImportQuestion, StudentLevel, QuestionType } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Lazy initialization for Gemini
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

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

export interface PDFParseResult {
  success: boolean;
  questions: BulkImportQuestion[];
  rawText: string;
  pageCount: number;
  errors: string[];
}

export interface PDFExamMetadata {
  subject?: string;
  level?: StudentLevel;
  examYear?: number;
  source?: string;
}

/**
 * Extract text content from a PDF file
 */
export const extractTextFromPDF = async (file: File): Promise<{ text: string; pageCount: number }> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  const pageCount = pdf.numPages;

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += `\n--- Pagina ${i} ---\n${pageText}`;
  }

  return { text: fullText.trim(), pageCount };
};

/**
 * Use AI to parse exam questions from PDF text
 */
export const parseExamQuestionsWithAI = async (
  pdfText: string,
  metadata: PDFExamMetadata
): Promise<BulkImportQuestion[]> => {
  const { subject, level, examYear, source } = metadata;

  // Determine default values
  const subjectHint = subject || 'onbekend vak';
  const levelHint = level || 'HAVO';
  const yearHint = examYear || new Date().getFullYear();

  const prompt = `
Je bent een expert in het analyseren van Nederlandse eindexamens. Analyseer de volgende PDF-tekst en extraheer ALLE examenvragen met hun antwoorden.

METADATA (gebruik indien relevant):
- Vak: ${subjectHint}
- Niveau: ${levelHint}
- Examenjaar: ${yearHint}
- Bron: ${source || 'PDF Upload'}

PDF TEKST:
"""
${pdfText.substring(0, 50000)}
"""

INSTRUCTIES:
1. Identificeer ALLE examenvragen in de tekst (kan tientallen zijn)
2. Bepaal voor elke vraag of het MULTIPLE_CHOICE of OPEN is
3. Bij meerkeuze: extraheer alle opties (meestal A, B, C, D) en bepaal het juiste antwoord
4. Bij open vragen: extraheer het modelantwoord indien beschikbaar
5. Als er bronteksten zijn (zoals artikelen, grafieken, tabellen), neem die op als contextText
6. Probeer het vak te detecteren als dit niet duidelijk is uit de metadata
7. Detecteer het niveau (VMBO-TL, HAVO, VWO) indien mogelijk

ANTWOORD FORMAT:
Geef je antwoord als JSON array met dit EXACTE format:
[
  {
    "subject": "Geschiedenis",
    "level": "HAVO",
    "type": "MULTIPLE_CHOICE",
    "text": "De vraag hier",
    "examYear": 2024,
    "source": "Centraal Examen 2024",
    "contextText": "Eventuele brontekst hier (artikelen, bronnen, etc.)",
    "options": ["Optie A", "Optie B", "Optie C", "Optie D"],
    "correctAnswer": "Optie B"
  },
  {
    "subject": "Geschiedenis",
    "level": "HAVO",
    "type": "OPEN",
    "text": "De open vraag hier",
    "examYear": 2024,
    "source": "Centraal Examen 2024",
    "contextText": "Eventuele brontekst hier",
    "modelAnswer": "Het modelantwoord met verwachte elementen"
  }
]

BELANGRIJK:
- Extraheer ALLE vragen uit de PDF, niet slechts een voorbeeld
- Als het correcte antwoord niet duidelijk is, laat correctAnswer leeg of geef je beste inschatting
- Als er geen modelantwoord is voor open vragen, probeer er een te formuleren
- Gebruik het juiste vak en niveau gebaseerd op de inhoud
- Neem relevante bronteksten mee in contextText

Geef ALLEEN de JSON array terug, geen extra tekst.
`;

  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  const responseText = response.text || '';

  if (!responseText.trim()) {
    throw new Error("AI gaf een lege response terug bij het parsen van de PDF.");
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

  let questionsData: any[];
  try {
    questionsData = JSON.parse(jsonText);
  } catch (parseError) {
    console.error("JSON parse error. Raw response:", responseText.substring(0, 1000));
    throw new Error("AI response kon niet worden verwerkt als JSON. Probeer het opnieuw.");
  }

  if (!Array.isArray(questionsData) || questionsData.length === 0) {
    throw new Error("Geen examenvragen gevonden in de PDF. Controleer of het bestand examenvragen bevat.");
  }

  // Convert to BulkImportQuestion format with validation
  const questions: BulkImportQuestion[] = [];

  for (const q of questionsData) {
    // Validate and normalize subject
    const detectedSubject = normalizeSubject(q.subject || subject || 'Onbekend');

    // Validate level
    const detectedLevel = normalizeLevel(q.level || level || 'HAVO');

    // Validate type
    const questionType: QuestionType = q.type === 'OPEN' ? 'OPEN' : 'MULTIPLE_CHOICE';

    // Skip questions without text
    if (!q.text || q.text.trim().length === 0) {
      continue;
    }

    const question: BulkImportQuestion = {
      subject: detectedSubject,
      level: detectedLevel,
      type: questionType,
      text: q.text.trim(),
      examYear: q.examYear || examYear,
      contextText: q.contextText || undefined,
      source: q.source || source || 'PDF Import',
    };

    if (questionType === 'MULTIPLE_CHOICE') {
      question.options = Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()) : [];
      question.correctAnswer = q.correctAnswer || undefined;
    } else {
      question.modelAnswer = q.modelAnswer || undefined;
    }

    questions.push(question);
  }

  return questions;
};

/**
 * Main function to parse a PDF exam file
 */
export const parsePDFExam = async (
  file: File,
  metadata: PDFExamMetadata = {}
): Promise<PDFParseResult> => {
  const errors: string[] = [];

  try {
    // Step 1: Extract text from PDF
    const { text, pageCount } = await extractTextFromPDF(file);

    if (!text || text.trim().length < 100) {
      return {
        success: false,
        questions: [],
        rawText: text,
        pageCount,
        errors: ['PDF bevat te weinig tekst. Mogelijk is het een gescand document of bevat het alleen afbeeldingen.']
      };
    }

    // Step 2: Parse questions with AI
    const questions = await parseExamQuestionsWithAI(text, metadata);

    return {
      success: questions.length > 0,
      questions,
      rawText: text,
      pageCount,
      errors: questions.length === 0 ? ['Geen vragen konden worden geëxtraheerd uit de PDF.'] : []
    };

  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    return {
      success: false,
      questions: [],
      rawText: '',
      pageCount: 0,
      errors: [error.message || 'Onbekende fout bij het parsen van de PDF.']
    };
  }
};

/**
 * Parse multiple PDF files at once
 */
export const parseMultiplePDFs = async (
  files: File[],
  metadata: PDFExamMetadata = {}
): Promise<PDFParseResult> => {
  const allQuestions: BulkImportQuestion[] = [];
  const errors: string[] = [];
  let totalPages = 0;
  let allRawText = '';

  for (const file of files) {
    try {
      const result = await parsePDFExam(file, metadata);
      allQuestions.push(...result.questions);
      totalPages += result.pageCount;
      allRawText += `\n\n=== ${file.name} ===\n${result.rawText}`;

      if (result.errors.length > 0) {
        errors.push(`${file.name}: ${result.errors.join(', ')}`);
      }
    } catch (error: any) {
      errors.push(`${file.name}: ${error.message || 'Fout bij verwerken'}`);
    }
  }

  return {
    success: allQuestions.length > 0,
    questions: allQuestions,
    rawText: allRawText.trim(),
    pageCount: totalPages,
    errors
  };
};

// Helper: Normalize subject names
const normalizeSubject = (subject: string): string => {
  const subjectMap: Record<string, string> = {
    'geschiedenis': 'Geschiedenis',
    'aardrijkskunde': 'Aardrijkskunde',
    'biologie': 'Biologie',
    'scheikunde': 'Scheikunde',
    'natuurkunde': 'Natuurkunde',
    'wiskunde': 'Wiskunde A',
    'wiskunde a': 'Wiskunde A',
    'wiskunde b': 'Wiskunde B',
    'wiskunde c': 'Wiskunde C',
    'nederlands': 'Nederlands',
    'engels': 'Engels',
    'duits': 'Duits',
    'frans': 'Frans',
    'economie': 'Economie',
    'bedrijfseconomie': 'Bedrijfseconomie',
    'maatschappijwetenschappen': 'Maatschappijwetenschappen',
    'maatschappijleer': 'Maatschappijwetenschappen',
    'kunst': 'Kunst Algemeen',
    'kunst algemeen': 'Kunst Algemeen',
  };

  const normalized = subject.toLowerCase().trim();
  return subjectMap[normalized] || subject;
};

// Helper: Normalize level
const normalizeLevel = (level: string): StudentLevel => {
  const levelLower = level.toLowerCase().trim();

  if (levelLower.includes('vwo')) return 'VWO';
  if (levelLower.includes('havo')) return 'HAVO';
  if (levelLower.includes('vmbo') || levelLower.includes('tl') || levelLower.includes('gl') || levelLower.includes('kb')) return 'VMBO-TL';

  return 'HAVO'; // Default
};

/**
 * Validate PDF file
 */
export const validatePDFFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'Bestand moet een PDF zijn (.pdf)' };
  }

  // Check file size (max 20MB for PDFs)
  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'PDF bestand is te groot. Maximum grootte is 20MB.' };
  }

  return { valid: true };
};

/**
 * Get suggested metadata from filename
 */
export const suggestMetadataFromFilename = (filename: string): PDFExamMetadata => {
  const metadata: PDFExamMetadata = {};
  const nameLower = filename.toLowerCase();

  // Try to detect year (20XX pattern)
  const yearMatch = nameLower.match(/20\d{2}/);
  if (yearMatch) {
    metadata.examYear = parseInt(yearMatch[0]);
  }

  // Try to detect level
  if (nameLower.includes('vwo')) {
    metadata.level = 'VWO';
  } else if (nameLower.includes('havo')) {
    metadata.level = 'HAVO';
  } else if (nameLower.includes('vmbo') || nameLower.includes('tl')) {
    metadata.level = 'VMBO-TL';
  }

  // Try to detect subject from filename
  const subjects = [
    'geschiedenis', 'aardrijkskunde', 'biologie', 'scheikunde', 'natuurkunde',
    'wiskunde', 'nederlands', 'engels', 'duits', 'frans', 'economie',
    'bedrijfseconomie', 'maatschappijwetenschappen', 'kunst'
  ];

  for (const subject of subjects) {
    if (nameLower.includes(subject)) {
      metadata.subject = normalizeSubject(subject);
      break;
    }
  }

  // Build source from filename
  metadata.source = filename.replace('.pdf', '').replace(/_/g, ' ');

  return metadata;
};
