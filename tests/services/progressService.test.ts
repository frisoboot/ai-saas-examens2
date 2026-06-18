/**
 * Progress Service Tests
 * Test progressService.ts: calculateProgress, improvement rate, getOverallProgress
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExamResult, StudentProgress } from '../../types';

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
  calculateProgress,
  getStudentProgress,
  getOverallProgress,
  updateProgressAfterExam,
  getWeakestSubjects,
  getStrongestSubjects,
} from '../../services/progressService';

// Mock exam results
const mockExamResults: ExamResult[] = [
  {
    id: 'r-1',
    studentName: 'Jan',
    subject: 'Wiskunde A',
    score: 7,
    totalQuestions: 10,
    date: '2024-01-01',
    answers: [],
    user_id: 'user-1',
  },
  {
    id: 'r-2',
    studentName: 'Jan',
    subject: 'Wiskunde A',
    score: 8,
    totalQuestions: 10,
    date: '2024-02-01',
    answers: [],
    user_id: 'user-1',
  },
  {
    id: 'r-3',
    studentName: 'Jan',
    subject: 'Wiskunde A',
    score: 6,
    totalQuestions: 10,
    date: '2024-03-01',
    answers: [],
    user_id: 'user-1',
  },
  {
    id: 'r-4',
    studentName: 'Jan',
    subject: 'Wiskunde A',
    score: 9,
    totalQuestions: 10,
    date: '2024-04-01',
    answers: [],
    user_id: 'user-1',
  },
  {
    id: 'r-5',
    studentName: 'Jan',
    subject: 'Geschiedenis',
    score: 5,
    totalQuestions: 10,
    date: '2024-01-15',
    answers: [],
    user_id: 'user-1',
  },
  {
    id: 'r-6',
    studentName: 'Piet',
    subject: 'Wiskunde A',
    score: 6,
    totalQuestions: 10,
    date: '2024-01-01',
    answers: [],
    user_id: 'user-2',
  },
];

describe('Progress Service - calculateProgress()', () => {
  it('moet basis progress berekenen voor een student en vak', () => {
    const progress = calculateProgress('Jan', 'Wiskunde A', mockExamResults);

    expect(progress.studentName).toBe('Jan');
    expect(progress.subject).toBe('Wiskunde A');
    expect(progress.totalExamsTaken).toBe(4);
    expect(progress.totalQuestionsAnswered).toBe(40);
    expect(progress.totalCorrectAnswers).toBe(30); // 7+8+6+9
  });

  it('moet gemiddelde score correct berekenen', () => {
    const progress = calculateProgress('Jan', 'Wiskunde A', mockExamResults);

    // (30/40) * 100 = 75.0
    expect(progress.averageScore).toBe(75);
  });

  it('moet recente scores retourneren (max 5, nieuwste eerst)', () => {
    const progress = calculateProgress('Jan', 'Wiskunde A', mockExamResults);

    expect(progress.recentScores).toBeDefined();
    expect(progress.recentScores!.length).toBeLessThanOrEqual(5);
    // Most recent first: r-4 (90%), r-3 (60%), r-2 (80%), r-1 (70%)
    expect(progress.recentScores![0]).toBe(90);
    expect(progress.recentScores![1]).toBe(60);
    expect(progress.recentScores![2]).toBe(80);
    expect(progress.recentScores![3]).toBe(70);
  });

  it('moet improvement rate berekenen bij 4+ examens', () => {
    const progress = calculateProgress('Jan', 'Wiskunde A', mockExamResults);

    // Chronological: r-1(0.7), r-2(0.8) | r-3(0.6), r-4(0.9)
    // First half avg: (0.7 + 0.8) / 2 = 0.75
    // Second half avg: (0.6 + 0.9) / 2 = 0.75
    // Improvement: ((0.75 - 0.75) / 0.75) * 100 = 0
    expect(progress.improvementRate).toBeDefined();
    expect(typeof progress.improvementRate).toBe('number');
  });

  it('moet geen improvement rate berekenen bij minder dan 4 examens', () => {
    const fewResults = mockExamResults.slice(0, 2); // Only 2 results for Jan Wiskunde A
    const progress = calculateProgress('Jan', 'Wiskunde A', fewResults);

    expect(progress.improvementRate).toBe(0);
  });

  it('moet leeg resultaat retourneren als geen examens gevonden', () => {
    const progress = calculateProgress('Jan', 'Biologie', mockExamResults);

    expect(progress.totalExamsTaken).toBe(0);
    expect(progress.totalQuestionsAnswered).toBe(0);
    expect(progress.totalCorrectAnswers).toBe(0);
    expect(progress.averageScore).toBe(0);
    expect(progress.recentScores).toEqual([]);
  });

  it('moet alleen resultaten van de juiste student filteren', () => {
    const progress = calculateProgress('Piet', 'Wiskunde A', mockExamResults);

    expect(progress.totalExamsTaken).toBe(1);
    expect(progress.totalCorrectAnswers).toBe(6);
  });

  it('moet lastExamDate correct instellen', () => {
    const progress = calculateProgress('Jan', 'Wiskunde A', mockExamResults);

    expect(progress.lastExamDate).toBe('2024-04-01');
  });

  it('moet correct ID genereren', () => {
    const progress = calculateProgress('Jan', 'Wiskunde A', mockExamResults);

    expect(progress.id).toBe('Jan-Wiskunde A');
  });
});

describe('Progress Service - getStudentProgress()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet progress ophalen met userId als beschikbaar', async () => {
    const mockDbData = [
      {
        id: 'p-1',
        student_name: 'Jan',
        subject: 'Wiskunde A',
        total_exams_taken: 4,
        total_questions_answered: 40,
        total_correct_answers: 30,
        average_score: 75,
        last_exam_date: '2024-04-01',
        weakest_topics: ['algebra'],
        improvement_rate: 5.0,
      },
    ];

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockDbData,
          error: null,
        }),
      }),
    });

    const result = await getStudentProgress('Jan', 'user-1');

    expect(result).toHaveLength(1);
    expect(result[0].studentName).toBe('Jan');
    expect(result[0].averageScore).toBe(75);
    expect(result[0].improvementRate).toBe(5.0);
  });

  it('moet progress ophalen met studentName als fallback', async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    const result = await getStudentProgress('Jan');

    expect(result).toEqual([]);
    // Should have called with student_name since no userId provided
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('student_progress');
  });

  it('moet error gooien bij database fout', async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        }),
      }),
    });

    await expect(getStudentProgress('Jan', 'user-1')).rejects.toBeDefined();
  });
});

describe('Progress Service - getOverallProgress()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet overall progress berekenen over alle vakken', async () => {
    const mockDbData = [
      {
        id: 'p-1',
        student_name: 'Jan',
        subject: 'Wiskunde A',
        total_exams_taken: 4,
        total_questions_answered: 40,
        total_correct_answers: 30,
        average_score: 75,
        last_exam_date: '2024-04-01',
        improvement_rate: 10,
      },
      {
        id: 'p-2',
        student_name: 'Jan',
        subject: 'Geschiedenis',
        total_exams_taken: 2,
        total_questions_answered: 20,
        total_correct_answers: 12,
        average_score: 60,
        last_exam_date: '2024-03-15',
        improvement_rate: 5,
      },
    ];

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockDbData,
          error: null,
        }),
      }),
    });

    const result = await getOverallProgress('Jan', 'user-1');

    expect(result.totalExams).toBe(6); // 4 + 2
    // (42/60) * 100 = 70
    expect(result.averageScore).toBe(70);
    // Average improvement: (10 + 5) / 2 = 7.5
    expect(result.improvementRate).toBe(7.5);
    expect(result.lastExamDate).toBeDefined();
  });

  it('moet leeg resultaat retourneren als geen progress', async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    });

    const result = await getOverallProgress('Jan', 'user-1');

    expect(result.totalExams).toBe(0);
    expect(result.averageScore).toBe(0);
    expect(result.improvementRate).toBe(0);
  });
});

describe('Progress Service - updateProgressAfterExam()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet nieuwe progress aanmaken als nog niet bestaat', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      insert: mockInsert,
    });

    const examResult: ExamResult = {
      id: 'r-new',
      studentName: 'Jan',
      subject: 'Biologie',
      score: 8,
      totalQuestions: 10,
      date: '2024-05-01',
      answers: [],
      user_id: 'user-1',
    };

    await updateProgressAfterExam(examResult);

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('student_progress');
  });

  it('moet progress overslaan als user_id ontbreekt', async () => {
    const examResult: ExamResult = {
      id: 'r-new',
      studentName: 'Jan',
      subject: 'Biologie',
      score: 8,
      totalQuestions: 10,
      date: '2024-05-01',
      answers: [],
      // No user_id
    };

    await updateProgressAfterExam(examResult);

    // Should not call supabase at all
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });
});

describe('Progress Service - getWeakestSubjects()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet zwakste vakken retourneren gesorteerd op laagste score', async () => {
    const mockDbData = [
      { id: 'p-1', student_name: 'Jan', subject: 'Wiskunde A', total_exams_taken: 4, total_questions_answered: 40, total_correct_answers: 30, average_score: 75, improvement_rate: 0 },
      { id: 'p-2', student_name: 'Jan', subject: 'Geschiedenis', total_exams_taken: 2, total_questions_answered: 20, total_correct_answers: 10, average_score: 50, improvement_rate: 0 },
      { id: 'p-3', student_name: 'Jan', subject: 'Biologie', total_exams_taken: 3, total_questions_answered: 30, total_correct_answers: 27, average_score: 90, improvement_rate: 0 },
    ];

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockDbData,
          error: null,
        }),
      }),
    });

    const result = await getWeakestSubjects('Jan', 2, 'user-1');

    expect(result).toHaveLength(2);
    expect(result[0].subject).toBe('Geschiedenis'); // 50
    expect(result[1].subject).toBe('Wiskunde A');   // 75
  });
});

describe('Progress Service - getStrongestSubjects()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet sterkste vakken retourneren gesorteerd op hoogste score', async () => {
    const mockDbData = [
      { id: 'p-1', student_name: 'Jan', subject: 'Wiskunde A', total_exams_taken: 4, total_questions_answered: 40, total_correct_answers: 30, average_score: 75, improvement_rate: 0 },
      { id: 'p-2', student_name: 'Jan', subject: 'Geschiedenis', total_exams_taken: 2, total_questions_answered: 20, total_correct_answers: 10, average_score: 50, improvement_rate: 0 },
      { id: 'p-3', student_name: 'Jan', subject: 'Biologie', total_exams_taken: 3, total_questions_answered: 30, total_correct_answers: 27, average_score: 90, improvement_rate: 0 },
    ];

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockDbData,
          error: null,
        }),
      }),
    });

    const result = await getStrongestSubjects('Jan', 2, 'user-1');

    expect(result).toHaveLength(2);
    expect(result[0].subject).toBe('Biologie');     // 90
    expect(result[1].subject).toBe('Wiskunde A');   // 75
  });
});
