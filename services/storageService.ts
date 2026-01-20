import { Question, ExamResult, StudentLevel } from '../types';
import { supabase, dbQuestions, dbResults } from './supabaseService';

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

export const saveResult = async (result: ExamResult): Promise<void> => {
  requireDatabase();
  await dbResults.save(result);
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

export const getQuestionCountByYear = async (year: number, level?: StudentLevel): Promise<number> => {
  const questions = await getQuestionsByYear(year, level);
  return questions.length;
};

// ============================================================================
// SUBJECT-SPECIFIC YEAR FUNCTIONS
// ============================================================================

/**
 * Get available years for a specific subject and level
 * Returns years sorted descending (newest first)
 */
export const getAvailableYearsForSubject = async (subject: string, level?: StudentLevel): Promise<number[]> => {
  const questions = await getQuestions();
  const years = questions
    .filter(q =>
      q.subject === subject &&
      q.examYear !== undefined &&
      q.examYear !== null &&
      (!level || q.level === level)
    )
    .map(q => q.examYear as number);

  return [...new Set(years)].sort((a, b) => b - a);
};

/**
 * Get question count for a specific subject, year and level
 */
export const getQuestionCountBySubjectAndYear = async (
  subject: string,
  year: number,
  level?: StudentLevel
): Promise<number> => {
  const questions = await getQuestions();
  return questions.filter(q =>
    q.subject === subject &&
    q.examYear === year &&
    (!level || q.level === level)
  ).length;
};

/**
 * Get questions for a specific subject, year and level
 */
export const getQuestionsBySubjectAndYear = async (
  subject: string,
  year: number,
  level?: StudentLevel
): Promise<Question[]> => {
  const questions = await getQuestions();
  return questions.filter(q =>
    q.subject === subject &&
    q.examYear === year &&
    (!level || q.level === level)
  );
};
