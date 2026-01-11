import { Question, ExamResult, StudentProfile, StudentLevel } from '../types';
import { supabase, dbQuestions, dbResults, dbStudents } from './supabaseService';

const QUESTIONS_KEY = 'ai_exam_questions';
const RESULTS_KEY = 'ai_exam_results';
const STUDENTS_KEY = 'ai_exam_students';

// Helper om te checken of Supabase beschikbaar is
const useDatabase = () => supabase !== null;

const INITIAL_QUESTIONS: Question[] = [
  {
    id: '1',
    type: 'MULTIPLE_CHOICE',
    subject: 'Geschiedenis',
    level: 'VMBO-TL',
    text: 'In welk jaar viel de Berlijnse Muur?',
    options: ['1987', '1989', '1991', '1993'],
    correctIndex: 1,
    source: 'Bron: Examenblad VMBO 2018'
  },
  {
    id: '2',
    type: 'MULTIPLE_CHOICE',
    subject: 'Kunst Algemeen',
    level: 'HAVO',
    text: 'Wie heeft dit schilderij (De Nachtwacht) geschilderd?',
    options: ['Vincent van Gogh', 'Johannes Vermeer', 'Rembrandt van Rijn', 'Frans Hals'],
    correctIndex: 2,
    imageUrl: 'https://lh3.googleusercontent.com/Ci5_s8Z_e0n3Y6tDkKzJzFvRjVv_gVz4FzK4FzK4FzK4FzK4=s1200',
    source: 'Rijksmuseum Amsterdam'
  },
  {
    id: '3',
    type: 'OPEN',
    subject: 'Nederlands',
    level: 'VWO',
    contextText: 'De opwarming van de aarde is een complex probleem. Wetenschappers wijzen naar de uitstoot van broeikasgassen als de voornaamste oorzaak. Echter, er zijn ook natuurlijke cycli die invloed hebben op het klimaat. Het debat gaat vaak over de mate waarin menselijk handelen bijdraagt aan de versnelling van dit proces.',
    text: 'Vat in eigen woorden samen wat volgens de tekst de voornaamste oorzaak is van de opwarming.',
    modelAnswer: 'De uitstoot van broeikasgassen door de mens.',
    source: 'Artikel Volkskrant'
  },
  {
    id: '4',
    type: 'MULTIPLE_CHOICE',
    subject: 'Geschiedenis',
    level: 'HAVO',
    text: 'Wat was een direct gevolg van de Industriële Revolutie voor de huisnijverheid?',
    options: ['Huisnijverheid verdween grotendeels', 'Huisnijverheid nam enorm toe', 'Er veranderde niets', 'Mensen gingen meer thuiswerken'],
    correctIndex: 0,
    source: 'Geschiedenis Havo 4'
  }
];

export const getQuestions = async (): Promise<Question[]> => {
  if (useDatabase()) {
    try {
      return await dbQuestions.getAll();
    } catch (error) {
      console.error('Database fout, gebruik localStorage fallback:', error);
      // Fallback naar localStorage
    }
  }
  
  // localStorage fallback
  const stored = localStorage.getItem(QUESTIONS_KEY);
  if (!stored) {
    try {
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(INITIAL_QUESTIONS));
    } catch (e) {
      console.warn("Storage full during initialization");
    }
    return INITIAL_QUESTIONS;
  }
  return JSON.parse(stored);
};

export const saveQuestion = async (question: Question): Promise<void> => {
  if (useDatabase()) {
    try {
      await dbQuestions.save(question);
      return;
    } catch (error) {
      console.error('Database fout, gebruik localStorage fallback:', error);
      // Fallback naar localStorage
    }
  }
  
  // localStorage fallback
  try {
    const questions = await getQuestions();
    const index = questions.findIndex(q => q.id === question.id);
    
    if (index !== -1) {
      // Update existing
      questions[index] = question;
    } else {
      // Add new
      questions.push(question);
    }
    
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
  } catch (error: any) {
    if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      throw new Error("OPSLAG_VOL");
    }
    throw error;
  }
};

export const deleteQuestion = async (id: string): Promise<void> => {
  if (useDatabase()) {
    try {
      await dbQuestions.delete(id);
      return;
    } catch (error) {
      console.error('Database fout, gebruik localStorage fallback:', error);
      // Fallback naar localStorage
    }
  }
  
  // localStorage fallback
  const questions = await getQuestions();
  const filtered = questions.filter(q => q.id !== id);
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(filtered));
};

