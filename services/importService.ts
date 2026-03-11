import { Question, BulkImportQuestion, ImportResult, ImportError, StudentLevel, QuestionType } from '../types';
import { saveQuestion } from './storageService';
import { SUBJECTS, isValidSubject } from '../constants/subjects';

// Validate a single question
const validateQuestion = (q: BulkImportQuestion, row: number): ImportError[] => {
  const errors: ImportError[] = [];

  if (!q.subject || !isValidSubject(q.subject)) {
    errors.push({
      row,
      field: 'subject',
      message: `Ongeldig vak: ${q.subject}. Geldige vakken: ${SUBJECTS.join(', ')}`
    });
  }

  if (!q.level || !['VMBO-TL', 'HAVO', 'VWO'].includes(q.level)) {
    errors.push({
      row,
      field: 'level',
      message: `Ongeldig niveau: ${q.level}. Gebruik: VMBO-TL, HAVO, of VWO`
    });
  }

  if (!q.text || q.text.trim() === '') {
    errors.push({ row, field: 'text', message: 'Vraag tekst is verplicht' });
  }

  if (!q.type || !['MULTIPLE_CHOICE', 'OPEN'].includes(q.type)) {
    errors.push({
      row,
      field: 'type',
      message: `Ongeldig type: ${q.type}. Gebruik: MULTIPLE_CHOICE of OPEN`
    });
  }

  if (q.type === 'MULTIPLE_CHOICE') {
    if (!q.options || q.options.length < 2) {
      errors.push({ row, field: 'options', message: 'Minstens 2 opties vereist voor meerkeuze' });
    }
    if (!q.correctAnswer) {
      errors.push({ row, field: 'correctAnswer', message: 'Juist antwoord is verplicht voor meerkeuze' });
    } else if (q.options) {
      const answer = q.correctAnswer.trim();
      // Support single-letter answers (A/B/C/D) as index references
      if (/^[a-zA-Z]$/.test(answer)) {
        const letterIndex = answer.toLowerCase().charCodeAt(0) - 97; // 'a'=0, 'b'=1, etc.
        if (letterIndex < 0 || letterIndex >= q.options.length) {
          errors.push({
            row,
            field: 'correctAnswer',
            message: `Antwoordletter "${answer.toUpperCase()}" verwijst naar optie ${letterIndex + 1}, maar er zijn maar ${q.options.length} opties`
          });
        }
      } else if (!q.options.some(opt => opt.toLowerCase().trim() === answer.toLowerCase())) {
        errors.push({
          row,
          field: 'correctAnswer',
          message: `Juist antwoord "${q.correctAnswer}" komt niet voor in de opties`
        });
      }
    }
  }

  if (q.type === 'OPEN' && !q.modelAnswer) {
    errors.push({ row, field: 'modelAnswer', message: 'Model antwoord is verplicht voor open vragen' });
  }

  if (q.examYear && (q.examYear < 2000 || q.examYear > 2100)) {
    errors.push({
      row,
      field: 'examYear',
      message: `Ongeldig examenjaar: ${q.examYear}. Gebruik een jaar tussen 2000 en 2100`
    });
  }

  return errors;
};

// Convert BulkImportQuestion to Question
// Counter to prevent ID collisions during bulk imports
let importCounter = 0;

