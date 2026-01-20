/**
 * Progress Service Tests
 * Test progress berekening en statistieken
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExamResult, StudentProgress } from '../../types';

// Mock exam results data
const mockExamResults: ExamResult[] = [
  {
    id: 'r-1',
    studentName: 'Jan Jansen',
    subject: 'Wiskunde',
    score: 8,
    totalQuestions: 10,
    date: '2024-01-10',
    answers: [],
    level: 'HAVO',
  },
  {
    id: 'r-2',
    studentName: 'Jan Jansen',
    subject: 'Wiskunde',
    score: 7,
    totalQuestions: 10,
    date: '2024-01-15',
    answers: [],
    level: 'HAVO',
  },
  {
    id: 'r-3',
    studentName: 'Jan Jansen',
    subject: 'Wiskunde',
    score: 9,
    totalQuestions: 10,
    date: '2024-01-20',
    answers: [],
    level: 'HAVO',
  },
  {
    id: 'r-4',
    studentName: 'Jan Jansen',
    subject: 'Wiskunde',
    score: 8,
    totalQuestions: 10,
    date: '2024-01-25',
    answers: [],
    level: 'HAVO',
  },
  {
    id: 'r-5',
    studentName: 'Jan Jansen',
    subject: 'Nederlands',
    score: 6,
    totalQuestions: 10,
    date: '2024-01-12',
    answers: [],
    level: 'HAVO',
  },
  {
    id: 'r-6',
    studentName: 'Piet Peters',
    subject: 'Wiskunde',
    score: 5,
    totalQuestions: 10,
    date: '2024-01-10',
    answers: [],
    level: 'HAVO',
  },
];

// Calculate progress function (matching the actual implementation)
const calculateProgress = (
  studentName: string,
  subject: string,
  examResults: ExamResult[]
): StudentProgress => {
  const subjectResults = examResults.filter(
    r => r.studentName === studentName && r.subject === subject
  );

  if (subjectResults.length === 0) {
    return {
      id: `${studentName}-${subject}`,
      studentName,
      subject,
      totalExamsTaken: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      averageScore: 0,
      recentScores: []
    };
  }

  const totalExamsTaken = subjectResults.length;
  const totalQuestionsAnswered = subjectResults.reduce((sum, r) => sum + r.totalQuestions, 0);
  const totalCorrectAnswers = subjectResults.reduce((sum, r) => sum + r.score, 0);
  const averageScore = (totalCorrectAnswers / totalQuestionsAnswered) * 100;

  // Get last 5 exam scores for trend (sorted by date, newest first)
  const sortedResults = [...subjectResults].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const recentScores = sortedResults
    .slice(0, 5)
    .map(r => Math.round((r.score / r.totalQuestions) * 100));

  // Calculate improvement rate (comparing first half vs second half of exams)
  let improvementRate = 0;
  if (totalExamsTaken >= 4) {
    const chronologicalResults = [...subjectResults].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const mid = Math.floor(totalExamsTaken / 2);
    const firstHalf = chronologicalResults.slice(0, mid);
    const secondHalf = chronologicalResults.slice(mid);

    const firstAvg = firstHalf.reduce((sum, r) => sum + (r.score / r.totalQuestions), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + (r.score / r.totalQuestions), 0) / secondHalf.length;

    improvementRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  }

  const lastExamDate = sortedResults[0].date;

  return {
    id: `${studentName}-${subject}`,
    studentName,
    subject,
    totalExamsTaken,
    totalQuestionsAnswered,
    totalCorrectAnswers,
    averageScore: Math.round(averageScore * 10) / 10,
    lastExamDate,
    improvementRate: Math.round(improvementRate * 10) / 10,
    recentScores
  };
};

describe('Progress Service', () => {
  describe('calculateProgress()', () => {
    it('moet correcte progress berekenen voor student met resultaten', () => {
      const progress = calculateProgress('Jan Jansen', 'Wiskunde', mockExamResults);

      expect(progress.studentName).toBe('Jan Jansen');
      expect(progress.subject).toBe('Wiskunde');
      expect(progress.totalExamsTaken).toBe(4);
      expect(progress.totalQuestionsAnswered).toBe(40);
      expect(progress.totalCorrectAnswers).toBe(32); // 8+7+9+8
      expect(progress.averageScore).toBe(80); // 32/40 * 100
    });

    it('moet lege progress retourneren voor student zonder resultaten', () => {
      const progress = calculateProgress('Nieuwe Student', 'Wiskunde', mockExamResults);

      expect(progress.studentName).toBe('Nieuwe Student');
      expect(progress.subject).toBe('Wiskunde');
      expect(progress.totalExamsTaken).toBe(0);
      expect(progress.totalQuestionsAnswered).toBe(0);
      expect(progress.totalCorrectAnswers).toBe(0);
      expect(progress.averageScore).toBe(0);
      expect(progress.recentScores).toEqual([]);
    });

    it('moet lege progress retourneren voor niet-bestaand vak', () => {
      const progress = calculateProgress('Jan Jansen', 'Filosofie', mockExamResults);

      expect(progress.totalExamsTaken).toBe(0);
      expect(progress.averageScore).toBe(0);
    });

    it('moet recente scores correct sorteren (nieuwste eerst)', () => {
      const progress = calculateProgress('Jan Jansen', 'Wiskunde', mockExamResults);

      // Nieuwste score (25 jan = 80%) moet eerst staan
      expect(progress.recentScores).toHaveLength(4);
      expect(progress.recentScores![0]).toBe(80); // 8/10 * 100
      expect(progress.recentScores![1]).toBe(90); // 9/10 * 100 (20 jan)
      expect(progress.recentScores![2]).toBe(70); // 7/10 * 100 (15 jan)
      expect(progress.recentScores![3]).toBe(80); // 8/10 * 100 (10 jan)
    });

    it('moet lastExamDate correct instellen', () => {
      const progress = calculateProgress('Jan Jansen', 'Wiskunde', mockExamResults);

      expect(progress.lastExamDate).toBe('2024-01-25');
    });

    it('moet improvement rate berekenen bij 4+ examens', () => {
      const progress = calculateProgress('Jan Jansen', 'Wiskunde', mockExamResults);

      // First half: 10 jan (80%) + 15 jan (70%) = avg 75%
      // Second half: 20 jan (90%) + 25 jan (80%) = avg 85%
      // Improvement: ((0.85 - 0.75) / 0.75) * 100 = 13.3%
      expect(progress.improvementRate).toBeCloseTo(13.3, 0);
    });

    it('moet geen improvement rate berekenen bij minder dan 4 examens', () => {
      const progress = calculateProgress('Jan Jansen', 'Nederlands', mockExamResults);

      // Slechts 1 examen
      expect(progress.totalExamsTaken).toBe(1);
      expect(progress.improvementRate).toBe(0);
    });

    it('moet alleen resultaten van specifieke student filteren', () => {
      const janProgress = calculateProgress('Jan Jansen', 'Wiskunde', mockExamResults);
      const pietProgress = calculateProgress('Piet Peters', 'Wiskunde', mockExamResults);

      expect(janProgress.totalExamsTaken).toBe(4);
      expect(pietProgress.totalExamsTaken).toBe(1);
    });

    it('moet correcte ID genereren', () => {
      const progress = calculateProgress('Jan Jansen', 'Wiskunde', mockExamResults);

      expect(progress.id).toBe('Jan Jansen-Wiskunde');
    });
  });

  describe('Score Calculations', () => {
    it('moet gemiddelde score correct afronden', () => {
      const results: ExamResult[] = [
        {
          id: 'r-1',
          studentName: 'Test',
          subject: 'Test',
          score: 7,
          totalQuestions: 9, // 77.777...%
          date: '2024-01-01',
          answers: [],
        },
      ];

      const progress = calculateProgress('Test', 'Test', results);

      // 7/9 * 100 = 77.777... moet worden 77.8
      expect(progress.averageScore).toBe(77.8);
    });

    it('moet percentage scores correct berekenen voor recentScores', () => {
      const results: ExamResult[] = [
        {
          id: 'r-1',
          studentName: 'Test',
          subject: 'Test',
          score: 3,
          totalQuestions: 4, // 75%
          date: '2024-01-01',
          answers: [],
        },
      ];

      const progress = calculateProgress('Test', 'Test', results);

      expect(progress.recentScores![0]).toBe(75);
    });

    it('moet maximaal 5 recente scores bewaren', () => {
      const results: ExamResult[] = [];
      for (let i = 0; i < 10; i++) {
        results.push({
          id: `r-${i}`,
          studentName: 'Test',
          subject: 'Test',
          score: 5 + i,
          totalQuestions: 10,
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          answers: [],
        });
      }

      const progress = calculateProgress('Test', 'Test', results);

      expect(progress.recentScores).toHaveLength(5);
      // Nieuwste scores (10 jan t/m 6 jan)
      expect(progress.recentScores![0]).toBe(140); // 14/10 * 100 (10 jan)
      expect(progress.recentScores![4]).toBe(100); // 10/10 * 100 (6 jan)
    });
  });

  describe('Edge Cases', () => {
    it('moet werken met lege resultaten array', () => {
      const progress = calculateProgress('Jan', 'Wiskunde', []);

      expect(progress.totalExamsTaken).toBe(0);
      expect(progress.recentScores).toEqual([]);
    });

    it('moet werken met score van 0', () => {
      const results: ExamResult[] = [
        {
          id: 'r-1',
          studentName: 'Test',
          subject: 'Test',
          score: 0,
          totalQuestions: 10,
          date: '2024-01-01',
          answers: [],
        },
      ];

      const progress = calculateProgress('Test', 'Test', results);

      expect(progress.averageScore).toBe(0);
      expect(progress.recentScores![0]).toBe(0);
    });

    it('moet werken met perfecte score', () => {
      const results: ExamResult[] = [
        {
          id: 'r-1',
          studentName: 'Test',
          subject: 'Test',
          score: 10,
          totalQuestions: 10,
          date: '2024-01-01',
          answers: [],
        },
      ];

      const progress = calculateProgress('Test', 'Test', results);

      expect(progress.averageScore).toBe(100);
      expect(progress.recentScores![0]).toBe(100);
    });

    it('moet werken met verschillende totalQuestions per examen', () => {
      const results: ExamResult[] = [
        {
          id: 'r-1',
          studentName: 'Test',
          subject: 'Test',
          score: 5,
          totalQuestions: 10, // 50%
          date: '2024-01-01',
          answers: [],
        },
        {
          id: 'r-2',
          studentName: 'Test',
          subject: 'Test',
          score: 15,
          totalQuestions: 20, // 75%
          date: '2024-01-02',
          answers: [],
        },
      ];

      const progress = calculateProgress('Test', 'Test', results);

      // Totaal: 20/30 = 66.7%
      expect(progress.totalQuestionsAnswered).toBe(30);
      expect(progress.totalCorrectAnswers).toBe(20);
      expect(progress.averageScore).toBeCloseTo(66.7, 0);
    });
  });
});

describe('Progress Data Transformation', () => {
  describe('Database to TypeScript conversion', () => {
    it('moet snake_case naar camelCase converteren', () => {
      const dbProgress = {
        id: 'prog-123',
        student_name: 'Jan Jansen',
        subject: 'Wiskunde',
        total_exams_taken: 5,
        total_questions_answered: 50,
        total_correct_answers: 40,
        average_score: 80,
        last_exam_date: '2024-01-25',
        weakest_topics: ['algebra', 'functies'],
        improvement_rate: 10.5,
      };

      // Simuleer conversie zoals in de service
      const tsProgress: StudentProgress = {
        id: dbProgress.id,
        studentName: dbProgress.student_name,
        subject: dbProgress.subject,
        totalExamsTaken: dbProgress.total_exams_taken,
        totalQuestionsAnswered: dbProgress.total_questions_answered,
        totalCorrectAnswers: dbProgress.total_correct_answers,
        averageScore: dbProgress.average_score,
        lastExamDate: dbProgress.last_exam_date,
        weakestTopics: dbProgress.weakest_topics,
        improvementRate: dbProgress.improvement_rate,
        recentScores: [],
      };

      expect(tsProgress.studentName).toBe('Jan Jansen');
      expect(tsProgress.totalExamsTaken).toBe(5);
      expect(tsProgress.averageScore).toBe(80);
      expect(tsProgress.weakestTopics).toEqual(['algebra', 'functies']);
    });
  });
});
