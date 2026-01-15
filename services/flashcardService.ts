import { Flashcard, FlashcardProgress, StudentLevel } from '../types';
import { supabase } from './supabaseService';

const FLASHCARDS_KEY = 'ai_exam_flashcards';
const FLASHCARD_PROGRESS_KEY = 'ai_exam_flashcard_progress';

// Helper om te checken of Supabase beschikbaar is
const useDatabase = () => supabase !== null;

// Get flashcards by subject and level
export const getFlashcards = async (
  subject: string,
  level: StudentLevel
): Promise<Flashcard[]> => {
  if (useDatabase()) {
    try {
      const { data, error } = await supabase!
        .from('flashcards')
        .select('*')
        .eq('subject', subject)
        .eq('level', level)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        subject: row.subject,
        level: row.level as StudentLevel,
        front: row.front,
        back: row.back,
        topic: row.topic,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error('Database fout bij ophalen flashcards:', error);
    }
  }

  // localStorage fallback
  const stored = localStorage.getItem(FLASHCARDS_KEY);
  const allCards: Flashcard[] = stored ? JSON.parse(stored) : [];
  return allCards.filter(c => c.subject === subject && c.level === level);
};

// Get all flashcards
export const getAllFlashcards = async (): Promise<Flashcard[]> => {
  if (useDatabase()) {
    try {
      const { data, error } = await supabase!
        .from('flashcards')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        subject: row.subject,
        level: row.level as StudentLevel,
        front: row.front,
        back: row.back,
        topic: row.topic,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error('Database fout bij ophalen flashcards:', error);
    }
  }

  // localStorage fallback
  const stored = localStorage.getItem(FLASHCARDS_KEY);
  return stored ? JSON.parse(stored) : [];
};

// Save a single flashcard
export const saveFlashcard = async (flashcard: Flashcard): Promise<void> => {
  if (useDatabase()) {
    try {
      const { error } = await supabase!
        .from('flashcards')
        .upsert({
          id: flashcard.id,
          subject: flashcard.subject,
          level: flashcard.level,
          front: flashcard.front,
          back: flashcard.back,
          topic: flashcard.topic,
          created_at: flashcard.createdAt,
          updated_at: flashcard.updatedAt,
        });

      if (error) throw error;
      return;
    } catch (error) {
      console.error('Database fout bij opslaan flashcard:', error);
    }
  }

  // localStorage fallback
  try {
    const stored = localStorage.getItem(FLASHCARDS_KEY);
    const allCards: Flashcard[] = stored ? JSON.parse(stored) : [];

    const existingIdx = allCards.findIndex(c => c.id === flashcard.id);
    if (existingIdx >= 0) {
      allCards[existingIdx] = flashcard;
    } else {
      allCards.push(flashcard);
    }

    localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(allCards));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      throw new Error('Opslag is vol. Kan flashcard niet opslaan.');
    }
    throw e;
  }
};

// Save multiple flashcards at once
export const saveFlashcards = async (flashcards: Flashcard[]): Promise<void> => {
  if (useDatabase()) {
    try {
      const { error } = await supabase!
        .from('flashcards')
        .upsert(flashcards.map(f => ({
          id: f.id,
          subject: f.subject,
          level: f.level,
          front: f.front,
          back: f.back,
          topic: f.topic,
          created_at: f.createdAt,
          updated_at: f.updatedAt,
        })));

      if (error) throw error;
      return;
    } catch (error) {
      console.error('Database fout bij opslaan flashcards:', error);
    }
  }

  // localStorage fallback
  try {
    const stored = localStorage.getItem(FLASHCARDS_KEY);
    const allCards: Flashcard[] = stored ? JSON.parse(stored) : [];

    for (const flashcard of flashcards) {
      const existingIdx = allCards.findIndex(c => c.id === flashcard.id);
      if (existingIdx >= 0) {
        allCards[existingIdx] = flashcard;
      } else {
        allCards.push(flashcard);
      }
    }

    localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(allCards));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      throw new Error('Opslag is vol. Kan flashcards niet opslaan.');
    }
    throw e;
  }
};

// Delete a flashcard
export const deleteFlashcard = async (id: string): Promise<void> => {
  if (useDatabase()) {
    try {
      const { error } = await supabase!
        .from('flashcards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return;
    } catch (error) {
      console.error('Database fout bij verwijderen flashcard:', error);
    }
  }

  // localStorage fallback
  const stored = localStorage.getItem(FLASHCARDS_KEY);
  const allCards: Flashcard[] = stored ? JSON.parse(stored) : [];
  const filtered = allCards.filter(c => c.id !== id);
  localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(filtered));
};

// Get flashcard count per subject
export const getFlashcardCount = async (
  subject: string,
  level: StudentLevel
): Promise<number> => {
  const cards = await getFlashcards(subject, level);
  return cards.length;
};

// Get progress for a student
export const getFlashcardProgress = async (
  studentName: string,
  subject: string,
  level: StudentLevel
): Promise<FlashcardProgress | undefined> => {
  if (useDatabase()) {
    try {
      const { data, error } = await supabase!
        .from('flashcard_progress')
        .select('*')
        .eq('student_name', studentName)
        .eq('subject', subject)
        .eq('level', level)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        return {
          id: data.id,
          studentName: data.student_name,
          subject: data.subject,
          level: data.level as StudentLevel,
          cardsStudied: data.cards_studied,
          cardsMastered: data.cards_mastered,
          totalCards: data.total_cards,
          lastStudied: data.last_studied,
        };
      }
    } catch (error) {
      console.error('Database fout bij ophalen progress:', error);
    }
  }

  // localStorage fallback
  const stored = localStorage.getItem(FLASHCARD_PROGRESS_KEY);
  const allProgress: FlashcardProgress[] = stored ? JSON.parse(stored) : [];
  return allProgress.find(
    p => p.studentName === studentName && p.subject === subject && p.level === level
  );
};

// Save progress
export const saveFlashcardProgress = async (progress: FlashcardProgress): Promise<void> => {
  if (useDatabase()) {
    try {
      const { error } = await supabase!
        .from('flashcard_progress')
        .upsert({
          id: progress.id,
          student_name: progress.studentName,
          subject: progress.subject,
          level: progress.level,
          cards_studied: progress.cardsStudied,
          cards_mastered: progress.cardsMastered,
          total_cards: progress.totalCards,
          last_studied: progress.lastStudied,
        });

      if (error) throw error;
      return;
    } catch (error) {
      console.error('Database fout bij opslaan progress:', error);
    }
  }

  // localStorage fallback
  try {
    const stored = localStorage.getItem(FLASHCARD_PROGRESS_KEY);
    const allProgress: FlashcardProgress[] = stored ? JSON.parse(stored) : [];

    const existingIdx = allProgress.findIndex(
      p => p.studentName === progress.studentName &&
           p.subject === progress.subject &&
           p.level === progress.level
    );

    if (existingIdx >= 0) {
      allProgress[existingIdx] = progress;
    } else {
      allProgress.push(progress);
    }

    localStorage.setItem(FLASHCARD_PROGRESS_KEY, JSON.stringify(allProgress));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      throw new Error('Opslag is vol. Kan progress niet opslaan.');
    }
    throw e;
  }
};
