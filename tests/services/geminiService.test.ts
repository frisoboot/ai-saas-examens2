/**
 * Gemini Service Tests
 * Test geminiService.ts: API calls, sliding window chat, error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Question, StudentProfile, Flashcard } from '../../types';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mock
import {
  getExplanation,
  createSubjectChat,
  generateExamSummary,
  generateLookalikeExamQuestions,
  gradeOpenQuestion,
  generateFlashcards,
} from '../../services/geminiService';

const mockQuestion: Question = {
  id: 'q-1',
  type: 'MULTIPLE_CHOICE',
  subject: 'Wiskunde A',
  level: 'HAVO',
  text: 'Wat is 2 + 2?',
  options: ['3', '4', '5', '6'],
  correctIndex: 1,
};

const mockStudent: StudentProfile = {
  name: 'Jan Jansen',
  level: 'HAVO',
  strugglePoints: 'algebra',
  email: 'jan@student.nl',
};

describe('Gemini Service - getExplanation()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet uitleg ophalen voor een vraag', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 'De uitleg is...' }),
    });

    const result = await getExplanation(mockQuestion, 1);

    expect(result).toBe('De uitleg is...');
    expect(mockFetch).toHaveBeenCalledWith('/api/gemini', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('getExplanation'),
    }));
  });

  it('moet fallback bericht retourneren bij API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Service unavailable' }),
    });

    const result = await getExplanation(mockQuestion, 1);

    expect(result).toContain('Er ging iets mis');
  });

  it('moet fallback bericht retourneren bij netwerk error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await getExplanation(mockQuestion, 1);

    expect(result).toContain('Er ging iets mis');
  });
});

describe('Gemini Service - createSubjectChat()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet een chat sessie aanmaken met sessionId', () => {
    const chat = createSubjectChat('Wiskunde A', mockStudent);

    expect(chat.sessionId).toBeDefined();
    expect(chat.sessionId).toContain('Wiskunde A');
    expect(chat.sendMessage).toBeInstanceOf(Function);
  });

  it('moet berichten versturen en antwoord ontvangen', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 'Goed gedaan! Wat snap je niet precies?' }),
    });

    const chat = createSubjectChat('Wiskunde A', mockStudent);
    const response = await chat.sendMessage('Ik snap algebra niet');

    expect(response).toBe('Goed gedaan! Wat snap je niet precies?');
  });

  it('moet conversatie context meesturen bij opvolgende berichten', async () => {
    let callCount = 0;
    mockFetch.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ result: `Antwoord ${callCount}` }),
      });
    });

    const chat = createSubjectChat('Wiskunde A', mockStudent);
    await chat.sendMessage('Eerste vraag');
    await chat.sendMessage('Tweede vraag');

    // The second call should include context from the first exchange
    const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(secondCallBody.payload.message).toContain('Eerste vraag');
    expect(secondCallBody.payload.message).toContain('Antwoord 1');
    expect(secondCallBody.payload.message).toContain('Tweede vraag');
  });

  it('moet sliding window toepassen op chat context (max 8 berichten)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: 'OK' }),
    });

    const chat = createSubjectChat('Wiskunde A', mockStudent);

    // Send 6 messages (= 12 messages total: 6 user + 6 assistant)
    for (let i = 0; i < 6; i++) {
      await chat.sendMessage(`Bericht ${i + 1}`);
    }

    // The last call should only contain the last 8 messages (sliding window)
    const lastCallBody = JSON.parse(mockFetch.mock.calls[5][1].body);
    const message = lastCallBody.payload.message;

    // Messages 1 and 2 (user+assistant) should be dropped (they're beyond the window)
    // The window of 8 keeps messages 5-12 out of 12 total:
    // message 5 = user "Bericht 3", message 6 = assistant "OK", ...
    expect(message).not.toContain('Bericht 1');
    expect(message).toContain('Bericht 6');
  });

  it('moet system instruction bevatten met niveau-specifieke guidance', () => {
    // Test for each level
    const levels: Array<{ level: 'VMBO-TL' | 'HAVO' | 'VWO'; keyword: string }> = [
      { level: 'VMBO-TL', keyword: 'Eenvoudig' },
      { level: 'HAVO', keyword: 'vakterminologie' },
      { level: 'VWO', keyword: 'Academisch' },
    ];

    for (const { level, keyword } of levels) {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: 'Test' }),
      });

      const student = { ...mockStudent, level };
      const chat = createSubjectChat('Wiskunde A', student);
      chat.sendMessage('Test');

      const callBody = JSON.parse(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1].body);
      expect(callBody.payload.systemInstruction).toContain(keyword);
    }
  });

  it('moet error gooien bij API fout in chat', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Rate limited' }),
    });

    const chat = createSubjectChat('Wiskunde A', mockStudent);

    await expect(chat.sendMessage('Test')).rejects.toThrow('Er ging iets mis');
  });
});

describe('Gemini Service - generateExamSummary()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet een examen samenvatting genereren', async () => {
    const mockSummary = {
      overall: 'Goed werk!',
      strengths: ['Algebra'],
      improvements: ['Meetkunde'],
      studyTips: ['Oefen meer met grafieken'],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: mockSummary }),
    });

    const result = await generateExamSummary(
      [mockQuestion],
      { 'q-1': 1 },
      8,
      10,
      'Jan',
      'Wiskunde A'
    );

    expect(result.overall).toBe('Goed werk!');
    expect(result.strengths).toContain('Algebra');
    expect(result.studyTips).toHaveLength(1);
  });

  it('moet error gooien bij API fout', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    await expect(
      generateExamSummary([mockQuestion], {}, 0, 10, 'Jan', 'Wiskunde A')
    ).rejects.toThrow();
  });
});

describe('Gemini Service - generateLookalikeExamQuestions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet look-alike examenvragen genereren', async () => {
    const mockGeneratedQuestions: Question[] = [
      { ...mockQuestion, id: 'gen-1', text: 'Gegenereerde vraag' },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: mockGeneratedQuestions }),
    });

    const result = await generateLookalikeExamQuestions('Wiskunde A', 'HAVO', 10);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Gegenereerde vraag');
  });

  it('moet optionele parameters doorsturen', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: [] }),
    });

    await generateLookalikeExamQuestions('Wiskunde A', 'HAVO', 5, 'algebra', 'tijdvak1');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.payload.topic).toBe('algebra');
    expect(body.payload.examStyle).toBe('tijdvak1');
    expect(body.payload.count).toBe(5);
  });

  it('moet error gooien bij API fout', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Model overloaded' }),
    });

    await expect(
      generateLookalikeExamQuestions('Wiskunde A', 'HAVO')
    ).rejects.toThrow();
  });
});

describe('Gemini Service - gradeOpenQuestion()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet open vraag nakijken en feedback geven', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: { grade: 'correct', feedback: 'Goed antwoord!' },
      }),
    });

    const openQuestion: Question = {
      ...mockQuestion,
      type: 'OPEN',
      modelAnswer: 'Het antwoord is 4',
    };

    const result = await gradeOpenQuestion(openQuestion, 'Het antwoord is 4');

    expect(result.grade).toBe('correct');
    expect(result.feedback).toBe('Goed antwoord!');
  });

  it('moet fallback retourneren bij API fout', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Error' }),
    });

    const result = await gradeOpenQuestion(mockQuestion, 'test');

    expect(result.grade).toBe('incorrect');
    expect(result.feedback).toContain('niet automatisch nakijken');
  });
});

describe('Gemini Service - generateFlashcards()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet flashcards genereren voor een vak', async () => {
    const mockFlashcards: Flashcard[] = [
      {
        id: 'fc-1',
        subject: 'Wiskunde A',
        level: 'HAVO',
        front: 'Wat is de afgeleide van x²?',
        back: '2x',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: mockFlashcards }),
    });

    const result = await generateFlashcards('Wiskunde A', 'HAVO', 10);

    expect(result).toHaveLength(1);
    expect(result[0].front).toContain('afgeleide');
  });

  it('moet optioneel topic parameter doorsturen', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: [] }),
    });

    await generateFlashcards('Wiskunde A', 'HAVO', 5, 'differentiëren');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.payload.topic).toBe('differentiëren');
  });

  it('moet error gooien bij API fout', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Quota exceeded' }),
    });

    await expect(generateFlashcards('Wiskunde A', 'HAVO')).rejects.toThrow();
  });
});
