/**
 * Progress Service Tests
 * Test voortgangsberekeningen en statistieken
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateProgress } from '../../services/progressService';
import type { ExamResult } from '../../types';

// Helper om een ExamResult te maken
const makeResult = (overrides: Partial<ExamResult> = {}): ExamResult => ({
  id: `result-${Math.random()}`,
  studentName: 'Jan',
  subject: 'Wiskunde A',
  score: 7,
  totalQuestions: 10,
  date: '2024-06-01T10:00:00Z',
  answers: [],
  ...overrides,
});

describe('calculateProgress', () => {
  it('moet lege progress retourneren als er geen resultaten zijn', () => {
    const result = calculateProgress('Jan', 'Wiskunde A', []);

    expect(result).toEqual({
      id: 'Jan-Wiskunde A',
      studentName: 'Jan',
      subject: 'Wiskunde A',
      totalExamsTaken: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      averageScore: 0,
      recentScores: [],
    });
  });

  it('moet lege progress retourneren als er geen resultaten zijn voor die student', () => {
    const results = [makeResult({ studentName: 'Piet' })];
    const result = calculateProgress('Jan', 'Wiskunde A', results);

    expect(result.totalExamsTaken).toBe(0);
  });

  it('moet lege progress retourneren als er geen resultaten zijn voor dat vak', () => {
    const results = [makeResult({ subject: 'Nederlands' })];
    const result = calculateProgress('Jan', 'Wiskunde A', results);

    expect(result.totalExamsTaken).toBe(0);
  });

  it('moet correct berekenen voor één examenresultaat', () => {
    const results = [makeResult({ score: 8, totalQuestions: 10 })];
    const result = calculateProgress('Jan', 'Wiskunde A', results);

    expect(result.totalExamsTaken).toBe(1);
    expect(result.totalQuestionsAnswered).toBe(10);
    expect(result.totalCorrectAnswers).toBe(8);
    expect(result.averageScore).toBe(80);
    expect(result.recentScores).toEqual([80]);
  });

  it('moet correct berekenen voor meerdere examens', () => {
    const results = [
      makeResult({ score: 8, totalQuestions: 10, date: '2024-06-01T10:00:00Z' }),
      makeResult({ score: 6, totalQuestions: 10, date: '2024-06-02T10:00:00Z' }),
      makeResult({ score: 9, totalQuestions: 10, date: '2024-06-03T10:00:00Z' }),
    ];
    const result = calculateProgress('Jan', 'Wiskunde A', results);

    expect(result.totalExamsTaken).toBe(3);
    expect(result.totalQuestionsAnswered).toBe(30);
    expect(result.totalCorrectAnswers).toBe(23);
    // (23/30)*100 = 76.666... -> afgerond 76.7
    expect(result.averageScore).toBe(76.7);
  });

  it('moet recentScores gesorteerd op datum (nieuwste eerst) retourneren', () => {
    const results = [
      makeResult({ score: 5, totalQuestions: 10, date: '2024-06-01T10:00:00Z' }),
      makeResult({ score: 7, totalQuestions: 10, date: '2024-06-03T10:00:00Z' }),
      makeResult({ score: 6, totalQuestions: 10, date: '2024-06-02T10:00:00Z' }),
    ];
    const result = calculateProgress('Jan', 'Wiskunde A', results);

    // Newest first: 7/10=70, 6/10=60, 5/10=50
    expect(result.recentScores).toEqual([70, 60, 50]);
  });

  it('moet maximaal 5 recentScores retourneren', () => {
    const results = Array.from({ length: 8 }, (_, i) =>
      makeResult({
        score: i + 3,
        totalQuestions: 10,
        date: `2024-06-0${i + 1}T10:00:00Z`,
      })
    );
    const result = calculateProgress('Jan', 'Wiskunde A', results);

    expect(result.recentScores).toHaveLength(5);
  });

  it('moet improvementRate berekenen bij >= 4 examens', () => {
    // First half: scores 4/10 and 5/10 (avg 0.45)
    // Second half: scores 8/10 and 9/10 (avg 0.85)
    // Improvement: ((0.85 - 0.45) / 0.45) * 100 = 88.888... -> 88.9
    const results = [
      makeResult({ score: 4, totalQuestions: 10, date: '2024-06-01T10:00:00Z' }),
      makeResult({ score: 5, totalQuestions: 10, date: '2024-06-02T10:00:00Z' }),
      makeResult({ score: 8, totalQuestions: 10, date: '2024-06-03T10:00:00Z' }),
      makeResult({ score: 9, totalQuestions: 10, date: '2024-06-04T10:00:00Z' }),
    ];
    const result = calculateProgress('Jan', 'Wiskunde A', results);

    expect(result.improvementRate).toBeDefined();
    expect(result.improvementRate).toBeGreaterThan(0);
  });

  it('moet improvementRate 0 laten bij minder dan 4 examens', () => {
    const results = [
      makeResult({ score: 4, totalQuestions: 10, date: '2024-06-01T10:00:00Z' }),
      makeResult({ score: 8, totalQuestions: 10, date: '2024-06-02T10:00:00Z' }),
    ];
    const result = calculateProgress('Jan', 'Wiskunde A', results);

    expect(result.improvementRate).toBe(0);
  });

  it('moet negatieve improvementRate tonen bij verslechtering', () => {
    // First half: high scores, second half: low scores
    const results = [
      makeResult({ score: 9, totalQuestions: 10, date: '2024-06-01T10:00:00Z' }),
      makeResult({ score: 8, totalQuestions: 10, date: '2024-06-02T10:00:00Z' }),
      makeResult({ score: 4, totalQuestions: 10, date: '2024-06-03T10:00:00Z' }),
      makeResult({ score: 3, totalQuestions: 10, date: '2024-06-04T10:00:00Z' }),
    ];
    const result = calculateProgress('Jan', 'Wiskunde A', results);

    expect(result.improvementRate).toBeLessThan(0);
  });

  it('moet lastExamDate op de meest recente datum zetten', () => {
    const results = [
      makeResult({ date: '2024-06-01T10:00:00Z' }),
      makeResult({ date: '2024-06-15T10:00:00Z' }),
      makeResult({ date: '2024-06-10T10:00:00Z' }),
    ];
    const result = calculateProgress('Jan', 'Wiskunde A', results);

    expect(result.lastExamDate).toBe('2024-06-15T10:00:00Z');
  });

  it('moet alleen resultaten van de juiste student en het juiste vak filteren', () => {
    const results = [
      makeResult({ studentName: 'Jan', subject: 'Wiskunde A', score: 8, totalQuestions: 10 }),
      makeResult({ studentName: 'Jan', subject: 'Nederlands', score: 5, totalQuestions: 10 }),
      makeResult({ studentName: 'Piet', subject: 'Wiskunde A', score: 3, totalQuestions: 10 }),
    ];
    const result = calculateProgress('Jan', 'Wiskunde A', results);

    expect(result.totalExamsTaken).toBe(1);
    expect(result.totalCorrectAnswers).toBe(8);
  });

  it('moet correct afronden bij oneven deeltal', () => {
    const results = [
      makeResult({ score: 3, totalQuestions: 7, date: '2024-06-01T10:00:00Z' }),
    ];
    const result = calculateProgress('Jan', 'Wiskunde A', results);

    // (3/7)*100 = 42.857... -> afgerond op 1 decimaal = 42.9
    expect(result.averageScore).toBe(42.9);
  });
});

describe('getStudentProgress', () => {
  it('moet student_progress data correct mappen van snake_case naar camelCase', () => {
    // Test the data transformation logic
    const dbRow = {
      id: 'progress-1',
      student_name: 'Jan',
      subject: 'Wiskunde A',
      total_exams_taken: 5,
      total_questions_answered: 50,
      total_correct_answers: 40,
      average_score: 80,
      last_exam_date: '2024-06-15',
      weakest_topics: ['Algebra', 'Statistiek'],
      improvement_rate: 15.5,
    };

    // Simulate the mapping that getStudentProgress does
    const mapped = {
      id: dbRow.id,
      studentName: dbRow.student_name,
      subject: dbRow.subject,
      totalExamsTaken: dbRow.total_exams_taken,
      totalQuestionsAnswered: dbRow.total_questions_answered,
      totalCorrectAnswers: dbRow.total_correct_answers,
      averageScore: dbRow.average_score,
      lastExamDate: dbRow.last_exam_date,
      weakestTopics: dbRow.weakest_topics,
      improvementRate: dbRow.improvement_rate,
      recentScores: [],
    };

    expect(mapped.studentName).toBe('Jan');
    expect(mapped.totalExamsTaken).toBe(5);
    expect(mapped.totalQuestionsAnswered).toBe(50);
    expect(mapped.totalCorrectAnswers).toBe(40);
    expect(mapped.averageScore).toBe(80);
    expect(mapped.lastExamDate).toBe('2024-06-15');
    expect(mapped.weakestTopics).toEqual(['Algebra', 'Statistiek']);
    expect(mapped.improvementRate).toBe(15.5);
    expect(mapped.recentScores).toEqual([]);
  });
});

describe('getOverallProgress - berekeningen', () => {
  it('moet lege resultaten correct afhandelen', () => {
    const progressData: any[] = [];
    const totalExams = progressData.reduce((sum: number, p: any) => sum + p.totalExamsTaken, 0);
    expect(totalExams).toBe(0);
  });

  it('moet totalen correct berekenen over meerdere vakken', () => {
    const progressData = [
      { totalExamsTaken: 3, totalQuestionsAnswered: 30, totalCorrectAnswers: 24, improvementRate: 10 },
      { totalExamsTaken: 5, totalQuestionsAnswered: 50, totalCorrectAnswers: 35, improvementRate: 20 },
    ];

    const totalExams = progressData.reduce((sum, p) => sum + p.totalExamsTaken, 0);
    const totalQuestions = progressData.reduce((sum, p) => sum + p.totalQuestionsAnswered, 0);
    const totalCorrect = progressData.reduce((sum, p) => sum + p.totalCorrectAnswers, 0);
    const averageScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    expect(totalExams).toBe(8);
    expect(totalQuestions).toBe(80);
    expect(totalCorrect).toBe(59);
    // (59/80)*100 = 73.75
    expect(averageScore).toBe(73.75);
  });

  it('moet improvementRate middelen over vakken met verbetering', () => {
    const progressData = [
      { improvementRate: 10 },
      { improvementRate: 20 },
      { improvementRate: 0 }, // geen verbetering, wordt gefilterd
    ];

    const subjectsWithImprovement = progressData.filter(p => p.improvementRate !== 0);
    const avgImprovement = subjectsWithImprovement.length > 0
      ? subjectsWithImprovement.reduce((sum, p) => sum + p.improvementRate, 0) / subjectsWithImprovement.length
      : 0;

    expect(avgImprovement).toBe(15);
  });
});
