import { Flashcard, FlashcardProgress, StudentLevel } from '../types';
import { supabase } from './supabaseService';

// Database is VEREIST - geen fallbacks meer
const requireDatabase = () => {
  if (!supabase) {
    throw new Error('Database niet beschikbaar. Controleer je Supabase configuratie.');
  }
};

// Get flashcards by subject and level
export const getFlashcards = async (
  subject: string,
  level: StudentLevel
): Promise<Flashcard[]> => {
  requireDatabase();

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
};

// Get all flashcards
export const getAllFlashcards = async (): Promise<Flashcard[]> => {
  requireDatabase();

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
};

// Save a single flashcard
export const saveFlashcard = async (flashcard: Flashcard): Promise<void> => {
  requireDatabase();

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
};

// Save multiple flashcards at once
export const saveFlashcards = async (flashcards: Flashcard[]): Promise<void> => {
  requireDatabase();

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
};

// Delete a flashcard
export const deleteFlashcard = async (id: string): Promise<void> => {
  requireDatabase();

  const { error } = await supabase!
    .from('flashcards')
    .delete()
    .eq('id', id);

  if (error) throw error;
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