const convertToQuestion = (q: BulkImportQuestion, questionIndex: number): Question => {
  // Fix: Use counter to prevent ID collisions during rapid bulk imports
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const counter = importCounter++;

  // Generate structured ID if tijdvak is available (matches ExamBuilder format)
  // Use questionNumber from the data if available, otherwise fall back to import index
  let questionId: string;
  if (q.tijdvak && q.subject && q.level && q.examYear) {
    const questionNumber = q.questionNumber || (questionIndex + 1);
    questionId = `${q.subject}-${q.level}-${q.examYear}-T${q.tijdvak}-Q${questionNumber}`.replace(/\s+/g, '-');
  } else {
    questionId = `${timestamp}-${counter}-${random}`;
  }

  // Generate source with tijdvak if available and no explicit source set
  const source = q.source || (q.tijdvak && q.examYear ? `Examen ${q.examYear} Tijdvak ${q.tijdvak}` : undefined);

  const question: Question = {
    id: questionId,
    type: q.type,
    subject: q.subject,
    level: q.level,
    text: q.text,
    examYear: q.examYear,
    examType: q.examYear ? 'official_exam' : 'practice',
    tijdvak: q.tijdvak,
    contextText: q.contextText,
    imageUrl: q.imageUrl,
    source: source,
    score: q.score,
    section: q.section,
    sectionIntro: q.sectionIntro,
    // PDF tekstboekje
    examPdfUrl: q.examPdfUrl,
    pdfPage: q.pdfPage,
    // Bijlage PDF
    examBijlageUrl: q.examBijlageUrl,
    bijlagePdfPage: q.bijlagePdfPage,
    // Kaartboekje PDF
    examKaartUrl: q.examKaartUrl,
    kaartPdfPage: q.kaartPdfPage,
    // Worksheet
    worksheetUrl: q.worksheetUrl,
    worksheetLabel: q.worksheetLabel,
    requiresWorksheet: q.requiresWorksheet
  };

  if (q.type === 'MULTIPLE_CHOICE' && q.options && q.correctAnswer) {
    question.options = q.options;
    const answer = q.correctAnswer.trim();

    // Support single-letter answers (A/B/C/D) as index references
    if (/^[a-zA-Z]$/.test(answer)) {
      const letterIndex = answer.toLowerCase().charCodeAt(0) - 97; // 'a'=0, 'b'=1, etc.
      question.correctIndex = (letterIndex >= 0 && letterIndex < q.options.length) ? letterIndex : 0;
    } else {
      // Find correct index based on exact text match
      question.correctIndex = q.options.findIndex(
        opt => opt.toLowerCase().trim() === answer.toLowerCase()
      );
      if (question.correctIndex === -1) {
        question.correctIndex = 0;
      }
    }
  }

  if (q.type === 'OPEN') {
    question.modelAnswer = q.modelAnswer;
  }

  return question;
};

// Parse CSV format
export const parseCSV = (csvText: string): BulkImportQuestion[] => {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return []; // Need header + at least 1 row

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const questions: BulkImportQuestion[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    // Fix: Use proper typing instead of 'any'
    const question: Partial<BulkImportQuestion> = {};

    headers.forEach((header, idx) => {
      const value = values[idx]?.trim();

      switch (header) {
        case 'subject':
        case 'vak':
          question.subject = value;
          break;
        case 'level':
        case 'niveau':
          question.level = value as StudentLevel;
          break;
        case 'type':
          question.type = value as QuestionType;
          break;
        case 'text':
        case 'vraag':
          question.text = value;
          break;
        case 'year':
        case 'jaar':
        case 'examyear':
          question.examYear = value ? parseInt(value) : undefined;
          break;
        case 'context':
        case 'brontekst':
        case 'contexttext':
          question.contextText = value;
          break;
        case 'source':
        case 'bron':
          question.source = value;
          break;
        case 'score':
        case 'punten':
          question.score = value ? parseInt(value) : undefined;
          break;
        case 'options':
        case 'opties':
          // Expect options separated by |
          question.options = value ? value.split('|').map(o => o.trim()).filter(o => o) : [];
          break;
        case 'correctanswer':
        case 'juistantwoord':
        case 'correct':
          question.correctAnswer = value;
          break;
        case 'modelanswer':
        case 'modelantwoord':
        case 'answer':
          question.modelAnswer = value;
          break;
        case 'tijdvak':
        case 'period':
          question.tijdvak = value ? parseInt(value) : undefined;
          break;
        case 'section':
        case 'sectie':
          question.section = value;
          break;
        case 'sectionintro':
        case 'sectieintro':
          question.sectionIntro = value;
          break;
      }
    });

    questions.push(question as BulkImportQuestion);
  }

  return questions;
};

// Helper to parse CSV line (handles quoted fields with commas)
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
};

