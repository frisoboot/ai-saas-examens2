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
    if (q.examBijlageUrl && q.examBijlageUrl.includes('/storage/v1/object/public/')) {
      worksheetsToDelete.add(q.examBijlageUrl);
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
// UPDATE EXAM PDF URLs (swap PDF for all questions in an exam)
// ============================================================================

/**
 * Update the exam PDF (opdrachten or bijlage) for all questions matching subject+year+level.
 * Optionally deletes the old PDF from storage first.
 */
export const updateExamPdf = async (
  subject: string,
  year: number,
  level: StudentLevel,
  pdfType: 'examPdfUrl' | 'examBijlageUrl',
  newUrl: string | undefined
): Promise<number> => {
  requireDatabase();

  const allQuestions = await dbQuestions.getAll();
  const examQuestions = allQuestions.filter(q =>
    q.subject === subject &&
    q.examYear === year &&
    q.level === level
  );

  if (examQuestions.length === 0) return 0;

  let updatedCount = 0;
  for (const q of examQuestions) {
    const updated = { ...q, [pdfType]: newUrl };
    await dbQuestions.save(updated);
    updatedCount++;
  }

  return updatedCount;
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

// ============================================================================
// TIJDVAK-AWARE FUNCTIONS
// ============================================================================

export interface YearTijdvakInfo {
  year: number;
  tijdvakken: number[]; // Available tijdvakken for this year (e.g. [1, 2])
  questionCounts: Map<number, number>; // tijdvak -> question count
}

/**
 * Get available years with their tijdvakken for a specific subject and level
 */
export const getAvailableYearsWithTijdvakken = async (
  subject: string,
  level?: StudentLevel
): Promise<YearTijdvakInfo[]> => {
  const questions = await getQuestions();
  const filtered = questions.filter(q =>
    q.subject === subject &&
    q.examYear !== undefined &&
    q.examYear !== null &&
    (!level || q.level === level)
  );

  // Group by year, then by tijdvak
  const yearMap = new Map<number, Map<number, number>>();
  for (const q of filtered) {
    const year = q.examYear!;
    const tijdvak = q.tijdvak || 1; // Default to tijdvak 1 if not set
    if (!yearMap.has(year)) {
      yearMap.set(year, new Map());
    }
    const tvMap = yearMap.get(year)!;
    tvMap.set(tijdvak, (tvMap.get(tijdvak) || 0) + 1);
  }

  // Convert to sorted array
  const result: YearTijdvakInfo[] = [];
  for (const [year, tvMap] of yearMap) {
    result.push({
      year,
      tijdvakken: [...tvMap.keys()].sort((a, b) => a - b),
      questionCounts: tvMap,
    });
  }

  return result.sort((a, b) => b.year - a.year);
};
