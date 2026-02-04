export type QuestionType = 'MULTIPLE_CHOICE' | 'OPEN';

export type StudentLevel = 'VMBO-TL' | 'HAVO' | 'VWO';

export type ExamType = 'practice' | 'official_exam';

export type ImportType = 'csv' | 'json' | 'ai_pdf';

export type ExamMode = 'BY_SUBJECT' | 'BY_YEAR';

export interface Question {
  id: string;
  type: QuestionType;
  subject: string;
  level: StudentLevel;
  text: string;

  // Year-based exam fields
  examYear?: number; // e.g., 2024, 2023, null for practice questions
  examType?: ExamType; // 'practice' or 'official_exam'

  // For context/reading comprehension
  contextText?: string;

  // Media & Source
  imageUrl?: string;
  hasImage?: boolean;  // Mark that this question needs an image (for quick entry workflow)
  source?: string;

  // Worksheet/attachment for questions that need external materials (e.g., Binas tables)
  worksheetUrl?: string;        // URL to PDF in Supabase Storage
  worksheetLabel?: string;      // Label like "Binas-tabel 45" or "Uitwerkpapier"
  requiresWorksheet?: boolean;  // If true, student can skip this question

  // Scoring
  score?: number; // Points awarded for this question (default: 1)

  // For Multiple Choice
  options?: string[];
  correctIndex?: number;

  // For Open Questions
  modelAnswer?: string;

  // Section grouping (for official exams with multiple sections)
  section?: string;        // Section title (e.g., "Kwaliteitscontrole voor straight whiskey")
  sectionIntro?: string;   // Intro text for the section (only needed on first question of section)

  // PDF tekstboekje (for exams like Nederlands, Engels, Geschiedenis)
  examPdfUrl?: string;     // URL to exam PDF (tekstboekje) in Supabase Storage - shared across all questions in one exam
  pdfPage?: number;        // Specific page number in the PDF to show for this question
}

export interface Answer {
  questionId: string;
  value: number | string; 
}

export interface ExamResult {
  id: string;
  studentName: string;
  subject: string;
  score: number;
  totalQuestions: number;
  date: string;
  answers: Answer[];

  // Year and type tracking
  examYear?: number;
  examType?: 'subject_practice' | 'year_exam';
  durationSeconds?: number;
  level?: StudentLevel; // Student level at time of exam

  // Security: link exam result to authenticated user
  user_id?: string; // UUID of auth.users - for RLS enforcement
}

export interface StudentProfile {
  name: string;
  level: StudentLevel;
  strugglePoints: string;
  email?: string;
  isActive?: boolean;
  isAdmin?: boolean; // Admin role flag for RLS
  selectedSubjects?: string[] | null; // Selected subjects for dashboard, null = show all
}

export type ViewState = 'PUBLIC_LANDING' | 'LOGIN' | 'CHECKOUT' | 'PAYMENT_CALLBACK' | 'PAYMENT_SUCCESS' | 'LANDING' | 'ADMIN' | 'STUDENT_DASHBOARD' | 'EXAM' | 'SUBJECT_CHAT' | 'FLASHCARD_STUDY' | 'SETTINGS';

export interface ExamSession {
  studentName: string;
  subject: string;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, number | string>;

  // Year-based exam tracking
  examYear?: number;
  examType: 'subject_practice' | 'year_exam' | 'ai_practice' | 'official_exam';
  startTime?: number; // Timestamp when exam started
  timeLimit?: number; // Time limit in minutes (0 = no limit)

  // PDF tekstboekje URL (extracted from questions for the entire exam)
  pdfUrl?: string;
}


// Progress tracking interface
export interface StudentProgress {
  id: string;
  studentName: string;
  subject: string;
  totalExamsTaken: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  averageScore: number; // Percentage
  lastExamDate?: string;
  weakestTopics?: string[];
  improvementRate?: number; // Percentage change over time
  recentScores?: number[]; // Last 5 exam scores for trend analysis
}

// Bulk import interfaces
export interface BulkImportQuestion {
  subject: string;
  level: StudentLevel;
  type: QuestionType;
  text: string;
  examYear?: number;
  contextText?: string;
  source?: string;
  score?: number; // Points awarded for this question
  options?: string[];
  correctAnswer?: string; // Will be converted to correctIndex
  modelAnswer?: string;
  imageUrl?: string; // Base64 string
  hasImage?: boolean; // Mark that this question needs an image
  worksheetUrl?: string;
  worksheetLabel?: string;
  requiresWorksheet?: boolean;
  section?: string;
  sectionIntro?: string;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  failedCount: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

// Year exam data structure
export interface YearExam {
  year: number;
  subjects: string[]; // Subjects available for this year
  questionCount: number;
  levels: StudentLevel[];
}

// Flashcard interfaces
export interface Flashcard {
  id: string;
  subject: string;
  level: StudentLevel;
  front: string;  // Question/prompt side
  back: string;   // Answer side
  topic?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardProgress {
  id: string;
  studentName: string;
  subject: string;
  level: StudentLevel;
  cardsStudied: number;
  cardsMastered: number;  // Cards marked as "known"
  totalCards: number;
  lastStudied?: string;
}

export interface FlashcardSession {
  studentName: string;
  subject: string;
  level: StudentLevel;
  cards: Flashcard[];
  currentCardIndex: number;
  knownCards: string[];    // IDs of cards marked as "known"
  unknownCards: string[];  // IDs of cards marked as "need practice"
  startTime: number;
}
