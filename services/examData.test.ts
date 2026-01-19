import { describe, it, expect } from 'vitest';
import { EXAM_TOPICS, getTopicsForSubject } from './examData';

describe('EXAM_TOPICS', () => {
  it('should have topics for all major subjects', () => {
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
      expect(EXAM_TOPICS).toHaveProperty(subject);
    });
  });

  it('should have topics for all three student levels per subject', () => {
    const subjects = Object.keys(EXAM_TOPICS);
    const levels = ['VMBO-TL', 'HAVO', 'VWO'];

    subjects.forEach(subject => {
      levels.forEach(level => {
        expect(EXAM_TOPICS[subject]).toHaveProperty(level);
        expect(Array.isArray(EXAM_TOPICS[subject][level])).toBe(true);
        expect(EXAM_TOPICS[subject][level].length).toBeGreaterThan(0);
      });
    });
  });

  it('should have non-empty topic arrays for each subject level', () => {
    Object.entries(EXAM_TOPICS).forEach(([subject, levels]) => {
      Object.entries(levels).forEach(([level, topics]) => {
        expect(topics.length).toBeGreaterThan(0);
        topics.forEach(topic => {
          expect(topic).toBeTruthy();
          expect(typeof topic).toBe('string');
        });
      });
    });
  });

  it('should have specific topics for Wiskunde A HAVO', () => {
    const topics = EXAM_TOPICS['Wiskunde A']['HAVO'];
    expect(topics).toContain('Algemene vaardigheden');
    expect(topics).toContain('Tellen en kansen');
    expect(topics).toContain('Verbanden en grafieken');
  });

  it('should have specific topics for Biologie VWO', () => {
    const topics = EXAM_TOPICS['Biologie']['VWO'];
    expect(topics).toContain('DNA en Eiwitsynthese');
    expect(topics).toContain('Evolutie');
    expect(topics).toContain('Ecologie');
  });
});

describe('getTopicsForSubject', () => {
  it('should return topics for valid subject and level', () => {
    const topics = getTopicsForSubject('Wiskunde A', 'HAVO');
    expect(topics).toEqual([
      'Algemene vaardigheden',
      'Tellen en kansen',
      'Verbanden en grafieken',
      'Verandering',
      'Statistiek',
    ]);
  });

  it('should return topics for Nederlands VMBO-TL', () => {
    const topics = getTopicsForSubject('Nederlands', 'VMBO-TL');
    expect(topics).toContain('Leesvaardigheid');
    expect(topics).toContain('Schrijfvaardigheid');
    expect(topics.length).toBe(5);
  });

  it('should return topics for Scheikunde VWO', () => {
    const topics = getTopicsForSubject('Scheikunde', 'VWO');
    expect(topics).toContain('Atoombouw en binding');
    expect(topics).toContain('Koolstofchemie');
    expect(topics.length).toBe(7);
  });

  it('should return empty array for unknown subject', () => {
    const topics = getTopicsForSubject('Unknown Subject', 'HAVO');
    expect(topics).toEqual([]);
  });

  it('should return empty array for valid subject but invalid level', () => {
    const topics = getTopicsForSubject('Wiskunde A', 'INVALID' as any);
    expect(topics).toEqual([]);
  });

  it('should handle case-sensitive subject names', () => {
    const topics = getTopicsForSubject('wiskunde a', 'HAVO');
    expect(topics).toEqual([]);
  });

  it('should return different topics for different levels of same subject', () => {
    const vmboTopics = getTopicsForSubject('Biologie', 'VMBO-TL');
    const havoTopics = getTopicsForSubject('Biologie', 'HAVO');
    const vwoTopics = getTopicsForSubject('Biologie', 'VWO');

    expect(vmboTopics).not.toEqual(havoTopics);
    expect(havoTopics).not.toEqual(vwoTopics);
    expect(vmboTopics).not.toEqual(vwoTopics);
  });

  it('should return all topics for Natuurkunde HAVO', () => {
    const topics = getTopicsForSubject('Natuurkunde', 'HAVO');
    expect(topics).toEqual([
      'Beweging en wisselwerking',
      'Elektriciteit',
      'Eigenschappen van stoffen en materialen',
      'Technische automatisering',
      'Optica',
      'Straling',
    ]);
  });

  it('should return all topics for Engels VWO', () => {
    const topics = getTopicsForSubject('Engels', 'VWO');
    expect(topics).toEqual([
      'Leesvaardigheid',
      'Academisch Engels',
      'Tekstanalyse',
      'Inference questions',
      'Examenidioom',
    ]);
  });

  it('should work with all valid subjects and levels', () => {
    const subjects = Object.keys(EXAM_TOPICS);
    const levels = ['VMBO-TL', 'HAVO', 'VWO'];

    subjects.forEach(subject => {
      levels.forEach(level => {
        const topics = getTopicsForSubject(subject, level);
        expect(Array.isArray(topics)).toBe(true);
        expect(topics.length).toBeGreaterThan(0);
      });
    });
  });
});
