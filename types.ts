export type QuestionType = 'MULTIPLE_CHOICE' | 'OPEN';

export type StudentLevel = 'VMBO-TL' | 'HAVO' | 'VWO';

export interface Question {
  id: string;
  type: QuestionType;
  subject: string;
  level: StudentLevel; // New field: determines difficulty/target audience
  text: string; 
  
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
}

export interface StudentProfile {
  name: string;
  password: string; // WARNING: In a real app, never store plain text passwords!
  level: StudentLevel;
  strugglePoints: string; 
}

export type ViewState = 'LANDING' | 'ADMIN' | 'STUDENT_DASHBOARD' | 'EXAM' | 'EXAM_REVIEW' | 'SUBJECT_CHAT';

export interface ExamSession {
  studentName: string;
  subject: string;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, number | string>; 
}
