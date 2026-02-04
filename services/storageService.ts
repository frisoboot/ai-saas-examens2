import { Question, ExamResult, StudentLevel } from '../types';
import { supabase, dbQuestions, dbResults } from './supabaseService';
import { imageStorage } from './imageStorageService';
import { worksheetStorage } from './worksheetStorageService';

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
// DELETE ENTIRE EXAM (all questions + storage files)
// ============================================================================

export interface DeleteExamResult {
  deletedQuestions: number;
  deletedImages: number;
  deletedWorksheets: number;
  errors: string[];
}

/**
 * Delete an entire exam: all questions matching subject+year+level,
 * plus their associated storage files (images, worksheets, PDF tekstboekje).
 */
export const deleteExam = async (
  subject: string,
  year: number,
  level: StudentLevel
): Promise<DeleteExamResult> => {
  requireDatabase();

  const result: DeleteExamResult = {
    deletedQuestions: 0,
    deletedImages: 0,
    deletedWorksheets: 0,
    errors: [],
  };

  // Get all questions for this exam
  const allQuestions = await dbQuestions.getAll();
  const examQuestions = allQuestions.filter(q =>
    q.subject === subject &&
    q.examYear === year &&
    q.level === level
  );

  if (examQuestions.length === 0) {
    return result;
  }

  // Collect unique storage URLs to delete (examPdfUrl is shared, only delete once)
  const imagesToDelete = new Set<string>();
  const worksheetsToDelete = new Set<string>();

  for (const q of examQuestions) {
    if (q.imageUrl && q.imageUrl.includes('/storage/v1/object/public/')) {
      imagesToDelete.add(q.imageUrl);
    }
    if (q.worksheetUrl && q.worksheetUrl.includes('/storage/v1/object/public/')) {
      worksheetsToDelete.add(q.worksheetUrl);
    }
    if (q.examPdfUrl && q.examPdfUrl.includes('/storage/v1/object/public/')) {
      worksheetsToDelete.add(q.examPdfUrl);
    }
  }

  // Delete storage files (non-blocking, collect errors)
  for (const url of imagesToDelete) {
    try {
      await imageStorage.deleteImage(url);
      result.deletedImages++;
    } catch (e) {
      result.errors.push(`Afbeelding niet verwijderd: ${url}`);
    }
  }

  for (const url of worksheetsToDelete) {
    try {
      await worksheetStorage.deleteWorksheet(url);
      result.deletedWorksheets++;
    } catch (e) {
      result.errors.push(`Bijlage niet verwijderd: ${url}`);
    }
  }

  // Delete all questions from database
  for (const q of examQuestions) {
    try {
      await dbQuestions.delete(q.id);
      result.deletedQuestions++;
    } catch (e) {
      result.errors.push(`Vraag niet verwijderd: ${q.id}`);
    }
  }

  return result;
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
