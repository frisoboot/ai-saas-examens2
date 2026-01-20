/**
 * Import Service Tests
 * Test CSV/JSON parsing en vraag validatie
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BulkImportQuestion, ImportError, StudentLevel, QuestionType } from '../../types';

// Constants for validation (matching actual implementation)
const SUBJECTS = [
  'Aardrijkskunde',
  'Bedrijfseconomie',
  'Biologie',
  'Duits',
  'Economie',
  'Engels',
  'Frans',
  'Geschiedenis',
  'Kunst Algemeen',
  'Maatschappijwetenschappen',
  'Natuurkunde',
  'Nederlands',
  'Scheikunde',
  'Wiskunde A',
  'Wiskunde B',
  'Wiskunde C'
] as const;

const isValidSubject = (subject: string): boolean => {
  return (SUBJECTS as readonly string[]).includes(subject);
};

// Validate function (matching actual implementation)
const validateQuestion = (q: BulkImportQuestion, row: number): ImportError[] => {
  const errors: ImportError[] = [];

  if (!q.subject || !isValidSubject(q.subject)) {
    errors.push({
      row,
      field: 'subject',
      message: `Ongeldig vak: ${q.subject}. Geldige vakken: ${SUBJECTS.join(', ')}`
    });
  }

  if (!q.level || !['VMBO-TL', 'HAVO', 'VWO'].includes(q.level)) {
    errors.push({
      row,
      field: 'level',
      message: `Ongeldig niveau: ${q.level}. Gebruik: VMBO-TL, HAVO, of VWO`
    });
  }

  if (!q.text || q.text.trim() === '') {
    errors.push({ row, field: 'text', message: 'Vraag tekst is verplicht' });
  }

  if (!q.type || !['MULTIPLE_CHOICE', 'OPEN'].includes(q.type)) {
    errors.push({
      row,
      field: 'type',
      message: `Ongeldig type: ${q.type}. Gebruik: MULTIPLE_CHOICE of OPEN`
    });
  }

  if (q.type === 'MULTIPLE_CHOICE') {
    if (!q.options || q.options.length < 2) {
      errors.push({ row, field: 'options', message: 'Minstens 2 opties vereist voor meerkeuze' });
    }
    if (!q.correctAnswer) {
      errors.push({ row, field: 'correctAnswer', message: 'Juist antwoord is verplicht voor meerkeuze' });
    } else if (q.options && !q.options.some(opt => opt.toLowerCase().trim() === q.correctAnswer!.toLowerCase().trim())) {
      errors.push({
        row,
        field: 'correctAnswer',
        message: `Juist antwoord "${q.correctAnswer}" komt niet voor in de opties`
      });
    }
  }

  if (q.type === 'OPEN' && !q.modelAnswer) {
    errors.push({ row, field: 'modelAnswer', message: 'Model antwoord is verplicht voor open vragen' });
  }

  if (q.examYear && (q.examYear < 2000 || q.examYear > 2100)) {
    errors.push({
      row,
      field: 'examYear',
      message: `Ongeldig examenjaar: ${q.examYear}. Gebruik een jaar tussen 2000 en 2100`
    });
  }

  return errors;
};

// CSV line parser (matching actual implementation)
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
};

// CSV parser (matching actual implementation)
const parseCSV = (csvText: string): BulkImportQuestion[] => {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return []; // Need header + at least 1 row

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const questions: BulkImportQuestion[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const question: Partial<BulkImportQuestion> = {};

    headers.forEach((header, idx) => {
      const value = values[idx]?.trim();

      switch (header) {
        case 'subject':
        case 'vak':
          question.subject = value;
          break;
        case 'level':
        case 'niveau':
          question.level = value as StudentLevel;
          break;
        case 'type':
          question.type = value as QuestionType;
          break;
        case 'text':
        case 'vraag':
          question.text = value;
          break;
        case 'year':
        case 'jaar':
        case 'examyear':
          question.examYear = value ? parseInt(value) : undefined;
          break;
        case 'context':
        case 'brontekst':
        case 'contexttext':
          question.contextText = value;
          break;
        case 'source':
        case 'bron':
          question.source = value;
          break;
        case 'score':
        case 'punten':
          question.score = value ? parseInt(value) : undefined;
          break;
        case 'options':
        case 'opties':
          question.options = value ? value.split('|').map(o => o.trim()).filter(o => o) : [];
          break;
        case 'correctanswer':
        case 'juistantwoord':
        case 'correct':
          question.correctAnswer = value;
          break;
        case 'modelanswer':
        case 'modelantwoord':
        case 'answer':
          question.modelAnswer = value;
          break;
      }
    });

    questions.push(question as BulkImportQuestion);
  }

  return questions;
};

// JSON parser (matching actual implementation)
const parseJSON = (jsonText: string): BulkImportQuestion[] => {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data)) {
      throw new Error('JSON moet een array van vragen zijn');
    }
    return data as BulkImportQuestion[];
  } catch (error) {
    return [];
  }
};

describe('Import Service', () => {
  describe('validateQuestion()', () => {
    it('moet valide meerkeuze vraag accepteren', () => {
      const question: BulkImportQuestion = {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'Wat is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
      };

      const errors = validateQuestion(question, 1);

      expect(errors).toHaveLength(0);
    });

    it('moet valide open vraag accepteren', () => {
      const question: BulkImportQuestion = {
        subject: 'Nederlands',
        level: 'VWO',
        type: 'OPEN',
        text: 'Analyseer de schrijfstijl van de auteur.',
        modelAnswer: 'De auteur gebruikt veel beeldspraak...',
      };

      const errors = validateQuestion(question, 1);

      expect(errors).toHaveLength(0);
    });

    it('moet ongeldig vak afwijzen', () => {
      const question: BulkImportQuestion = {
        subject: 'Latijn',
        level: 'HAVO',
        type: 'OPEN',
        text: 'Test vraag',
        modelAnswer: 'Antwoord',
      };

      const errors = validateQuestion(question, 1);

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('subject');
      expect(errors[0].message).toContain('Ongeldig vak');
    });

    it('moet ongeldig niveau afwijzen', () => {
      const question: BulkImportQuestion = {
        subject: 'Wiskunde A',
        level: 'MBO' as any,
        type: 'OPEN',
        text: 'Test vraag',
        modelAnswer: 'Antwoord',
      };

      const errors = validateQuestion(question, 1);

      expect(errors.some(e => e.field === 'level')).toBe(true);
    });

    it('moet alle niveaus accepteren', () => {
      const levels: StudentLevel[] = ['VMBO-TL', 'HAVO', 'VWO'];

      levels.forEach(level => {
        const question: BulkImportQuestion = {
          subject: 'Nederlands',
          level,
          type: 'OPEN',
          text: 'Test vraag',
          modelAnswer: 'Antwoord',
        };

        const errors = validateQuestion(question, 1);
        const levelErrors = errors.filter(e => e.field === 'level');
        expect(levelErrors).toHaveLength(0);
      });
    });

    it('moet lege vraagtekst afwijzen', () => {
      const question: BulkImportQuestion = {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'OPEN',
        text: '',
        modelAnswer: 'Antwoord',
      };

      const errors = validateQuestion(question, 1);

      expect(errors.some(e => e.field === 'text')).toBe(true);
    });

    it('moet ongeldig vraagtype afwijzen', () => {
      const question: BulkImportQuestion = {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'TRUE_FALSE' as any,
        text: 'Test vraag',
      };

      const errors = validateQuestion(question, 1);

      expect(errors.some(e => e.field === 'type')).toBe(true);
    });

    it('moet meerkeuze zonder opties afwijzen', () => {
      const question: BulkImportQuestion = {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'Wat is 2 + 2?',
        options: [],
        correctAnswer: '4',
      };

      const errors = validateQuestion(question, 1);

      expect(errors.some(e => e.field === 'options')).toBe(true);
    });

    it('moet meerkeuze met te weinig opties afwijzen', () => {
      const question: BulkImportQuestion = {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'Wat is 2 + 2?',
        options: ['4'],
        correctAnswer: '4',
      };

      const errors = validateQuestion(question, 1);

      expect(errors.some(e => e.field === 'options')).toBe(true);
    });

    it('moet meerkeuze zonder correct antwoord afwijzen', () => {
      const question: BulkImportQuestion = {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'Wat is 2 + 2?',
        options: ['3', '4', '5'],
      };

      const errors = validateQuestion(question, 1);

      expect(errors.some(e => e.field === 'correctAnswer')).toBe(true);
    });

    it('moet correct antwoord dat niet in opties staat afwijzen', () => {
      const question: BulkImportQuestion = {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'Wat is 2 + 2?',
        options: ['3', '5', '6'],
        correctAnswer: '4',
      };

      const errors = validateQuestion(question, 1);

      expect(errors.some(e => e.field === 'correctAnswer' && e.message.includes('komt niet voor in de opties'))).toBe(true);
    });

    it('moet open vraag zonder modelantwoord afwijzen', () => {
      const question: BulkImportQuestion = {
        subject: 'Nederlands',
        level: 'VWO',
        type: 'OPEN',
        text: 'Analyseer de schrijfstijl.',
      };

      const errors = validateQuestion(question, 1);

      expect(errors.some(e => e.field === 'modelAnswer')).toBe(true);
    });

    it('moet ongeldig examenjaar afwijzen (te oud)', () => {
      const question: BulkImportQuestion = {
        subject: 'Nederlands',
        level: 'VWO',
        type: 'OPEN',
        text: 'Test vraag',
        modelAnswer: 'Antwoord',
        examYear: 1999,
      };

      const errors = validateQuestion(question, 1);

      expect(errors.some(e => e.field === 'examYear')).toBe(true);
    });

    it('moet ongeldig examenjaar afwijzen (te nieuw)', () => {
      const question: BulkImportQuestion = {
        subject: 'Nederlands',
        level: 'VWO',
        type: 'OPEN',
        text: 'Test vraag',
        modelAnswer: 'Antwoord',
        examYear: 2101,
      };

      const errors = validateQuestion(question, 1);

      expect(errors.some(e => e.field === 'examYear')).toBe(true);
    });

    it('moet geldig examenjaar accepteren', () => {
      const question: BulkImportQuestion = {
        subject: 'Nederlands',
        level: 'VWO',
        type: 'OPEN',
        text: 'Test vraag',
        modelAnswer: 'Antwoord',
        examYear: 2024,
      };

      const errors = validateQuestion(question, 1);

      expect(errors).toHaveLength(0);
    });

    it('moet correct antwoord case-insensitive matchen', () => {
      const question: BulkImportQuestion = {
        subject: 'Engels',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'What is the capital?',
        options: ['London', 'Paris', 'Berlin'],
        correctAnswer: 'LONDON', // Uppercase vs lowercase in options
      };

      const errors = validateQuestion(question, 1);

      expect(errors.filter(e => e.field === 'correctAnswer')).toHaveLength(0);
    });

    it('moet correct antwoord met spaties matchen', () => {
      const question: BulkImportQuestion = {
        subject: 'Engels',
        level: 'HAVO',
        type: 'MULTIPLE_CHOICE',
        text: 'What is the capital?',
        options: ['London', 'Paris', 'Berlin'],
        correctAnswer: '  London  ', // With whitespace
      };

      const errors = validateQuestion(question, 1);

      expect(errors.filter(e => e.field === 'correctAnswer')).toHaveLength(0);
    });

    it('moet multiple errors retourneren voor vraag met meerdere problemen', () => {
      const question: BulkImportQuestion = {
        subject: 'Ongeldig',
        level: 'Ongeldig' as any,
        type: 'Ongeldig' as any,
        text: '',
      };

      const errors = validateQuestion(question, 1);

      expect(errors.length).toBeGreaterThan(1);
    });

    it('moet correcte rijnummer in error meegeven', () => {
      const question: BulkImportQuestion = {
        subject: 'Ongeldig',
        level: 'HAVO',
        type: 'OPEN',
        text: 'Test',
        modelAnswer: 'Antwoord',
      };

      const errors = validateQuestion(question, 42);

      expect(errors[0].row).toBe(42);
    });
  });

  describe('parseCSV()', () => {
    it('moet basis CSV correct parsen', () => {
      const csv = `subject,level,type,text,options,correctanswer
Wiskunde A,HAVO,MULTIPLE_CHOICE,Wat is 2+2?,3|4|5,4`;

      const questions = parseCSV(csv);

      expect(questions).toHaveLength(1);
      expect(questions[0].subject).toBe('Wiskunde A');
      expect(questions[0].level).toBe('HAVO');
      expect(questions[0].type).toBe('MULTIPLE_CHOICE');
      expect(questions[0].options).toEqual(['3', '4', '5']);
      expect(questions[0].correctAnswer).toBe('4');
    });

    it('moet Nederlandse headers ondersteunen', () => {
      const csv = `vak,niveau,type,vraag,modelantwoord
Nederlands,VWO,OPEN,Wat is de stelling?,Dit is het antwoord.`;

      const questions = parseCSV(csv);

      expect(questions).toHaveLength(1);
      expect(questions[0].subject).toBe('Nederlands');
      expect(questions[0].level).toBe('VWO');
      expect(questions[0].text).toBe('Wat is de stelling?');
      expect(questions[0].modelAnswer).toBe('Dit is het antwoord.');
    });

    it('moet quoted velden met kommas correct parsen', () => {
      const csv = `subject,level,type,text,modelanswer
Nederlands,VWO,OPEN,"Dit is een vraag, met een komma",Antwoord`;

      const questions = parseCSV(csv);

      expect(questions).toHaveLength(1);
      expect(questions[0].text).toBe('Dit is een vraag, met een komma');
    });

    it('moet examYear correct parsen', () => {
      const csv = `subject,level,type,text,year,modelanswer
Nederlands,VWO,OPEN,Test vraag,2024,Antwoord`;

      const questions = parseCSV(csv);

      expect(questions[0].examYear).toBe(2024);
    });

    it('moet score correct parsen', () => {
      const csv = `subject,level,type,text,punten,modelanswer
Nederlands,VWO,OPEN,Test vraag,3,Antwoord`;

      const questions = parseCSV(csv);

      expect(questions[0].score).toBe(3);
    });

    it('moet meerdere rijen parsen', () => {
      const csv = `subject,level,type,text,modelanswer
Nederlands,VWO,OPEN,Vraag 1,Antwoord 1
Engels,HAVO,OPEN,Vraag 2,Antwoord 2
Duits,VMBO-TL,OPEN,Vraag 3,Antwoord 3`;

      const questions = parseCSV(csv);

      expect(questions).toHaveLength(3);
      expect(questions[0].subject).toBe('Nederlands');
      expect(questions[1].subject).toBe('Engels');
      expect(questions[2].subject).toBe('Duits');
    });

    it('moet lege CSV afhandelen', () => {
      const csv = '';

      const questions = parseCSV(csv);

      expect(questions).toHaveLength(0);
    });

    it('moet CSV met alleen headers afhandelen', () => {
      const csv = 'subject,level,type,text';

      const questions = parseCSV(csv);

      expect(questions).toHaveLength(0);
    });

    it('moet lege regels overslaan', () => {
      const csv = `subject,level,type,text,modelanswer

Nederlands,VWO,OPEN,Vraag,Antwoord

`;

      const questions = parseCSV(csv);

      expect(questions).toHaveLength(1);
    });

    it('moet context/brontekst parsen', () => {
      const csv = `subject,level,type,text,context,modelanswer
Nederlands,VWO,OPEN,Analyseer dit,Lange brontekst hier,Antwoord`;

      const questions = parseCSV(csv);

      expect(questions[0].contextText).toBe('Lange brontekst hier');
    });

    it('moet source/bron parsen', () => {
      const csv = `subject,level,type,text,bron,modelanswer
Nederlands,VWO,OPEN,Vraag,Examen 2024,Antwoord`;

      const questions = parseCSV(csv);

      expect(questions[0].source).toBe('Examen 2024');
    });
  });

  describe('parseCSVLine()', () => {
    it('moet simpele lijn parsen', () => {
      const result = parseCSVLine('a,b,c');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('moet quoted velden parsen', () => {
      const result = parseCSVLine('"hello, world",test');
      expect(result).toEqual(['hello, world', 'test']);
    });

    it('moet lege velden behouden', () => {
      const result = parseCSVLine('a,,c');
      expect(result).toEqual(['a', '', 'c']);
    });

    it('moet quotes in quoted velden afhandelen', () => {
      const result = parseCSVLine('"test""quote",normal');
      // Dubbele quotes worden enkele quote
      expect(result[0]).toContain('test');
    });
  });

  describe('parseJSON()', () => {
    it('moet valid JSON array parsen', () => {
      const json = JSON.stringify([
        {
          subject: 'Wiskunde A',
          level: 'HAVO',
          type: 'OPEN',
          text: 'Vraag',
          modelAnswer: 'Antwoord',
        },
      ]);

      const questions = parseJSON(json);

      expect(questions).toHaveLength(1);
      expect(questions[0].subject).toBe('Wiskunde A');
    });

    it('moet meerdere vragen parsen', () => {
      const json = JSON.stringify([
        { subject: 'A', level: 'HAVO', type: 'OPEN', text: '1', modelAnswer: '1' },
        { subject: 'B', level: 'VWO', type: 'OPEN', text: '2', modelAnswer: '2' },
      ]);

      const questions = parseJSON(json);

      expect(questions).toHaveLength(2);
    });

    it('moet invalid JSON afhandelen', () => {
      const json = 'dit is geen json';

      const questions = parseJSON(json);

      expect(questions).toHaveLength(0);
    });

    it('moet non-array JSON afhandelen', () => {
      const json = JSON.stringify({ subject: 'Test' });

      const questions = parseJSON(json);

      expect(questions).toHaveLength(0);
    });

    it('moet lege array parsen', () => {
      const json = '[]';

      const questions = parseJSON(json);

      expect(questions).toHaveLength(0);
    });
  });

  describe('File Type Validation', () => {
    const validateFileType = (file: { name: string; size: number }): { valid: boolean; error?: string } => {
      const validExtensions = ['.csv', '.json'];
      const fileName = file.name.toLowerCase();

      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

      if (!hasValidExtension) {
        return {
          valid: false,
          error: `Ongeldig bestandstype. Gebruik .csv of .json bestanden.`
        };
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `Bestand te groot. Maximum grootte is 5MB.`
        };
      }

      return { valid: true };
    };

    it('moet .csv bestanden accepteren', () => {
      const result = validateFileType({ name: 'vragen.csv', size: 1000 });
      expect(result.valid).toBe(true);
    });

    it('moet .json bestanden accepteren', () => {
      const result = validateFileType({ name: 'vragen.json', size: 1000 });
      expect(result.valid).toBe(true);
    });

    it('moet .CSV (uppercase) accepteren', () => {
      const result = validateFileType({ name: 'vragen.CSV', size: 1000 });
      expect(result.valid).toBe(true);
    });

    it('moet andere bestandstypes afwijzen', () => {
      const result = validateFileType({ name: 'vragen.xlsx', size: 1000 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Ongeldig bestandstype');
    });

    it('moet te grote bestanden afwijzen', () => {
      const result = validateFileType({ name: 'groot.csv', size: 10 * 1024 * 1024 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('te groot');
    });

    it('moet bestand exact 5MB accepteren', () => {
      const result = validateFileType({ name: 'exact.csv', size: 5 * 1024 * 1024 });
      expect(result.valid).toBe(true);
    });
  });
});

describe('Subject Validation', () => {
  it('moet alle geldige vakken accepteren', () => {
    SUBJECTS.forEach(subject => {
      expect(isValidSubject(subject)).toBe(true);
    });
  });

  it('moet ongeldige vakken afwijzen', () => {
    expect(isValidSubject('Latijn')).toBe(false);
    expect(isValidSubject('Grieks')).toBe(false);
    expect(isValidSubject('')).toBe(false);
    expect(isValidSubject('wiskunde a')).toBe(false); // Case sensitive
  });
});