export const getResults = async (): Promise<ExamResult[]> => {
  if (useDatabase()) {
    try {
      return await dbResults.getAll();
    } catch (error) {
      console.error('Database fout, gebruik localStorage fallback:', error);
      // Fallback naar localStorage
    }
  }
  
  // localStorage fallback
  const stored = localStorage.getItem(RESULTS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveResult = async (result: ExamResult): Promise<void> => {
  if (useDatabase()) {
    try {
      await dbResults.save(result);
      return;
    } catch (error) {
      console.error('Database fout, gebruik localStorage fallback:', error);
      // Fallback naar localStorage
    }
  }
  
  // localStorage fallback
  try {
    const results = await getResults();
    results.push(result);
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch (e) {
    console.error("Could not save result, storage likely full");
  }
};

export const saveStudentProfile = async (profile: StudentProfile): Promise<void> => {
  if (useDatabase()) {
    try {
      await dbStudents.save(profile);
      return;
    } catch (error) {
      console.error('Database fout, gebruik localStorage fallback:', error);
      // Fallback naar localStorage
    }
  }
  
  // localStorage fallback
  try {
    const stored = localStorage.getItem(STUDENTS_KEY);
    const students: StudentProfile[] = stored ? JSON.parse(stored) : [];
    
    const existingIdx = students.findIndex(s => s.name.toLowerCase() === profile.name.toLowerCase());
    if (existingIdx >= 0) {
      students[existingIdx] = profile;
    } else {
      students.push(profile);
    }
    
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  } catch (e) {
    alert("Opslag is vol. Kan profiel niet opslaan.");
  }
};

export const getStudentProfile = async (name: string): Promise<StudentProfile | undefined> => {
  if (useDatabase()) {
    try {
      return await dbStudents.getByName(name) || undefined;
    } catch (error) {
      console.error('Database fout, gebruik localStorage fallback:', error);
      // Fallback naar localStorage
    }
  }
  
  // localStorage fallback
  const stored = localStorage.getItem(STUDENTS_KEY);
  const students: StudentProfile[] = stored ? JSON.parse(stored) : [];
  return students.find(s => s.name.toLowerCase() === name.toLowerCase());
};

// Check if credentials match
export const verifyStudentLogin = async (name: string, password: string): Promise<boolean> => {
  const profile = await getStudentProfile(name);
  if (!profile) return false;

  // NOTE: In production, never compare plain text passwords. Use hashing (e.g., bcrypt).
  // TODO: This function is deprecated - use authService.verifyStudentLogin instead
  return profile.password === password;
};

// ============================================================================
// YEAR-BASED EXAM FUNCTIONS
// ============================================================================

// Get questions by year
export const getQuestionsByYear = async (year: number, level?: StudentLevel): Promise<Question[]> => {
  if (useDatabase()) {
    try {
      const allQuestions = await dbQuestions.getAll();
      return allQuestions.filter(q =>
        q.examYear === year &&
        (!level || q.level === level)
      );
    } catch (error) {
      console.error('Database fout:', error);
    }
  }

  // localStorage fallback
  const questions = await getQuestions();
  return questions.filter(q =>
    q.examYear === year &&
    (!level || q.level === level)
  );
};

// Get available exam years
export const getAvailableYears = async (): Promise<number[]> => {
  const questions = await getQuestions();
  const years = questions
    .map(q => q.examYear)
    .filter((year): year is number => year !== undefined && year !== null);

  return [...new Set(years)].sort((a, b) => b - a); // Descending order
};

// Get questions by year and subject
export const getQuestionsByYearAndSubject = async (
  year: number,
  subject: string,
  level: StudentLevel
): Promise<Question[]> => {
  const questions = await getQuestions();
  return questions.filter(q =>
    q.examYear === year &&
    q.subject === subject &&
    q.level === level
  );
};

// Get subjects available for a specific year
export const getSubjectsForYear = async (year: number, level?: StudentLevel): Promise<string[]> => {
  const questions = await getQuestionsByYear(year, level);
  const subjects = [...new Set(questions.map(q => q.subject))];
  return subjects.sort();
};

// Get question count by year
export const getQuestionCountByYear = async (year: number, level?: StudentLevel): Promise<number> => {
  const questions = await getQuestionsByYear(year, level);
  return questions.length;
};
