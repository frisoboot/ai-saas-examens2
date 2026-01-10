import { Question, ExamResult, StudentProfile } from '../types';

const QUESTIONS_KEY = 'ai_exam_questions';
const RESULTS_KEY = 'ai_exam_results';
const STUDENTS_KEY = 'ai_exam_students';

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

export const getQuestions = (): Question[] => {
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

export const saveQuestion = (question: Question): void => {
  try {
    const questions = getQuestions();
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

export const deleteQuestion = (id: string): void => {
  const questions = getQuestions();
  const filtered = questions.filter(q => q.id !== id);
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(filtered));
};

export const getResults = (): ExamResult[] => {
  const stored = localStorage.getItem(RESULTS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveResult = (result: ExamResult): void => {
  try {
    const results = getResults();
    results.push(result);
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch (e) {
    console.error("Could not save result, storage likely full");
  }
};

export const saveStudentProfile = (profile: StudentProfile): void => {
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

export const getStudentProfile = (name: string): StudentProfile | undefined => {
  const stored = localStorage.getItem(STUDENTS_KEY);
  const students: StudentProfile[] = stored ? JSON.parse(stored) : [];
  return students.find(s => s.name.toLowerCase() === name.toLowerCase());
};

// Check if credentials match
export const verifyStudentLogin = (name: string, password: string): boolean => {
  const profile = getStudentProfile(name);
  if (!profile) return false;
  
  // NOTE: In production, never compare plain text passwords. Use hashing (e.g., bcrypt).
  return profile.password === password;
};
