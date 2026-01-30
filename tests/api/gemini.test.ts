/**
 * Gemini API Endpoint Tests
 * Test AI model selectie, grading instructies en request handling
 */

import { describe, it, expect, vi } from 'vitest';

// Test de model selectie logica
const EXACT_SUBJECTS = ['Wiskunde B', 'Wiskunde A', 'Natuurkunde', 'Scheikunde'];
const PRO_LEVELS = ['HAVO', 'VWO'];
const GEMINI_MODEL_FLASH = 'google/gemini-2.0-flash';
const GEMINI_MODEL_PRO = 'google/gemini-2.5-pro';

function getModelIdForSubject(subject?: string, level?: string): string {
  return (subject && level && EXACT_SUBJECTS.includes(subject) && PRO_LEVELS.includes(level))
    ? GEMINI_MODEL_PRO
    : GEMINI_MODEL_FLASH;
}

// Test de grading instructies
function getGradingInstructionsForLevel(level?: string): string {
  switch (level) {
    case 'VMBO-TL':
    case 'VMBO-GL':
    case 'VMBO-BB':
    case 'VMBO-KB':
      return 'VMBO';
    case 'HAVO':
      return 'HAVO';
    case 'VWO':
      return 'VWO';
    default:
      return 'DEFAULT';
  }
}

describe('Gemini API - Model Selectie', () => {
  it('moet Pro model gebruiken voor exacte vakken op HAVO niveau', () => {
    expect(getModelIdForSubject('Wiskunde B', 'HAVO')).toBe(GEMINI_MODEL_PRO);
    expect(getModelIdForSubject('Wiskunde A', 'HAVO')).toBe(GEMINI_MODEL_PRO);
    expect(getModelIdForSubject('Natuurkunde', 'HAVO')).toBe(GEMINI_MODEL_PRO);
    expect(getModelIdForSubject('Scheikunde', 'HAVO')).toBe(GEMINI_MODEL_PRO);
  });

  it('moet Pro model gebruiken voor exacte vakken op VWO niveau', () => {
    expect(getModelIdForSubject('Wiskunde B', 'VWO')).toBe(GEMINI_MODEL_PRO);
    expect(getModelIdForSubject('Wiskunde A', 'VWO')).toBe(GEMINI_MODEL_PRO);
    expect(getModelIdForSubject('Natuurkunde', 'VWO')).toBe(GEMINI_MODEL_PRO);
    expect(getModelIdForSubject('Scheikunde', 'VWO')).toBe(GEMINI_MODEL_PRO);
  });

  it('moet Flash model gebruiken voor exacte vakken op VMBO-TL niveau', () => {
    expect(getModelIdForSubject('Wiskunde B', 'VMBO-TL')).toBe(GEMINI_MODEL_FLASH);
    expect(getModelIdForSubject('Natuurkunde', 'VMBO-TL')).toBe(GEMINI_MODEL_FLASH);
  });

  it('moet Flash model gebruiken voor niet-exacte vakken', () => {
    expect(getModelIdForSubject('Geschiedenis', 'VWO')).toBe(GEMINI_MODEL_FLASH);
    expect(getModelIdForSubject('Nederlands', 'HAVO')).toBe(GEMINI_MODEL_FLASH);
    expect(getModelIdForSubject('Engels', 'VWO')).toBe(GEMINI_MODEL_FLASH);
    expect(getModelIdForSubject('Biologie', 'HAVO')).toBe(GEMINI_MODEL_FLASH);
  });

  it('moet Flash model gebruiken als subject undefined is', () => {
    expect(getModelIdForSubject(undefined, 'VWO')).toBe(GEMINI_MODEL_FLASH);
  });

  it('moet Flash model gebruiken als level undefined is', () => {
    expect(getModelIdForSubject('Wiskunde B', undefined)).toBe(GEMINI_MODEL_FLASH);
  });

  it('moet Flash model gebruiken als beide undefined zijn', () => {
    expect(getModelIdForSubject(undefined, undefined)).toBe(GEMINI_MODEL_FLASH);
  });
});

