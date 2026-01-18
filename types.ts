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
  source?: string;

  // For Multiple Choice
  options?: string[];
  correctIndex?: number;

  // For Open Questions
  modelAnswer?: string;
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
}

export interface StudentProfile {
  name: string;
  level: StudentLevel;
  strugglePoints: string;
  authUserId?: string;
  email?: string;
  isActive?: boolean;
}

export type ViewState = 'PUBLIC_LANDING' | 'LOGIN' | 'CHECKOUT' | 'PAYMENT_CALLBACK' | 'PAYMENT_SUCCESS' | 'LANDING' | 'ADMIN' | 'STUDENT_DASHBOARD' | 'EXAM' | 'SUBJECT_CHAT' | 'FLASHCARD_STUDY';

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
  options?: string[];
  correctAnswer?: string; // Will be converted to correctIndex
  modelAnswer?: string;
  imageUrl?: string; // Base64 string
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
