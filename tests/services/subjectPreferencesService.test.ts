/**
 * Subject Preferences Service Tests
 * Test zichtbaarheid van vakken op basis van selectie
 */

import { describe, it, expect } from 'vitest';
import { getVisibleSubjects } from '../../services/subjectPreferencesService';
import { SUBJECTS, isValidSubject } from '../../constants/subjects';

describe('getVisibleSubjects', () => {
  it('moet alle vakken tonen als selectedSubjects null is', () => {
    const result = getVisibleSubjects(null);
    expect(result).toEqual(SUBJECTS);
  });

  it('moet alle vakken tonen als selectedSubjects undefined is', () => {
    const result = getVisibleSubjects(undefined);
    expect(result).toEqual(SUBJECTS);
  });

  it('moet alle vakken tonen als selectedSubjects een lege array is', () => {
    const result = getVisibleSubjects([]);
    expect(result).toEqual(SUBJECTS);
  });

  it('moet alleen geselecteerde vakken retourneren', () => {
    const selected = ['Wiskunde A', 'Nederlands', 'Engels'];
    const result = getVisibleSubjects(selected);

    expect(result).toHaveLength(3);
    expect(result).toContain('Wiskunde A');
    expect(result).toContain('Nederlands');
    expect(result).toContain('Engels');
  });

  it('moet vakken retourneren in de volgorde van SUBJECTS', () => {
    // Geef ze in willekeurige volgorde
    const selected = ['Engels', 'Aardrijkskunde', 'Nederlands'];
    const result = getVisibleSubjects(selected);

    // Verwachte volgorde op basis van SUBJECTS array
    expect(result[0]).toBe('Aardrijkskunde'); // index 0 in SUBJECTS
    expect(result[1]).toBe('Engels');          // index 5 in SUBJECTS
    expect(result[2]).toBe('Nederlands');      // index 11 in SUBJECTS
  });

  it('moet ongeldige vakken negeren', () => {
    const selected = ['Wiskunde A', 'OngeldigVak', 'Nederlands'];
    const result = getVisibleSubjects(selected);

    expect(result).toHaveLength(2);
    expect(result).toContain('Wiskunde A');
    expect(result).toContain('Nederlands');
    expect(result).not.toContain('OngeldigVak');
  });

  it('moet correct werken met één geselecteerd vak', () => {
    const selected = ['Biologie'];
    const result = getVisibleSubjects(selected);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Biologie');
  });

  it('moet correct werken met alle vakken geselecteerd', () => {
    const selected = [...SUBJECTS];
    const result = getVisibleSubjects(selected);

    expect(result).toHaveLength(SUBJECTS.length);
    expect(result).toEqual(SUBJECTS);
  });
});

describe('SUBJECTS constante', () => {
  it('moet 16 vakken bevatten', () => {
    expect(SUBJECTS).toHaveLength(16);
  });

  it('moet alle verwachte vakken bevatten', () => {
    const expectedSubjects = [
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
      'Wiskunde C',
    ];

    expectedSubjects.forEach(subject => {
      expect(SUBJECTS).toContain(subject);
    });
  });

  it('moet alfabetisch gesorteerd zijn', () => {
    const sorted = [...SUBJECTS].sort();
    expect(SUBJECTS).toEqual(sorted);
  });
});

describe('isValidSubject', () => {
  it('moet geldige vakken accepteren', () => {
    expect(isValidSubject('Wiskunde A')).toBe(true);
    expect(isValidSubject('Nederlands')).toBe(true);
    expect(isValidSubject('Biologie')).toBe(true);
  });

  it('moet ongeldige vakken afwijzen', () => {
    expect(isValidSubject('OngeldigVak')).toBe(false);
    expect(isValidSubject('')).toBe(false);
    expect(isValidSubject('wiskunde a')).toBe(false); // case-sensitive
  });
});
