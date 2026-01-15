import { Question, ExamResult, StudentProfile, StudentLevel } from '../types';
import { supabase, dbQuestions, dbResults, dbStudents } from './supabaseService';

// Database is VEREIST - geen fallbacks meer
const requireDatabase = () => {
  if (!supabase) {
    throw new Error('Database niet beschikbaar. Controleer je Supabase configuratie.');
  }
};

export const getQuestions = async (): Promise<Question[]> => {
  requireDatabase();
  return await dbQuestions.getAll();
};

export const saveQuestion = async (question: Question): Promise<void> => {
  requireDatabase();
  await dbQuestions.save(question);
};

export const deleteQuestion = async (id: string): Promise<void> => {
  requireDatabase();
  await dbQuestions.delete(id);
};

export const getResults = async (): Promise<ExamResult[]> => {
  requireDatabase();
  return await dbResults.getAll();
};

export const saveResult = async (result: ExamResult): Promise<void> => {
  requireDatabase();
  await dbResults.save(result);
};

export const saveStudentProfile = async (profile: StudentProfile): Promise<void> => {
  requireDatabase();
  await dbStudents.save(profile);
};

export const getStudentProfile = async (name: string): Promise<StudentProfile | undefined> => {
  requireDatabase();
  return await dbStudents.getByName(name) || undefined;
};

// ============================================================================
// YEAR-BASED EXAM FUNCTIONS
// ============================================================================

export const getQuestionsByYear = async (year: number, level?: StudentLevel): Promise<Question[]> => {
  requireDatabase();
  const allQuestions = await dbQuestions.getAll();
  return allQuestions.filter(q =>
    q.examYear === year &&
    (!level || q.level === level)
  );
};

export const getAvailableYears = async (): Promise<number[]> => {
  const questions = await getQuestions();
  const years = questions
    .map(q => q.examYear)
    .filter((year): year is number => year !== undefined && year !== null);

  return [...new Set(years)].sort((a, b) => b - a);
};

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

export const getSubjectsForYear = async (year: number, level?: StudentLevel): Promise<string[]> => {
  const questions = await getQuestionsByYear(year, level);
  const subjects = [...new Set(questions.map(q => q.subject))];
  return subjects.sort();
};

export const getQuestionCountByYear = async (year: number, level?: StudentLevel): Promise<number> => {
  const questions = await getQuestionsByYear(year, level);
  return questions.length;
};
