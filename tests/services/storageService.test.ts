/**
 * Storage Service Tests
 * Test storageService.ts: CRUD operaties, deleteExam, en year-based functies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Question } from '../../types';

// Use vi.hoisted to declare mocks before vi.mock (which is hoisted)
const { mockDbQuestions, mockDbResults, mockImageStorage, mockWorksheetStorage } = vi.hoisted(() => ({
  mockDbQuestions: {
    getAll: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  },
  mockDbResults: {
    save: vi.fn(),
  },
  mockImageStorage: {
    deleteImage: vi.fn(),
  },
  mockWorksheetStorage: {
    deleteWorksheet: vi.fn(),
  },
}));

vi.mock('../../services/supabaseService', () => ({
  supabase: {},
  dbQuestions: mockDbQuestions,
  dbResults: mockDbResults,
}));

vi.mock('../../services/imageStorageService', () => ({
  imageStorage: mockImageStorage,
}));

vi.mock('../../services/worksheetStorageService', () => ({
  worksheetStorage: mockWorksheetStorage,
}));

// Mock data
const mockQuestions: Question[] = [
  {
    id: 'q-1',
    type: 'MULTIPLE_CHOICE',
    subject: 'Wiskunde A',
    level: 'HAVO',
    text: 'Wat is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctIndex: 1,
    examYear: 2024,
    examType: 'official_exam',
    imageUrl: 'https://test.supabase.co/storage/v1/object/public/exam-image/img1.jpg',
  },
  {
    id: 'q-2',
    type: 'OPEN',
    subject: 'Wiskunde A',
    level: 'HAVO',
    text: 'Leg uit waarom 2+2=4',
    modelAnswer: 'Omdat...',
    examYear: 2024,
    examType: 'official_exam',
    worksheetUrl: 'https://test.supabase.co/storage/v1/object/public/exam-worksheets/ws1.pdf',
  },
  {
    id: 'q-3',
    type: 'MULTIPLE_CHOICE',
    subject: 'Wiskunde A',
    level: 'HAVO',
    text: 'Bereken de afgeleide',
    options: ['x', '2x', '3x'],
    correctIndex: 1,
    examYear: 2024,
    examType: 'official_exam',
    examPdfUrl: 'https://test.supabase.co/storage/v1/object/public/exam-worksheets/pdf1.pdf',
  },
  {
    id: 'q-4',
    type: 'MULTIPLE_CHOICE',
    subject: 'Wiskunde A',
    level: 'VWO',
    text: 'VWO vraag',
    options: ['a', 'b'],
    correctIndex: 0,
    examYear: 2024,
    examType: 'official_exam',
  },
  {
    id: 'q-5',
    type: 'MULTIPLE_CHOICE',
    subject: 'Geschiedenis',
    level: 'HAVO',
    text: 'Wanneer viel de Berlijnse Muur?',
    options: ['1987', '1989', '1991'],
    correctIndex: 1,
    examYear: 2023,
    examType: 'official_exam',
  },
  {
    id: 'q-6',
    type: 'OPEN',
    subject: 'Wiskunde A',
    level: 'HAVO',
    text: 'Oefenvraag zonder jaar',
    modelAnswer: 'Antwoord',
    examType: 'practice',
  },
];

// Import after mocks
import {
  getQuestions,
  saveQuestion,
  deleteQuestion,
  saveResult,
  deleteExam,
  getQuestionsByYear,
  getAvailableYears,
  getQuestionCountByYear,
  getAvailableYearsForSubject,
  getQuestionCountBySubjectAndYear,
  getQuestionsBySubjectAndYear,
} from '../../services/storageService';

describe('Storage Service - Basic CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getQuestions()', () => {
    it('moet alle vragen ophalen via dbQuestions', async () => {
      mockDbQuestions.getAll.mockResolvedValue(mockQuestions);

      const result = await getQuestions();

      expect(mockDbQuestions.getAll).toHaveBeenCalledOnce();
      expect(result).toEqual(mockQuestions);
    });

    it('moet error gooien als database niet beschikbaar is', async () => {
      // Temporarily set supabase to null
      const originalModule = await import('../../services/supabaseService');
      // The function checks supabase internally; we test via the mock
      mockDbQuestions.getAll.mockRejectedValue(new Error('Database niet beschikbaar'));

      await expect(getQuestions()).rejects.toThrow();
    });
  });

  describe('saveQuestion()', () => {
    it('moet vraag opslaan via dbQuestions', async () => {
      mockDbQuestions.save.mockResolvedValue(undefined);

      await saveQuestion(mockQuestions[0]);

      expect(mockDbQuestions.save).toHaveBeenCalledWith(mockQuestions[0]);
    });
  });

  describe('deleteQuestion()', () => {
    it('moet vraag verwijderen op ID', async () => {
      mockDbQuestions.delete.mockResolvedValue(undefined);

      await deleteQuestion('q-1');

      expect(mockDbQuestions.delete).toHaveBeenCalledWith('q-1');
    });
  });

  describe('saveResult()', () => {
    it('moet resultaat opslaan via dbResults', async () => {
      const result = {
        id: 'r-1',
        studentName: 'Jan',
        subject: 'Wiskunde A',
        score: 8,
        totalQuestions: 10,
        date: '2024-01-15',
        answers: [],
      };
      mockDbResults.save.mockResolvedValue(undefined);

      await saveResult(result as any);

      expect(mockDbResults.save).toHaveBeenCalledWith(result);
    });
  });
});

describe('Storage Service - deleteExam()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbQuestions.getAll.mockResolvedValue(mockQuestions);
  });

  it('moet alle vragen van een examen verwijderen', async () => {
    mockDbQuestions.delete.mockResolvedValue(undefined);
    mockImageStorage.deleteImage.mockResolvedValue(undefined);
    mockWorksheetStorage.deleteWorksheet.mockResolvedValue(undefined);

    const result = await deleteExam('Wiskunde A', 2024, 'HAVO');

    // q-1, q-2, q-3 match (Wiskunde A, 2024, HAVO)
    expect(result.deletedQuestions).toBe(3);
    expect(mockDbQuestions.delete).toHaveBeenCalledTimes(3);
  });

  it('moet bijbehorende afbeeldingen verwijderen', async () => {
    mockDbQuestions.delete.mockResolvedValue(undefined);
    mockImageStorage.deleteImage.mockResolvedValue(undefined);
    mockWorksheetStorage.deleteWorksheet.mockResolvedValue(undefined);

    const result = await deleteExam('Wiskunde A', 2024, 'HAVO');

    // q-1 has imageUrl
    expect(result.deletedImages).toBe(1);
    expect(mockImageStorage.deleteImage).toHaveBeenCalledWith(
      'https://test.supabase.co/storage/v1/object/public/exam-image/img1.jpg'
    );
  });

  it('moet bijbehorende worksheets en PDFs verwijderen', async () => {
    mockDbQuestions.delete.mockResolvedValue(undefined);
    mockImageStorage.deleteImage.mockResolvedValue(undefined);
    mockWorksheetStorage.deleteWorksheet.mockResolvedValue(undefined);

    const result = await deleteExam('Wiskunde A', 2024, 'HAVO');

    // q-2 has worksheetUrl, q-3 has examPdfUrl -> 2 unique worksheet URLs
    expect(result.deletedWorksheets).toBe(2);
  });

  it('moet 0 retourneren als geen vragen gevonden', async () => {
    const result = await deleteExam('Biologie', 2024, 'HAVO');

    expect(result.deletedQuestions).toBe(0);
    expect(result.deletedImages).toBe(0);
    expect(result.deletedWorksheets).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('moet errors verzamelen bij mislukte storage deletes', async () => {
    mockDbQuestions.delete.mockResolvedValue(undefined);
    mockImageStorage.deleteImage.mockRejectedValue(new Error('Delete failed'));
    mockWorksheetStorage.deleteWorksheet.mockResolvedValue(undefined);

    const result = await deleteExam('Wiskunde A', 2024, 'HAVO');

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Afbeelding niet verwijderd');
  });

  it('moet errors verzamelen bij mislukte vraag deletes', async () => {
    mockDbQuestions.delete.mockRejectedValue(new Error('DB error'));
    mockImageStorage.deleteImage.mockResolvedValue(undefined);
    mockWorksheetStorage.deleteWorksheet.mockResolvedValue(undefined);

    const result = await deleteExam('Wiskunde A', 2024, 'HAVO');

    expect(result.deletedQuestions).toBe(0);
    expect(result.errors.some(e => e.includes('Vraag niet verwijderd'))).toBe(true);
  });

  it('moet alleen vragen verwijderen die exact matchen op subject+year+level', async () => {
    mockDbQuestions.delete.mockResolvedValue(undefined);
    mockImageStorage.deleteImage.mockResolvedValue(undefined);
    mockWorksheetStorage.deleteWorksheet.mockResolvedValue(undefined);

    // VWO questions should not be deleted when filtering on HAVO
    const result = await deleteExam('Wiskunde A', 2024, 'VWO');

    expect(result.deletedQuestions).toBe(1); // Only q-4
    expect(mockDbQuestions.delete).toHaveBeenCalledWith('q-4');
  });

  it('moet geen externe URLs proberen te verwijderen', async () => {
    const questionsWithExternalUrl: Question[] = [
      {
        id: 'q-ext',
        type: 'MULTIPLE_CHOICE',
        subject: 'Engels',
        level: 'HAVO',
        text: 'Test',
        options: ['a', 'b'],
        correctIndex: 0,
        examYear: 2024,
        examType: 'official_exam',
        imageUrl: 'https://external-site.com/image.jpg', // Not a Supabase URL
      },
    ];
    mockDbQuestions.getAll.mockResolvedValue(questionsWithExternalUrl);
    mockDbQuestions.delete.mockResolvedValue(undefined);

    const result = await deleteExam('Engels', 2024, 'HAVO');

    expect(result.deletedImages).toBe(0);
    expect(mockImageStorage.deleteImage).not.toHaveBeenCalled();
  });
});

describe('Storage Service - Year-based Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbQuestions.getAll.mockResolvedValue(mockQuestions);
  });

  describe('getQuestionsByYear()', () => {
    it('moet vragen filteren op jaar', async () => {
      const result = await getQuestionsByYear(2024);

      expect(result.length).toBe(4); // q-1, q-2, q-3, q-4
      expect(result.every(q => q.examYear === 2024)).toBe(true);
    });

    it('moet vragen filteren op jaar en niveau', async () => {
      const result = await getQuestionsByYear(2024, 'HAVO');

      expect(result.length).toBe(3); // q-1, q-2, q-3
      expect(result.every(q => q.examYear === 2024 && q.level === 'HAVO')).toBe(true);
    });

    it('moet lege array retourneren als geen vragen gevonden', async () => {
      const result = await getQuestionsByYear(2020);

      expect(result).toHaveLength(0);
    });
  });

  describe('getAvailableYears()', () => {
    it('moet unieke jaren retourneren in aflopende volgorde', async () => {
      const result = await getAvailableYears();

      expect(result).toEqual([2024, 2023]);
    });

    it('moet vragen zonder examYear uitsluiten', async () => {
      const result = await getAvailableYears();

      // q-6 has no examYear, should not create an entry
      expect(result).not.toContain(undefined);
      expect(result).not.toContain(null);
    });
  });

  describe('getQuestionCountByYear()', () => {
    it('moet correct aantal vragen retourneren per jaar', async () => {
      const count = await getQuestionCountByYear(2024);

      expect(count).toBe(4);
    });

    it('moet filteren op niveau', async () => {
      const count = await getQuestionCountByYear(2024, 'VWO');

      expect(count).toBe(1);
    });
  });

  describe('getAvailableYearsForSubject()', () => {
    it('moet jaren retourneren voor specifiek vak', async () => {
      const result = await getAvailableYearsForSubject('Wiskunde A');

      expect(result).toEqual([2024]);
    });

    it('moet jaren filteren op vak en niveau', async () => {
      const result = await getAvailableYearsForSubject('Wiskunde A', 'HAVO');

      expect(result).toEqual([2024]);
    });

    it('moet lege array retourneren voor vak zonder vragen', async () => {
      const result = await getAvailableYearsForSubject('Biologie');

      expect(result).toHaveLength(0);
    });
  });

  describe('getQuestionCountBySubjectAndYear()', () => {
    it('moet correct aantal vragen per vak en jaar retourneren', async () => {
      const count = await getQuestionCountBySubjectAndYear('Wiskunde A', 2024);

      expect(count).toBe(4); // q-1, q-2, q-3, q-4 (all Wiskunde A, 2024)
    });

    it('moet filteren op vak, jaar en niveau', async () => {
      const count = await getQuestionCountBySubjectAndYear('Wiskunde A', 2024, 'HAVO');

      expect(count).toBe(3);
    });
  });

  describe('getQuestionsBySubjectAndYear()', () => {
    it('moet vragen retourneren per vak en jaar', async () => {
      const result = await getQuestionsBySubjectAndYear('Geschiedenis', 2023);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('q-5');
    });

    it('moet filteren op vak, jaar en niveau', async () => {
      const result = await getQuestionsBySubjectAndYear('Wiskunde A', 2024, 'VWO');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('q-4');
    });
  });
});
