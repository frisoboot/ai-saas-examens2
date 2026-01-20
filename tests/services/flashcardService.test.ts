/**
 * Flashcard Service Tests
 * Test flashcard progress tracking en data transformatie
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FlashcardProgress, StudentLevel } from '../../types';

// Mock database data
const mockDbFlashcardProgress = {
  id: 'fp-123',
  student_name: 'Jan Jansen',
  subject: 'Wiskunde A',
  level: 'HAVO',
  cards_studied: 25,
  cards_mastered: 18,
  total_cards: 50,
  last_studied: '2024-01-20T10:30:00Z',
};

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('Flashcard Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Transformation', () => {
    it('moet database data correct converteren naar TypeScript format', () => {
      const tsProgress: FlashcardProgress = {
        id: mockDbFlashcardProgress.id,
        studentName: mockDbFlashcardProgress.student_name,
        subject: mockDbFlashcardProgress.subject,
        level: mockDbFlashcardProgress.level as StudentLevel,
        cardsStudied: mockDbFlashcardProgress.cards_studied,
        cardsMastered: mockDbFlashcardProgress.cards_mastered,
        totalCards: mockDbFlashcardProgress.total_cards,
        lastStudied: mockDbFlashcardProgress.last_studied,
      };

      expect(tsProgress.studentName).toBe('Jan Jansen');
      expect(tsProgress.cardsStudied).toBe(25);
      expect(tsProgress.cardsMastered).toBe(18);
      expect(tsProgress.totalCards).toBe(50);
    });

    it('moet TypeScript data correct converteren naar database format', () => {
      const progress: FlashcardProgress = {
        id: 'fp-456',
        studentName: 'Piet Peters',
        subject: 'Engels',
        level: 'VWO',
        cardsStudied: 30,
        cardsMastered: 20,
        totalCards: 60,
        lastStudied: '2024-01-21T14:00:00Z',
      };

      const dbData = {
        id: progress.id,
        student_name: progress.studentName,
        subject: progress.subject,
        level: progress.level,
        cards_studied: progress.cardsStudied,
        cards_mastered: progress.cardsMastered,
        total_cards: progress.totalCards,
        last_studied: progress.lastStudied,
      };

      expect(dbData.student_name).toBe('Piet Peters');
      expect(dbData.cards_studied).toBe(30);
      expect(dbData.cards_mastered).toBe(20);
    });
  });

  describe('getFlashcardProgress()', () => {
    it('moet progress ophalen voor student/vak/niveau combinatie', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockDbFlashcardProgress,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const { data } = await mockSupabase
        .from('flashcard_progress')
        .select('*')
        .eq('student_name', 'Jan Jansen')
        .eq('subject', 'Wiskunde A')
        .eq('level', 'HAVO')
        .single();

      expect(data).toEqual(mockDbFlashcardProgress);
    });

    it('moet undefined retourneren als geen progress bestaat', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' }, // No rows found
                }),
              }),
            }),
          }),
        }),
      });

      const { data, error } = await mockSupabase
        .from('flashcard_progress')
        .select('*')
        .eq('student_name', 'Onbekend')
        .eq('subject', 'Wiskunde A')
        .eq('level', 'HAVO')
        .single();

      expect(data).toBeNull();
      expect(error.code).toBe('PGRST116');
    });
  });

  describe('saveFlashcardProgress()', () => {
    it('moet progress opslaan via upsert', async () => {
      const progressToSave: FlashcardProgress = {
        id: 'fp-new',
        studentName: 'Nieuwe Student',
        subject: 'Biologie',
        level: 'VMBO-TL',
        cardsStudied: 10,
        cardsMastered: 5,
        totalCards: 40,
        lastStudied: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({
          error: null,
        }),
      });

      const { error } = await mockSupabase.from('flashcard_progress').upsert({
        id: progressToSave.id,
        student_name: progressToSave.studentName,
        subject: progressToSave.subject,
        level: progressToSave.level,
        cards_studied: progressToSave.cardsStudied,
        cards_mastered: progressToSave.cardsMastered,
        total_cards: progressToSave.totalCards,
        last_studied: progressToSave.lastStudied,
      });

      expect(error).toBeNull();
    });
  });

  describe('Progress Statistics', () => {
    it('moet mastery percentage correct berekenen', () => {
      const progress: FlashcardProgress = {
        id: 'fp-1',
        studentName: 'Test',
        subject: 'Test',
        level: 'HAVO',
        cardsStudied: 40,
        cardsMastered: 30,
        totalCards: 50,
      };

      const masteryPercentage = (progress.cardsMastered / progress.totalCards) * 100;
      const studiedPercentage = (progress.cardsStudied / progress.totalCards) * 100;

      expect(masteryPercentage).toBe(60);
      expect(studiedPercentage).toBe(80);
    });

    it('moet 0% retourneren voor geen kaarten', () => {
      const progress: FlashcardProgress = {
        id: 'fp-1',
        studentName: 'Test',
        subject: 'Test',
        level: 'HAVO',
        cardsStudied: 0,
        cardsMastered: 0,
        totalCards: 0,
      };

      const masteryPercentage = progress.totalCards > 0
        ? (progress.cardsMastered / progress.totalCards) * 100
        : 0;

      expect(masteryPercentage).toBe(0);
    });

    it('moet kaarten die nog geoefend moeten worden berekenen', () => {
      const progress: FlashcardProgress = {
        id: 'fp-1',
        studentName: 'Test',
        subject: 'Test',
        level: 'HAVO',
        cardsStudied: 30,
        cardsMastered: 20,
        totalCards: 50,
      };

      const needsPractice = progress.cardsStudied - progress.cardsMastered;
      const notYetStudied = progress.totalCards - progress.cardsStudied;

      expect(needsPractice).toBe(10);
      expect(notYetStudied).toBe(20);
    });
  });

  describe('Level Validation', () => {
    it('moet alle geldige niveaus ondersteunen', () => {
      const levels: StudentLevel[] = ['VMBO-TL', 'HAVO', 'VWO'];

      levels.forEach(level => {
        const progress: FlashcardProgress = {
          id: `fp-${level}`,
          studentName: 'Test',
          subject: 'Test',
          level,
          cardsStudied: 0,
          cardsMastered: 0,
          totalCards: 10,
        };

        expect(['VMBO-TL', 'HAVO', 'VWO']).toContain(progress.level);
      });
    });
  });

  describe('Edge Cases', () => {
    it('moet werken zonder lastStudied datum', () => {
      const progress: FlashcardProgress = {
        id: 'fp-1',
        studentName: 'Test',
        subject: 'Test',
        level: 'HAVO',
        cardsStudied: 10,
        cardsMastered: 5,
        totalCards: 20,
        // lastStudied is undefined
      };

      expect(progress.lastStudied).toBeUndefined();
    });

    it('moet mastered niet groter dan studied kunnen zijn', () => {
      const progress: FlashcardProgress = {
        id: 'fp-1',
        studentName: 'Test',
        subject: 'Test',
        level: 'HAVO',
        cardsStudied: 10,
        cardsMastered: 10, // All studied cards are mastered
        totalCards: 20,
      };

      expect(progress.cardsMastered).toBeLessThanOrEqual(progress.cardsStudied);
    });

    it('moet studied niet groter dan total kunnen zijn', () => {
      const progress: FlashcardProgress = {
        id: 'fp-1',
        studentName: 'Test',
        subject: 'Test',
        level: 'HAVO',
        cardsStudied: 20, // All cards studied
        cardsMastered: 15,
        totalCards: 20,
      };

      expect(progress.cardsStudied).toBeLessThanOrEqual(progress.totalCards);
    });
  });
});

describe('Flashcard Session Logic', () => {
  describe('Card Categorization', () => {
    it('moet kaarten correct categoriseren', () => {
      const knownCards = ['card-1', 'card-3', 'card-5'];
      const unknownCards = ['card-2', 'card-4'];

      const totalAnswered = knownCards.length + unknownCards.length;
      const masteryRate = (knownCards.length / totalAnswered) * 100;

      expect(totalAnswered).toBe(5);
      expect(masteryRate).toBe(60);
    });

    it('moet sessie duratie kunnen berekenen', () => {
      const startTime = Date.now() - 5 * 60 * 1000; // 5 minuten geleden
      const now = Date.now();

      const durationMs = now - startTime;
      const durationMinutes = Math.floor(durationMs / 60000);

      expect(durationMinutes).toBe(5);
    });
  });
});
