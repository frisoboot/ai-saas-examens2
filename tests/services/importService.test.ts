/**
 * Import Service Tests
 * Test importService.ts: CSV/JSON parsing, validation, bulk import
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock storageService to prevent actual DB calls
vi.mock('../../services/storageService', () => ({
  saveQuestion: vi.fn().mockResolvedValue(undefined),
}));

import { saveQuestion } from '../../services/storageService';
import {
  parseCSV,
  parseJSON,
  bulkImportQuestions,
  generateCSVTemplate,
  validateFileType,
} from '../../services/importService';
import type { BulkImportQuestion } from '../../types';

describe('Import Service - parseCSV()', () => {
  it('moet CSV correct parsen met standaard headers', () => {
    const csv = `subject,level,type,text,year,options,correctanswer
Wiskunde A,HAVO,MULTIPLE_CHOICE,Wat is 2+2?,2024,3|4|5|6,4`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('Wiskunde A');
    expect(result[0].level).toBe('HAVO');
    expect(result[0].type).toBe('MULTIPLE_CHOICE');
    expect(result[0].text).toBe('Wat is 2+2?');
    expect(result[0].examYear).toBe(2024);
    expect(result[0].options).toEqual(['3', '4', '5', '6']);
    expect(result[0].correctAnswer).toBe('4');
  });

  it('moet Nederlandse headers ondersteunen', () => {
    const csv = `vak,niveau,type,vraag,jaar,opties,juistantwoord
Geschiedenis,VWO,MULTIPLE_CHOICE,Wanneer viel de Muur?,2023,1987|1989|1991,1989`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('Geschiedenis');
    expect(result[0].level).toBe('VWO');
    expect(result[0].examYear).toBe(2023);
  });

  it('moet open vragen met modelantwoord parsen', () => {
    const csv = `subject,level,type,text,modelanswer
Nederlands,HAVO,OPEN,Beschrijf de schrijfstijl,De auteur gebruikt metaforen`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('OPEN');
    expect(result[0].modelAnswer).toBe('De auteur gebruikt metaforen');
  });

  it('moet quoted fields met kommas correct parsen', () => {
    const csv = `subject,level,type,text,options,correctanswer
Wiskunde A,HAVO,MULTIPLE_CHOICE,"Bereken x, als x+2=4","1|2|3|4",2`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Bereken x, als x+2=4');
  });

  it('moet lege regels overslaan', () => {
    const csv = `subject,level,type,text
Wiskunde A,HAVO,OPEN,Vraag 1

Wiskunde A,HAVO,OPEN,Vraag 2
`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
  });

  it('moet lege CSV afhandelen', () => {
    const result = parseCSV('');

    expect(result).toHaveLength(0);
  });

  it('moet CSV met alleen header afhandelen', () => {
    const result = parseCSV('subject,level,type,text');

    expect(result).toHaveLength(0);
  });

  it('moet meerdere rijen correct parsen', () => {
    const csv = `subject,level,type,text,options,correctanswer,modelanswer
Wiskunde A,HAVO,MULTIPLE_CHOICE,Vraag 1,a|b|c,b,
Wiskunde A,HAVO,OPEN,Vraag 2,,,Model antwoord
Wiskunde A,VWO,MULTIPLE_CHOICE,Vraag 3,x|y|z,y,`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(3);
  });

  it('moet section en sectionIntro headers parsen', () => {
    const csv = `subject,level,type,text,section,sectionintro
Scheikunde,HAVO,OPEN,Leg uit,Reactiekinetiek,Dit hoofdstuk gaat over...`;

    const result = parseCSV(csv);

    expect(result[0].section).toBe('Reactiekinetiek');
    expect(result[0].sectionIntro).toBe('Dit hoofdstuk gaat over...');
  });

  it('moet score/punten header parsen', () => {
    const csv = `subject,level,type,text,score
Wiskunde A,HAVO,OPEN,Bereken,3`;

    const result = parseCSV(csv);

    expect(result[0].score).toBe(3);
  });
});

describe('Import Service - parseJSON()', () => {
  it('moet array van vragen correct parsen', () => {
    const json = JSON.stringify([
      {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'Wat is 2+2?',
        options: ['3', '4', '5'],
        correctAnswer: '4',
      },
    ]);

    const result = parseJSON(json);

    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('Wiskunde A');
  });

  it('moet object met questions property parsen', () => {
    const json = JSON.stringify({
      subject: 'Wiskunde A',
      level: 'HAVO',
      year: 2024,
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          text: 'Vraag 1',
          options: ['a', 'b', 'c'],
          correctAnswer: 'b',
        },
        {
          type: 'OPEN',
          text: 'Vraag 2',
          modelAnswer: 'Antwoord',
        },
      ],
    });

    const result = parseJSON(json);

    expect(result).toHaveLength(2);
    // Metadata should be inherited
    expect(result[0].subject).toBe('Wiskunde A');
    expect(result[0].level).toBe('HAVO');
    expect(result[0].examYear).toBe(2024);
    expect(result[1].subject).toBe('Wiskunde A');
  });

  it('moet correctIndex converteren naar correctAnswer', () => {
    const json = JSON.stringify({
      questions: [
        {
          subject: 'Wiskunde A',
          level: 'HAVO',
          type: 'MULTIPLE_CHOICE',
          text: 'Test',
          options: ['a', 'b', 'c'],
          correctIndex: 1,
        },
      ],
    });

    const result = parseJSON(json);

    expect(result[0].correctAnswer).toBe('b');
  });

  it('moet single question object parsen', () => {
    const json = JSON.stringify({
      subject: 'Biologie',
      level: 'VWO',
      type: 'OPEN',
      text: 'Beschrijf fotosynthese',
      modelAnswer: 'CO2 + H2O -> glucose + O2',
    });

    const result = parseJSON(json);

    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('Biologie');
  });

  it('moet lege array retourneren bij ongeldig JSON', () => {
    const result = parseJSON('dit is geen json');

    expect(result).toHaveLength(0);
  });

  it('moet lege array retourneren bij onherkenbaar format', () => {
    const result = parseJSON(JSON.stringify({ key: 'value' }));

    expect(result).toHaveLength(0);
  });

  it('moet type naar uppercase converteren', () => {
    const json = JSON.stringify({
      questions: [
        {
          subject: 'Wiskunde A',
          level: 'HAVO',
          type: 'multiple_choice',
          text: 'Test',
          options: ['a', 'b'],
          correctAnswer: 'a',
        },
      ],
    });

    const result = parseJSON(json);

    expect(result[0].type).toBe('MULTIPLE_CHOICE');
  });
});

describe('Import Service - bulkImportQuestions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet geldige vragen importeren', async () => {
    const questions: BulkImportQuestion[] = [
      {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'Wat is 2+2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
      },
    ];

    const result = await bulkImportQuestions(questions);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(saveQuestion).toHaveBeenCalledOnce();
  });

  it('moet validatie fouten rapporteren', async () => {
    const questions: BulkImportQuestion[] = [
      {
        subject: 'OngeldigVak',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'Vraag',
        options: ['a', 'b'],
        correctAnswer: 'a',
      },
    ];

    const result = await bulkImportQuestions(questions);

    expect(result.success).toBe(false);
    expect(result.importedCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].field).toBe('subject');
  });

  it('moet ongeldig niveau detecteren', async () => {
    const questions: BulkImportQuestion[] = [
      {
        subject: 'Wiskunde A',
        level: 'MAVO' as any,
        type: 'OPEN',
        text: 'Vraag',
        modelAnswer: 'Antwoord',
      },
    ];

    const result = await bulkImportQuestions(questions);

    expect(result.errors.some(e => e.field === 'level')).toBe(true);
  });

  it('moet leeg tekstveld detecteren', async () => {
    const questions: BulkImportQuestion[] = [
      {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'OPEN',
        text: '',
        modelAnswer: 'Antwoord',
      },
    ];

    const result = await bulkImportQuestions(questions);

    expect(result.errors.some(e => e.field === 'text')).toBe(true);
  });

  it('moet ongeldig type detecteren', async () => {
    const questions: BulkImportQuestion[] = [
      {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'ESSAY' as any,
        text: 'Vraag',
      },
    ];

    const result = await bulkImportQuestions(questions);

    expect(result.errors.some(e => e.field === 'type')).toBe(true);
  });

  it('moet ontbrekende opties bij MC detecteren', async () => {
    const questions: BulkImportQuestion[] = [
      {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'Vraag',
        options: ['a'], // Less than 2
        correctAnswer: 'a',
      },
    ];

    const result = await bulkImportQuestions(questions);

    expect(result.errors.some(e => e.field === 'options')).toBe(true);
  });

  it('moet ontbrekend correctAnswer bij MC detecteren', async () => {
    const questions: BulkImportQuestion[] = [
      {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'Vraag',
        options: ['a', 'b', 'c'],
        // No correctAnswer
      },
    ];

    const result = await bulkImportQuestions(questions);

    expect(result.errors.some(e => e.field === 'correctAnswer')).toBe(true);
  });

  it('moet correctAnswer die niet in opties voorkomt detecteren', async () => {
    const questions: BulkImportQuestion[] = [
      {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'Vraag',
        options: ['a', 'b', 'c'],
        correctAnswer: 'd', // Not in options
      },
    ];

    const result = await bulkImportQuestions(questions);

    expect(result.errors.some(e => e.field === 'correctAnswer')).toBe(true);
  });

  it('moet ontbrekend modelAnswer bij OPEN detecteren', async () => {
    const questions: BulkImportQuestion[] = [
      {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'OPEN',
        text: 'Leg uit',
        // No modelAnswer
      },
    ];

    const result = await bulkImportQuestions(questions);

    expect(result.errors.some(e => e.field === 'modelAnswer')).toBe(true);
  });

  it('moet ongeldig examYear detecteren', async () => {
    const questions: BulkImportQuestion[] = [
      {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'OPEN',
        text: 'Vraag',
        modelAnswer: 'Antwoord',
        examYear: 1999, // Too old
      },
    ];

    const result = await bulkImportQuestions(questions);

    expect(result.errors.some(e => e.field === 'examYear')).toBe(true);
  });

  it('moet mix van geldige en ongeldige vragen correct tellen', async () => {
    const questions: BulkImportQuestion[] = [
      {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'OPEN',
        text: 'Geldige vraag',
        modelAnswer: 'Antwoord',
      },
      {
        subject: 'OngeldigVak',
        level: 'HAVO',
        type: 'OPEN',
        text: 'Ongeldige vraag',
        modelAnswer: 'Antwoord',
      },
      {
        subject: 'Biologie',
        level: 'VWO',
        type: 'OPEN',
        text: 'Geldige vraag 2',
        modelAnswer: 'Antwoord 2',
      },
    ];

    const result = await bulkImportQuestions(questions);

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(2);
    expect(result.failedCount).toBe(1);
  });

  it('moet save errors correct rapporteren', async () => {
    vi.mocked(saveQuestion).mockRejectedValueOnce(new Error('DB error'));

    const questions: BulkImportQuestion[] = [
      {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'OPEN',
        text: 'Geldige vraag',
        modelAnswer: 'Antwoord',
      },
    ];

    const result = await bulkImportQuestions(questions);

    expect(result.importedCount).toBe(0);
    expect(result.failedCount).toBe(1);
    expect(result.errors[0].message).toContain('Fout bij opslaan');
  });
});

describe('Import Service - generateCSVTemplate()', () => {
  it('moet een geldig CSV template genereren', () => {
    const template = generateCSVTemplate();

    // Should start with headers
    expect(template).toContain('subject');
    expect(template).toContain('level');
    expect(template).toContain('type');
    expect(template).toContain('text');
  });

  it('moet voorbeeldrijen bevatten', () => {
    const template = generateCSVTemplate();

    expect(template).toContain('Geschiedenis');
    expect(template).toContain('HAVO');
    expect(template).toContain('MULTIPLE_CHOICE');
    expect(template).toContain('OPEN');
  });

  it('moet meerdere regels bevatten', () => {
    const template = generateCSVTemplate();
    const lines = template.split('\n');

    // Header + at least 2 example rows
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Import Service - validateFileType()', () => {
  it('moet .csv bestanden accepteren', () => {
    const file = new File(['test'], 'data.csv', { type: 'text/csv' });
    const result = validateFileType(file);

    expect(result.valid).toBe(true);
  });

  it('moet .json bestanden accepteren', () => {
    const file = new File(['{}'], 'data.json', { type: 'application/json' });
    const result = validateFileType(file);

    expect(result.valid).toBe(true);
  });

  it('moet ongeldige bestandstypes weigeren', () => {
    const file = new File(['test'], 'data.txt', { type: 'text/plain' });
    const result = validateFileType(file);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Ongeldig bestandstype');
  });

  it('moet .exe bestanden weigeren', () => {
    const file = new File(['test'], 'virus.exe', { type: 'application/octet-stream' });
    const result = validateFileType(file);

    expect(result.valid).toBe(false);
  });

  it('moet bestanden groter dan 5MB weigeren', () => {
    // Create a mock file with large size
    const largeContent = new ArrayBuffer(6 * 1024 * 1024); // 6MB
    const file = new File([largeContent], 'large.csv', { type: 'text/csv' });
    const result = validateFileType(file);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('te groot');
  });

  it('moet bestanden tot 5MB accepteren', () => {
    const content = new ArrayBuffer(4 * 1024 * 1024); // 4MB
    const file = new File([content], 'data.csv', { type: 'text/csv' });
    const result = validateFileType(file);

    expect(result.valid).toBe(true);
  });
});