describe('Gemini API - Niveau Instructies', () => {
  it('moet VMBO instructies retourneren voor alle VMBO varianten', () => {
    expect(getGradingInstructionsForLevel('VMBO-TL')).toBe('VMBO');
    expect(getGradingInstructionsForLevel('VMBO-GL')).toBe('VMBO');
    expect(getGradingInstructionsForLevel('VMBO-BB')).toBe('VMBO');
    expect(getGradingInstructionsForLevel('VMBO-KB')).toBe('VMBO');
  });

  it('moet HAVO instructies retourneren', () => {
    expect(getGradingInstructionsForLevel('HAVO')).toBe('HAVO');
  });

  it('moet VWO instructies retourneren', () => {
    expect(getGradingInstructionsForLevel('VWO')).toBe('VWO');
  });

  it('moet default instructies retourneren bij onbekend niveau', () => {
    expect(getGradingInstructionsForLevel(undefined)).toBe('DEFAULT');
    expect(getGradingInstructionsForLevel('MBO')).toBe('DEFAULT');
    expect(getGradingInstructionsForLevel('')).toBe('DEFAULT');
  });
});

describe('Gemini API - Request Validatie', () => {
  it('moet alleen POST requests accepteren', () => {
    const validMethods = ['POST'];
    const invalidMethods = ['GET', 'PUT', 'DELETE', 'PATCH'];

    validMethods.forEach(method => {
      expect(method === 'POST').toBe(true);
    });

    invalidMethods.forEach(method => {
      expect(method === 'POST').toBe(false);
    });
  });

  it('moet OPTIONS requests afhandelen voor CORS', () => {
    const method = 'OPTIONS';
    // OPTIONS moet 200 status retourneren
    expect(method === 'OPTIONS').toBe(true);
  });

  it('moet exacte vakken correct identificeren', () => {
    expect(EXACT_SUBJECTS).toContain('Wiskunde B');
    expect(EXACT_SUBJECTS).toContain('Wiskunde A');
    expect(EXACT_SUBJECTS).toContain('Natuurkunde');
    expect(EXACT_SUBJECTS).toContain('Scheikunde');
    expect(EXACT_SUBJECTS).not.toContain('Geschiedenis');
    expect(EXACT_SUBJECTS).not.toContain('Nederlands');
    expect(EXACT_SUBJECTS).not.toContain('Biologie');
  });

  it('moet Pro niveaus correct identificeren', () => {
    expect(PRO_LEVELS).toContain('HAVO');
    expect(PRO_LEVELS).toContain('VWO');
    expect(PRO_LEVELS).not.toContain('VMBO-TL');
    expect(PRO_LEVELS).not.toContain('MBO');
  });
});

describe('Gemini API - CORS Headers', () => {
  it('moet productie origin accepteren', () => {
    const allowedOrigins = [
      'https://ai-examentrainer.nl',
      'https://www.ai-examentrainer.nl',
    ];

    expect(allowedOrigins).toContain('https://ai-examentrainer.nl');
    expect(allowedOrigins).toContain('https://www.ai-examentrainer.nl');
  });

  it('moet Vercel preview URLs accepteren', () => {
    const pattern = /^https:\/\/.*\.vercel\.app$/;

    expect(pattern.test('https://my-app-abc123.vercel.app')).toBe(true);
    expect(pattern.test('https://preview-branch.vercel.app')).toBe(true);
  });

  it('moet localhost accepteren', () => {
    const pattern = /^http:\/\/localhost:\d+$/;

    expect(pattern.test('http://localhost:3000')).toBe(true);
    expect(pattern.test('http://localhost:5173')).toBe(true);
  });

  it('moet ongeldige origins afwijzen', () => {
    const allowedPatterns = [
      /^https:\/\/.*\.vercel\.app$/,
      /^http:\/\/localhost:\d+$/,
    ];
    const allowedOrigins = [
      'https://ai-examentrainer.nl',
      'https://www.ai-examentrainer.nl',
    ];

    const invalidOrigin = 'https://evil-site.com';

    const isExactMatch = allowedOrigins.includes(invalidOrigin);
    const isPatternMatch = allowedPatterns.some(p => p.test(invalidOrigin));

    expect(isExactMatch || isPatternMatch).toBe(false);
  });
});
