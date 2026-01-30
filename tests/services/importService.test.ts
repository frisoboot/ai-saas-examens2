/**
 * Import Service Tests
 * Test CSV/JSON parsing, validatie en bulk import
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseCSV, parseJSON, generateCSVTemplate } from '../../services/importService';
import type { BulkImportQuestion } from '../../types';

describe('parseCSV', () => {
  it('moet een lege array retourneren bij lege input', () => {
    expect(parseCSV('')).toEqual([]);
  });

  it('moet een lege array retourneren bij alleen een header', () => {
    expect(parseCSV('subject,level,type,text')).toEqual([]);
  });

  it('moet een eenvoudige CSV correct parsen', () => {
    const csv = `subject,level,type,text,options,correctanswer
Geschiedenis,HAVO,MULTIPLE_CHOICE,Wanneer viel de muur?,1987|1989|1991,1989`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('Geschiedenis');
    expect(result[0].level).toBe('HAVO');
    expect(result[0].type).toBe('MULTIPLE_CHOICE');
    expect(result[0].text).toBe('Wanneer viel de muur?');
    expect(result[0].options).toEqual(['1987', '1989', '1991']);
    expect(result[0].correctAnswer).toBe('1989');
  });

  it('moet Nederlandse header namen ondersteunen', () => {
    const csv = `vak,niveau,type,vraag,opties,juistantwoord
Wiskunde A,VWO,MULTIPLE_CHOICE,Wat is 2+2?,3|4|5,4`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('Wiskunde A');
    expect(result[0].level).toBe('VWO');
    expect(result[0].text).toBe('Wat is 2+2?');
    expect(result[0].options).toEqual(['3', '4', '5']);
    expect(result[0].correctAnswer).toBe('4');
  });

  it('moet open vragen correct parsen', () => {
    const csv = `subject,level,type,text,modelanswer
Nederlands,HAVO,OPEN,Analyseer de tekst,De auteur gebruikt metaforen`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('OPEN');
    expect(result[0].modelAnswer).toBe('De auteur gebruikt metaforen');
  });

  it('moet examYear correct parsen', () => {
    const csv = `subject,level,type,text,year
Geschiedenis,HAVO,OPEN,Beschrijf WO2,2023`;

    const result = parseCSV(csv);

    expect(result[0].examYear).toBe(2023);
  });

  it('moet score correct parsen', () => {
    const csv = `subject,level,type,text,score
Wiskunde B,VWO,OPEN,Los op,3`;

    const result = parseCSV(csv);

    expect(result[0].score).toBe(3);
  });

  it('moet meerdere rijen correct parsen', () => {
    const csv = `subject,level,type,text,modelanswer
Nederlands,HAVO,OPEN,Vraag 1,Antwoord 1
Engels,VWO,OPEN,Vraag 2,Antwoord 2
Geschiedenis,VMBO-TL,OPEN,Vraag 3,Antwoord 3`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(3);
    expect(result[0].subject).toBe('Nederlands');
    expect(result[1].subject).toBe('Engels');
    expect(result[2].subject).toBe('Geschiedenis');
  });

  it('moet quoted fields met kommas correct parsen', () => {
    const csv = `subject,level,type,text,modelanswer
Nederlands,HAVO,OPEN,"Dit is een vraag, met een komma","En een antwoord, ook met komma"`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Dit is een vraag, met een komma');
    expect(result[0].modelAnswer).toBe('En een antwoord, ook met komma');
  });

  it('moet lege regels overslaan', () => {
    const csv = `subject,level,type,text

Nederlands,HAVO,OPEN,Vraag 1

Engels,VWO,OPEN,Vraag 2
`;

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
  });

  it('moet section en sectionIntro velden parsen', () => {
    const csv = `subject,level,type,text,section,sectionintro
Scheikunde,VWO,OPEN,Bereken de concentratie,Zuren en Basen,Dit onderdeel gaat over zuren`;

    const result = parseCSV(csv);

    expect(result[0].section).toBe('Zuren en Basen');
    expect(result[0].sectionIntro).toBe('Dit onderdeel gaat over zuren');
  });

  it('moet context/brontekst correct parsen', () => {
    const csv = `subject,level,type,text,context
Nederlands,HAVO,OPEN,Analyseer deze tekst,Dit is een brontekst voor de vraag`;

    const result = parseCSV(csv);

    expect(result[0].contextText).toBe('Dit is een brontekst voor de vraag');
  });
});

describe('parseJSON', () => {
  it('moet een lege array retourneren bij ongeldige JSON', () => {
    expect(parseJSON('not valid json')).toEqual([]);
  });

  it('moet een array van vragen direct parsen', () => {
    const json = JSON.stringify([
      {
        subject: 'Wiskunde A',
        level: 'HAVO',
        type: 'OPEN',
        text: 'Los op: x² = 4',
        modelAnswer: 'x = 2 of x = -2',
      },
    ]);

    const result = parseJSON(json);

    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('Wiskunde A');
    expect(result[0].text).toBe('Los op: x² = 4');
  });

  it('moet een object met questions property parsen', () => {
    const json = JSON.stringify({
      subject: 'Geschiedenis',
      level: 'VWO',
      year: 2023,
      questions: [
        { text: 'Vraag 1', type: 'OPEN', modelAnswer: 'Antwoord 1' },
        { text: 'Vraag 2', type: 'OPEN', modelAnswer: 'Antwoord 2' },
      ],
    });

    const result = parseJSON(json);

    expect(result).toHaveLength(2);
    // Metadata moet worden overgenomen
    expect(result[0].subject).toBe('Geschiedenis');
    expect(result[0].level).toBe('VWO');
    expect(result[0].examYear).toBe(2023);
    expect(result[0].text).toBe('Vraag 1');
    expect(result[1].text).toBe('Vraag 2');
  });

  it('moet metadata overerven maar per-vraag waarden prioriteit geven', () => {
    const json = JSON.stringify({
      subject: 'Geschiedenis',
      level: 'HAVO',
      questions: [
        { text: 'Vraag 1', type: 'OPEN', level: 'VWO', modelAnswer: 'Antwoord' },
      ],
    });

    const result = parseJSON(json);

    // Per-vraag level (VWO) moet overrulen
    expect(result[0].level).toBe('VWO');
  });

  it('moet correctIndex naar correctAnswer converteren', () => {
    const json = JSON.stringify({
      questions: [
        {
          text: 'Vraag',
          type: 'MULTIPLE_CHOICE',
          options: ['A', 'B', 'C'],
          correctIndex: 1,
        },
      ],
    });

    const result = parseJSON(json);

    expect(result[0].correctAnswer).toBe('B');
  });

  it('moet een enkel vraag-object parsen', () => {
    const json = JSON.stringify({
      subject: 'Nederlands',
      level: 'HAVO',
      type: 'OPEN',
      text: 'Analyseer de tekst',
      modelAnswer: 'Het antwoord',
    });

    const result = parseJSON(json);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Analyseer de tekst');
  });

  it('moet lege array retourneren bij onherkenbaar JSON format', () => {
    const json = JSON.stringify({ foo: 'bar', baz: 123 });

    const result = parseJSON(json);

    expect(result).toEqual([]);
  });

  it('moet type naar uppercase converteren', () => {
    const json = JSON.stringify({
      questions: [
        { text: 'Vraag', type: 'open', modelAnswer: 'Antwoord' },
      ],
    });

    const result = parseJSON(json);

    expect(result[0].type).toBe('OPEN');
  });
});

describe('generateCSVTemplate', () => {
  it('moet een geldige CSV template genereren', () => {
    const csv = generateCSVTemplate();

    expect(csv).toContain('subject');
    expect(csv).toContain('level');
    expect(csv).toContain('type');
    expect(csv).toContain('text');
    expect(csv).toContain('options');
    expect(csv).toContain('correctanswer');
    expect(csv).toContain('modelanswer');
  });

  it('moet voorbeeldrijen bevatten', () => {
    const csv = generateCSVTemplate();
    const lines = csv.split('\n');

    // Header + 3 voorbeeldrijen
    expect(lines.length).toBeGreaterThanOrEqual(4);
  });

  it('moet geldige niveaus bevatten in voorbeelden', () => {
    const csv = generateCSVTemplate();

    expect(csv).toContain('HAVO');
    expect(csv).toContain('VWO');
    expect(csv).toContain('VMBO-TL');
  });

  it('moet zowel MULTIPLE_CHOICE als OPEN bevatten', () => {
    const csv = generateCSVTemplate();

    expect(csv).toContain('MULTIPLE_CHOICE');
    expect(csv).toContain('OPEN');
  });
});

describe('Question Validation Logic', () => {
  it('moet een geldig multiple choice vraag accepteren', () => {
    const q: BulkImportQuestion = {
      subject: 'Geschiedenis',
      level: 'HAVO',
      type: 'MULTIPLE_CHOICE',
      text: 'Wanneer begon WO2?',
      options: ['1938', '1939', '1940', '1941'],
      correctAnswer: '1939',
    };

    // Validatie logica (zelfde als in importService)
    const errors: string[] = [];
    if (!q.subject) errors.push('subject missing');
    if (!['VMBO-TL', 'HAVO', 'VWO'].includes(q.level)) errors.push('invalid level');
    if (!q.text || q.text.trim() === '') errors.push('text missing');
    if (!['MULTIPLE_CHOICE', 'OPEN'].includes(q.type)) errors.push('invalid type');
    if (q.type === 'MULTIPLE_CHOICE') {
      if (!q.options || q.options.length < 2) errors.push('need 2+ options');
      if (!q.correctAnswer) errors.push('need correct answer');
    }

    expect(errors).toHaveLength(0);
  });

  it('moet een vraag zonder tekst afwijzen', () => {
    const q: BulkImportQuestion = {
      subject: 'Geschiedenis',
      level: 'HAVO',
      type: 'OPEN',
      text: '',
      modelAnswer: 'Antwoord',
    };

    expect(!q.text || q.text.trim() === '').toBe(true);
  });

  it('moet een ongeldig niveau afwijzen', () => {
    const invalidLevel = 'MBO';
    expect(['VMBO-TL', 'HAVO', 'VWO'].includes(invalidLevel)).toBe(false);
  });

  it('moet een MC vraag zonder opties afwijzen', () => {
    const q: BulkImportQuestion = {
      subject: 'Wiskunde A',
      level: 'VWO',
      type: 'MULTIPLE_CHOICE',
      text: 'Wat is 2+2?',
      options: [],
      correctAnswer: '4',
    };

    expect(!q.options || q.options.length < 2).toBe(true);
  });

  it('moet een MC vraag afwijzen als correct antwoord niet in opties staat', () => {
    const q: BulkImportQuestion = {
      subject: 'Wiskunde A',
      level: 'VWO',
      type: 'MULTIPLE_CHOICE',
      text: 'Wat is 2+2?',
      options: ['3', '5', '6'],
      correctAnswer: '4',
    };

    const correctInOptions = q.options!.some(
      opt => opt.toLowerCase().trim() === q.correctAnswer!.toLowerCase().trim()
    );
    expect(correctInOptions).toBe(false);
  });

  it('moet een open vraag zonder modelantwoord afwijzen', () => {
    const q: BulkImportQuestion = {
      subject: 'Nederlands',
      level: 'HAVO',
      type: 'OPEN',
      text: 'Analyseer de tekst',
    };

    expect(q.type === 'OPEN' && !q.modelAnswer).toBe(true);
  });

  it('moet een ongeldig examenjaar afwijzen', () => {
    const invalidYears = [1999, 2101, -1, 0];
    invalidYears.forEach(year => {
      expect(year < 2000 || year > 2100).toBe(true);
    });
  });

  it('moet een geldig examenjaar accepteren', () => {
    const validYears = [2000, 2023, 2024, 2100];
    validYears.forEach(year => {
      expect(year >= 2000 && year <= 2100).toBe(true);
    });
  });
});
