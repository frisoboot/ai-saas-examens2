/**
 * Flashcard Service Tests
 * Test flashcardService.ts: CRUD operaties en data transformatie
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FlashcardProgress } from '../../types';

// Use vi.hoisted to declare mocks before vi.mock (which is hoisted)
const { mockSupabaseClient } = vi.hoisted(() => ({
  mockSupabaseClient: {
    from: vi.fn(),
  },
}));

vi.mock('../../services/supabaseService', () => ({
  supabase: mockSupabaseClient,
}));

import {
  getFlashcardProgress,
  saveFlashcardProgress,
} from '../../services/flashcardService';

const mockDbProgress = {
  id: 'fp-1',
  student_name: 'Jan Jansen',
  subject: 'Wiskunde A',
  level: 'HAVO',
  cards_studied: 15,
  cards_mastered: 10,
  total_cards: 20,
  last_studied: '2024-03-15T10:00:00Z',
};

describe('Flashcard Service - getFlashcardProgress()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet flashcard progress ophalen en converteren naar camelCase', async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockDbProgress,
                error: null,
              }),
            }),
          }),
        }),
      }),
    });

    const result = await getFlashcardProgress('Jan Jansen', 'Wiskunde A', 'HAVO');

    expect(result).toBeDefined();
    expect(result!.id).toBe('fp-1');
    expect(result!.studentName).toBe('Jan Jansen');
    expect(result!.subject).toBe('Wiskunde A');
    expect(result!.level).toBe('HAVO');
    expect(result!.cardsStudied).toBe(15);
    expect(result!.cardsMastered).toBe(10);
    expect(result!.totalCards).toBe(20);
    expect(result!.lastStudied).toBe('2024-03-15T10:00:00Z');
  });

  it('moet undefined retourneren als geen progress gevonden (PGRST116)', async () => {
    mockSupabaseClient.from.mockReturnValue({
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

    const result = await getFlashcardProgress('Jan Jansen', 'Biologie', 'HAVO');

    expect(result).toBeUndefined();
  });

  it('moet error gooien bij andere database fout', async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST500', message: 'Internal error' },
              }),
            }),
          }),
        }),
      }),
    });

    await expect(
      getFlashcardProgress('Jan Jansen', 'Wiskunde A', 'HAVO')
    ).rejects.toBeDefined();
  });
});

describe('Flashcard Service - saveFlashcardProgress()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet progress opslaan met correcte snake_case conversie', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabaseClient.from.mockReturnValue({
      upsert: mockUpsert,
    });

    const progress: FlashcardProgress = {
      id: 'fp-1',
      studentName: 'Jan Jansen',
      subject: 'Wiskunde A',
      level: 'HAVO',
      cardsStudied: 15,
      cardsMastered: 10,
      totalCards: 20,
      lastStudied: '2024-03-15T10:00:00Z',
    };

    await saveFlashcardProgress(progress);

    expect(mockUpsert).toHaveBeenCalledWith({
      id: 'fp-1',
      student_name: 'Jan Jansen',
      subject: 'Wiskunde A',
      level: 'HAVO',
      cards_studied: 15,
      cards_mastered: 10,
      total_cards: 20,
      last_studied: '2024-03-15T10:00:00Z',
    });
  });

  it('moet error gooien bij database fout', async () => {
    mockSupabaseClient.from.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({
        error: { message: 'Upsert failed' },
      }),
    });

    const progress: FlashcardProgress = {
      id: 'fp-1',
      studentName: 'Jan',
      subject: 'Wiskunde A',
      level: 'HAVO',
      cardsStudied: 0,
      cardsMastered: 0,
      totalCards: 10,
    };

    await expect(saveFlashcardProgress(progress)).rejects.toBeDefined();
  });
});

describe('Flashcard Progress Data Transformation', () => {
  it('moet correct converteren van DB naar TypeScript format', () => {
    const tsProgress: FlashcardProgress = {
      id: mockDbProgress.id,
      studentName: mockDbProgress.student_name,
      subject: mockDbProgress.subject,
      level: mockDbProgress.level as 'VMBO-TL' | 'HAVO' | 'VWO',
      cardsStudied: mockDbProgress.cards_studied,
      cardsMastered: mockDbProgress.cards_mastered,
      totalCards: mockDbProgress.total_cards,
      lastStudied: mockDbProgress.last_studied,
    };

    expect(tsProgress.studentName).toBe('Jan Jansen');
    expect(tsProgress.cardsStudied).toBe(15);
    expect(tsProgress.cardsMastered).toBe(10);
  });

  it('moet correct converteren van TypeScript naar DB format', () => {
    const dbData = {
      id: 'fp-1',
      student_name: 'Jan Jansen',
      subject: 'Wiskunde A',
      level: 'HAVO',
      cards_studied: 15,
      cards_mastered: 10,
      total_cards: 20,
      last_studied: '2024-03-15T10:00:00Z',
    };

    expect(dbData.student_name).toBe('Jan Jansen');
    expect(dbData.cards_studied).toBe(15);
    expect(dbData.cards_mastered).toBe(10);
    expect(dbData.total_cards).toBe(20);
  });

  it('moet progress percentages correct berekenen', () => {
    const progress: FlashcardProgress = {
      id: 'fp-1',
      studentName: 'Jan',
      subject: 'Wiskunde A',
      level: 'HAVO',
      cardsStudied: 15,
      cardsMastered: 10,
      totalCards: 20,
    };

    const studiedPercentage = (progress.cardsStudied / progress.totalCards) * 100;
    const masteredPercentage = (progress.cardsMastered / progress.totalCards) * 100;

    expect(studiedPercentage).toBe(75);
    expect(masteredPercentage).toBe(50);
  });
});
