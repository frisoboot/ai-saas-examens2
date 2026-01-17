import { BulkImportQuestion, StudentLevel } from '../types';

/**
 * Exam PDF Service
 *
 * Frontend service for parsing exam PDFs using the AI backend.
 */

export interface ParseExamPDFRequest {
  questionsFile: File;
  answersFile?: File;
  answersText?: string;
  subject: string;
  level: StudentLevel;
  examYear: number;
  source?: string;
}

export interface ParsedQuestion {
  questionNumber: number;
  subject: string;
  level: StudentLevel;
  type: 'MULTIPLE_CHOICE' | 'OPEN';
  text: string;
  examYear: number;
  contextText?: string;
  source?: string;
  options?: string[];
  correctAnswer?: string;
  modelAnswer?: string;
  maxScore?: number;
  hasImage?: boolean;
  imageDescription?: string;
  imageUrl?: string; // Added manually by user
}

export interface ParseExamPDFResult {
  success: boolean;
  questions: ParsedQuestion[];
  totalParsed: number;
  questionsWithAnswers: number;
  error?: string;
}

/**
 * Convert a File to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Kon bestand niet lezen'));
    reader.readAsDataURL(file);
  });
}

/**
 * Parse exam PDF files using AI
 */
export async function parseExamPDF(request: ParseExamPDFRequest): Promise<ParseExamPDFResult> {
  try {
    // Convert questions PDF to base64
    const questionsBase64 = await fileToBase64(request.questionsFile);

    // Convert answers PDF to base64 if provided
    let answersBase64: string | undefined;
    if (request.answersFile) {
      answersBase64 = await fileToBase64(request.answersFile);
    }

    // Call the API
    const response = await fetch('/api/parse-exam-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        questionsBase64,
        answersBase64,
        answersText: request.answersText,
        subject: request.subject,
        level: request.level,
        examYear: request.examYear,
        source: request.source,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    const data = await response.json();

    return {
      success: data.success,
      questions: data.questions || [],
      totalParsed: data.totalParsed || 0,
      questionsWithAnswers: data.questionsWithAnswers || 0,
    };

  } catch (error: any) {
    console.error('[parseExamPDF] Error:', error);
    return {
      success: false,
      questions: [],
      totalParsed: 0,
      questionsWithAnswers: 0,
      error: error.message || 'Onbekende fout bij parsen',
    };
  }
}

/**
 * Convert ParsedQuestion to BulkImportQuestion format for database import
 */
export function convertToBulkImportFormat(questions: ParsedQuestion[]): BulkImportQuestion[] {
  return questions.map((q) => ({
    subject: q.subject,
    level: q.level,
    type: q.type,
    text: q.text,
    examYear: q.examYear,
    contextText: q.contextText,
    source: q.source,
    options: q.options,
    correctAnswer: q.correctAnswer,
    modelAnswer: q.modelAnswer,
    imageUrl: q.imageUrl,
  }));
}

/**
 * Validate a parsed question before import
 */
export function validateParsedQuestion(q: ParsedQuestion): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!q.text || q.text.trim() === '') {
    errors.push('Vraagtekst ontbreekt');
  }

  if (q.type === 'MULTIPLE_CHOICE') {
    if (!q.options || q.options.length < 2) {
      errors.push('Meerkeuze vraag heeft minstens 2 opties nodig');
    }
    if (!q.correctAnswer) {
      errors.push('Juist antwoord ontbreekt voor meerkeuze vraag');
    } else if (q.options && !q.options.some(opt =>
      opt.toLowerCase().trim() === q.correctAnswer!.toLowerCase().trim()
    )) {
      errors.push('Juist antwoord komt niet voor in de opties');
    }
  }

  if (q.type === 'OPEN' && !q.modelAnswer) {
    errors.push('Modelantwoord ontbreekt voor open vraag');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get statistics about parsed questions
 */
export function getParseStatistics(questions: ParsedQuestion[]): {
  total: number;
  multipleChoice: number;
  open: number;
  withAnswers: number;
  withContext: number;
  withImages: number;
  needsReview: number;
} {
  const multipleChoice = questions.filter(q => q.type === 'MULTIPLE_CHOICE');
  const open = questions.filter(q => q.type === 'OPEN');
  const withAnswers = questions.filter(q =>
    q.type === 'MULTIPLE_CHOICE' ? !!q.correctAnswer : !!q.modelAnswer
  );
  const withContext = questions.filter(q => !!q.contextText);
  const withImages = questions.filter(q => q.hasImage);
  const needsReview = questions.filter(q => {
    const validation = validateParsedQuestion(q);
    return !validation.valid;
  });

  return {
    total: questions.length,
    multipleChoice: multipleChoice.length,
    open: open.length,
    withAnswers: withAnswers.length,
    withContext: withContext.length,
    withImages: withImages.length,
    needsReview: needsReview.length,
  };
}
