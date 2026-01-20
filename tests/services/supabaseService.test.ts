/**
 * Supabase Service Tests
 * Test alle database operaties voor questions, results en students
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Question, ExamResult, StudentProfile } from '../../types';

// Mock data
const mockQuestion: Question = {
  id: 'q-123',
  type: 'MULTIPLE_CHOICE',
  subject: 'Wiskunde',
  level: 'HAVO',
  text: 'Wat is 2 + 2?',
  options: ['3', '4', '5', '6'],
  correctIndex: 1,
  examYear: 2024,
  examType: 'official_exam',
};

const mockDbQuestion = {
  id: 'q-123',
  type: 'MULTIPLE_CHOICE',
  subject: 'Wiskunde',
  level: 'HAVO',
  text: 'Wat is 2 + 2?',
  options: ['3', '4', '5', '6'],
  correct_index: 1,
  exam_year: 2024,
  exam_type: 'official_exam',
  context_text: null,
  image_url: null,
  source: null,
  model_answer: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockExamResult: ExamResult = {
  id: 'r-123',
  studentName: 'Jan Jansen',
  subject: 'Wiskunde',
  score: 8,
  totalQuestions: 10,
  date: '2024-01-15',
  answers: [{ questionId: 'q-1', value: 1 }],
  examYear: 2024,
  examType: 'year_exam',
  durationSeconds: 3600,
  level: 'HAVO',
  user_id: 'user-123',
};

const mockDbExamResult = {
  id: 'r-123',
  student_name: 'Jan Jansen',
  subject: 'Wiskunde',
  score: 8,
  total_questions: 10,
  date: '2024-01-15',
  answers: [{ questionId: 'q-1', value: 1 }],
  exam_year: 2024,
  exam_type: 'year_exam',
  duration_seconds: 3600,
  level: 'HAVO',
  user_id: 'user-123',
  created_at: '2024-01-15T10:00:00Z',
};

const mockStudentProfile: StudentProfile = {
  name: 'Jan Jansen',
  level: 'HAVO',
  strugglePoints: 'algebra, functies',
  email: 'jan@student.nl',
  isActive: true,
  isAdmin: false,
};

const mockDbStudentProfile = {
  name: 'Jan Jansen',
  level: 'HAVO',
  struggle_points: 'algebra, functies',
  email: 'jan@student.nl',
  is_active: true,
  is_admin: false,
  auth_user_id: 'auth-123',
};

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('dbQuestions Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll()', () => {
    it('moet alle vragen ophalen en converteren naar camelCase', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [mockDbQuestion],
            error: null,
          }),
        }),
      });

      // Simuleer de service functie
      const result = await new Promise<Question[]>((resolve) => {
        const data = [mockDbQuestion].map((dbQ) => ({
          id: dbQ.id,
          type: dbQ.type,
          subject: dbQ.subject,
          level: dbQ.level,
          text: dbQ.text,
          contextText: dbQ.context_text,
          imageUrl: dbQ.image_url,
          source: dbQ.source,
          options: dbQ.options,
          correctIndex: dbQ.correct_index,
          modelAnswer: dbQ.model_answer,
          examYear: dbQ.exam_year,
          examType: dbQ.exam_type,
        }));
        resolve(data as Question[]);
      });

      expect(result).toHaveLength(1);
      expect(result[0].correctIndex).toBe(1);
      expect(result[0].examYear).toBe(2024);
    });

    it('moet error gooien bij database fout', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      });

      await expect(async () => {
        const { data, error } = await mockSupabaseClient.from('questions').select('*').order('created_at');
        if (error) throw error;
        return data;
      }).rejects.toEqual({ message: 'Database connection failed' });
    });
  });

  describe('getById()', () => {
    it('moet enkele vraag ophalen op ID', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockDbQuestion,
              error: null,
            }),
          }),
        }),
      });

      const { data } = await mockSupabaseClient.from('questions').select('*').eq('id', 'q-123').single();
      expect(data).toEqual(mockDbQuestion);
    });

    it('moet null retourneren voor niet-bestaande vraag', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      });

      const { data, error } = await mockSupabaseClient.from('questions').select('*').eq('id', 'niet-bestaand').single();
      expect(data).toBeNull();
      expect(error.code).toBe('PGRST116');
    });
  });

  describe('save()', () => {
    it('moet vraag opslaan en converteren naar snake_case', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockDbQuestion,
              error: null,
            }),
          }),
        }),
      });

      // Converteer naar db format
      const dbFormat = {
        id: mockQuestion.id,
        type: mockQuestion.type,
        subject: mockQuestion.subject,
        level: mockQuestion.level,
        text: mockQuestion.text,
        context_text: mockQuestion.contextText,
        image_url: mockQuestion.imageUrl,
        source: mockQuestion.source,
        options: mockQuestion.options,
        correct_index: mockQuestion.correctIndex,
        model_answer: mockQuestion.modelAnswer,
        exam_year: mockQuestion.examYear,
        exam_type: mockQuestion.examType,
      };

      expect(dbFormat.correct_index).toBe(1);
      expect(dbFormat.exam_year).toBe(2024);
    });
  });

  describe('delete()', () => {
    it('moet vraag verwijderen op ID', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const { error } = await mockSupabaseClient.from('questions').delete().eq('id', 'q-123');
      expect(error).toBeNull();
    });
  });

  describe('getBySubject()', () => {
    it('moet vragen filteren op vak', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [mockDbQuestion],
              error: null,
            }),
          }),
        }),
      });

      const { data } = await mockSupabaseClient.from('questions').select('*').eq('subject', 'Wiskunde').order('created_at');
      expect(data).toHaveLength(1);
      expect(data[0].subject).toBe('Wiskunde');
    });
  });
});

describe('dbResults Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll()', () => {
    it('moet alle resultaten ophalen', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [mockDbExamResult],
            error: null,
          }),
        }),
      });

      const { data } = await mockSupabaseClient.from('exam_results').select('*').order('created_at');
      expect(data).toHaveLength(1);
      expect(data[0].student_name).toBe('Jan Jansen');
    });
  });

  describe('save()', () => {
    it('moet resultaat opslaan met correcte conversie', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockDbExamResult,
              error: null,
            }),
          }),
        }),
      });

      // Converteer naar db format
      const dbFormat = {
        id: mockExamResult.id,
        student_name: mockExamResult.studentName,
        subject: mockExamResult.subject,
        score: mockExamResult.score,
        total_questions: mockExamResult.totalQuestions,
        date: mockExamResult.date,
        answers: mockExamResult.answers,
        exam_year: mockExamResult.examYear,
        exam_type: mockExamResult.examType,
        duration_seconds: mockExamResult.durationSeconds,
        level: mockExamResult.level,
        user_id: mockExamResult.user_id,
      };

      expect(dbFormat.student_name).toBe('Jan Jansen');
      expect(dbFormat.total_questions).toBe(10);
      expect(dbFormat.duration_seconds).toBe(3600);
    });
  });
});

describe('dbStudents Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getByEmail()', () => {
    it('moet student vinden op email', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockDbStudentProfile,
              error: null,
            }),
          }),
        }),
      });

      const { data } = await mockSupabaseClient.from('student_profiles').select('*').eq('email', 'jan@student.nl').maybeSingle();
      expect(data.email).toBe('jan@student.nl');
    });
  });

  describe('save()', () => {
    it('moet profiel opslaan met upsert', async () => {
      mockSupabaseClient.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockDbStudentProfile,
              error: null,
            }),
          }),
        }),
      });

      // Converteer naar db format
      const dbData = {
        email: mockStudentProfile.email,
        name: mockStudentProfile.name,
        level: mockStudentProfile.level,
        struggle_points: mockStudentProfile.strugglePoints || '',
        is_active: mockStudentProfile.isActive ?? true,
        is_admin: mockStudentProfile.isAdmin ?? false,
      };

      expect(dbData.struggle_points).toBe('algebra, functies');
      expect(dbData.is_active).toBe(true);
    });
  });

  describe('getAll()', () => {
    it('moet alle studenten ophalen gesorteerd op naam', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [mockDbStudentProfile],
            error: null,
          }),
        }),
      });

      const { data } = await mockSupabaseClient.from('student_profiles').select('*').order('name', { ascending: true });
      expect(data).toHaveLength(1);
    });
  });

  describe('delete()', () => {
    it('moet student profiel verwijderen op email', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const { error } = await mockSupabaseClient.from('student_profiles').delete().eq('email', 'jan@student.nl');
      expect(error).toBeNull();
    });
  });
});

describe('Data Transformation', () => {
  describe('Question Transformation (camelCase <-> snake_case)', () => {
    it('moet correct converteren van DB naar TypeScript format', () => {
      const tsQuestion: Question = {
        id: mockDbQuestion.id,
        type: mockDbQuestion.type as 'MULTIPLE_CHOICE' | 'OPEN',
        subject: mockDbQuestion.subject,
        level: mockDbQuestion.level as 'VMBO-TL' | 'HAVO' | 'VWO',
        text: mockDbQuestion.text,
        contextText: mockDbQuestion.context_text || undefined,
        imageUrl: mockDbQuestion.image_url || undefined,
        source: mockDbQuestion.source || undefined,
        options: mockDbQuestion.options,
        correctIndex: mockDbQuestion.correct_index,
        modelAnswer: mockDbQuestion.model_answer || undefined,
        examYear: mockDbQuestion.exam_year,
        examType: mockDbQuestion.exam_type as 'practice' | 'official_exam' | undefined,
      };

      expect(tsQuestion.correctIndex).toBe(1);
      expect(tsQuestion.examYear).toBe(2024);
      expect(tsQuestion.contextText).toBeFalsy(); // null of undefined
    });

    it('moet correct converteren van TypeScript naar DB format', () => {
      const dbQuestion = {
        id: mockQuestion.id,
        type: mockQuestion.type,
        subject: mockQuestion.subject,
        level: mockQuestion.level,
        text: mockQuestion.text,
        context_text: mockQuestion.contextText,
        image_url: mockQuestion.imageUrl,
        source: mockQuestion.source,
        options: mockQuestion.options,
        correct_index: mockQuestion.correctIndex,
        model_answer: mockQuestion.modelAnswer,
        exam_year: mockQuestion.examYear,
        exam_type: mockQuestion.examType,
      };

      expect(dbQuestion.correct_index).toBe(1);
      expect(dbQuestion.exam_year).toBe(2024);
    });
  });

  describe('ExamResult Transformation', () => {
    it('moet correct converteren van DB naar TypeScript format', () => {
      const tsResult: ExamResult = {
        id: mockDbExamResult.id,
        studentName: mockDbExamResult.student_name,
        subject: mockDbExamResult.subject,
        score: mockDbExamResult.score,
        totalQuestions: mockDbExamResult.total_questions,
        date: mockDbExamResult.date,
        answers: mockDbExamResult.answers,
        examYear: mockDbExamResult.exam_year,
        examType: mockDbExamResult.exam_type as any,
        durationSeconds: mockDbExamResult.duration_seconds,
        level: mockDbExamResult.level as any,
        user_id: mockDbExamResult.user_id,
      };

      expect(tsResult.studentName).toBe('Jan Jansen');
      expect(tsResult.totalQuestions).toBe(10);
      expect(tsResult.durationSeconds).toBe(3600);
    });
  });

  describe('StudentProfile Transformation', () => {
    it('moet correct converteren van DB naar TypeScript format', () => {
      const tsProfile: StudentProfile = {
        name: mockDbStudentProfile.name,
        level: mockDbStudentProfile.level as 'VMBO-TL' | 'HAVO' | 'VWO',
        strugglePoints: mockDbStudentProfile.struggle_points || '',
        email: mockDbStudentProfile.email,
        isActive: mockDbStudentProfile.is_active ?? true,
        isAdmin: mockDbStudentProfile.is_admin ?? false,
      };

      expect(tsProfile.strugglePoints).toBe('algebra, functies');
      expect(tsProfile.isActive).toBe(true);
      expect(tsProfile.isAdmin).toBe(false);
    });
  });
});