// Parse JSON format - supports both array format and object with questions property
export const parseJSON = (jsonText: string): BulkImportQuestion[] => {
  try {
    const data = JSON.parse(jsonText);

    // Case 1: Direct array of questions
    if (Array.isArray(data)) {
      return data as BulkImportQuestion[];
    }

    // Case 2: Object with questions array (common exam format)
    if (data && typeof data === 'object' && Array.isArray(data.questions)) {
      // Extract metadata from wrapper object
      const metadata: Partial<BulkImportQuestion> = {};

      if (data.subject) metadata.subject = data.subject;
      if (data.level) metadata.level = data.level as StudentLevel;
      if (data.year || data.examYear) metadata.examYear = data.year || data.examYear;
      if (data.tijdvak && [1, 2, 3].includes(data.tijdvak)) metadata.tijdvak = data.tijdvak;
      if (data.source) metadata.source = data.source;
      if (data.examPdfUrl) metadata.examPdfUrl = data.examPdfUrl;
      if (data.examBijlageUrl) metadata.examBijlageUrl = data.examBijlageUrl;
      if (data.examKaartUrl) metadata.examKaartUrl = data.examKaartUrl;

      // Map questions and inherit metadata where not specified
      return data.questions.map((q: any) => ({
        ...metadata,
        ...q,
        // Handle correctIndex -> correctAnswer conversion if needed
        correctAnswer: q.correctAnswer || (q.correctIndex !== undefined && q.options ? q.options[q.correctIndex] : undefined),
        // Ensure type is uppercase
        type: q.type?.toUpperCase() as QuestionType || metadata.type,
        // Ensure level is correct format
        level: (q.level || metadata.level) as StudentLevel,
      })) as BulkImportQuestion[];
    }

    // Case 3: Single question object
    if (data && typeof data === 'object' && data.text) {
      return [data as BulkImportQuestion];
    }

    console.error('JSON format niet herkend. Verwacht: array van vragen of object met questions property');
    return [];
  } catch (error) {
    console.error('JSON parse error:', error);
    return [];
  }
};

// Main bulk import function
export const bulkImportQuestions = async (
  questions: BulkImportQuestion[]
): Promise<ImportResult> => {
  const errors: ImportError[] = [];
  let importedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const validationErrors = validateQuestion(q, i + 1);

    if (validationErrors.length > 0) {
      errors.push(...validationErrors);
      failedCount++;
      continue;
    }

    try {
      const question = convertToQuestion(q, i);
      await saveQuestion(question);
      importedCount++;
    } catch (error) {
      errors.push({
        row: i + 1,
        message: `Fout bij opslaan: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        data: q
      });
      failedCount++;
    }
  }

  return {
    success: importedCount > 0,
    importedCount,
    failedCount,
    errors
  };
};

// Generate CSV template for download
export const generateCSVTemplate = (): string => {
  const headers = [
    'subject',
    'level',
    'type',
    'text',
    'year',
    'context',
    'source',
    'score',
    'options',
    'correctanswer',
    'modelanswer',
    'section',
    'sectionintro'
  ];

  const exampleRows = [
    [
      'Geschiedenis',
      'HAVO',
      'MULTIPLE_CHOICE',
      'In welk jaar viel de Berlijnse Muur?',
      '2023',
      '',
      'Examen 2023',
      '2',
      '1987|1989|1991|1993',
      '1989',
      '',
      'De Koude Oorlog',
      'De Koude Oorlog was een periode van geopolitieke spanning...'
    ],
    [
      'Nederlands',
      'VWO',
      'OPEN',
      'Analyseer de schrijfstijl van de auteur',
      '2024',
      '[Lange brontekst hier]',
      'Examen 2024 VWO',
      '2',
      '',
      '',
      'De auteur gebruikt veel metaforen en beeldspraak om...',
      'Tekstanalyse',
      ''
    ],
    [
      'Wiskunde A',
      'VMBO-TL',
      'MULTIPLE_CHOICE',
      'Wat is 25% van 80?',
      '',
      '',
      '',
      '2',
      '16|18|20|22',
      '20',
      '',
      '',
      ''
    ]
  ];

  const csv = [
    headers.join(','),
    ...exampleRows.map(row => row.map(cell => {
      // Quote cells that contain commas or special characters
      if (cell.includes(',') || cell.includes('"') || cell.includes('|')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','))
  ].join('\n');

  return csv;
};

// Validate import file type
export const validateFileType = (file: File): { valid: boolean; error?: string } => {
  const validExtensions = ['.csv', '.json'];
  const fileName = file.name.toLowerCase();

  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Ongeldig bestandstype. Gebruik .csv of .json bestanden.`
    };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Bestand te groot. Maximum grootte is 5MB.`
    };
  }

  return { valid: true };
};

// Read file content as text
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };

    reader.onerror = () => {
      reject(new Error('Fout bij het lezen van het bestand'));
    };

    reader.readAsText(file);
  });
};
