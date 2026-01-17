import { FlashcardProgress, StudentLevel } from '../types';
import { supabase } from './supabaseService';

// Database is VEREIST - geen fallbacks meer
const requireDatabase = () => {
  if (!supabase) {
    throw new Error('Database niet beschikbaar. Controleer je Supabase configuratie.');
  }
};

// Get progress for a student
export const getFlashcardProgress = async (
  studentName: string,
  subject: string,
  level: StudentLevel
): Promise<FlashcardProgress | undefined> => {
  requireDatabase();

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

  return undefined;
};

// Save progress
export const saveFlashcardProgress = async (progress: FlashcardProgress): Promise<void> => {
  requireDatabase();

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
};
