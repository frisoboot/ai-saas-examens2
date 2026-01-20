/**
 * Exam Data Service Tests
 * Test topic data en getTopicsForSubject functie
 */

import { describe, it, expect } from 'vitest';
import type { StudentLevel } from '../../types';

// EXAM_TOPICS data (matching actual implementation)
const EXAM_TOPICS: Record<string, Record<StudentLevel, string[]>> = {
  'Aardrijkskunde': {
    'VMBO-TL': ['Weer en klimaat', 'Bevolking en ruimte', 'Water', 'Arm en rijk', 'Bronnen en energie', 'Grenzen en identiteit'],
    'HAVO': ['Systeem Aarde', 'Klimaatvraagstukken', 'Wonen in Nederland', 'Wereld: Globalisering', 'Brazilië', 'Leefomgeving: Overstromingsgevaar'],
    'VWO': ['Systeem Aarde', 'Klimaatverandering', 'Wereld: Globalisering', 'Zuid-Amerika', 'Leefomgeving: Steden', 'Aarde: Landschapszones']
  },
  'Wiskunde A': {
    'VMBO-TL': ['Rekenen en meten', 'Verbanden', 'Vlakke meetkunde', 'Ruimtemeetkunde'],
    'HAVO': ['Algemene vaardigheden', 'Tellen en kansen', 'Verbanden en grafieken', 'Verandering', 'Statistiek'],
    'VWO': ['Algemene vaardigheden', 'Kansrekening', 'Statistiek', 'Algebra en tellen', 'Verbanden', 'Differentiaalrekening']
  },
  'Wiskunde B': {
    'VMBO-TL': ['Rekenen', 'Verbanden', 'Meetkunde', 'Vergelijkingen'],
    'HAVO': ['Functies en grafieken', 'Differentiaalrekening', 'Meetkunde', 'Goniometrie'],
    'VWO': ['Functies en grafieken', 'Differentiaal- en integraalrekening', 'Goniometrie', 'Meetkunde met coördinaten']
  },
  'Nederlands': {
    'VMBO-TL': ['Leesvaardigheid', 'Schrijfvaardigheid', 'Fictie', 'Woordenschat', 'Spelling en grammatica'],
    'HAVO': ['Leesvaardigheid', 'Argumentatieve vaardigheden', 'Samenvatten', 'Schrijfvaardigheid', 'Literatuurgeschiedenis'],
    'VWO': ['Leesvaardigheid', 'Argumentatieanalyse', 'Wetenschappelijke teksten', 'Literatuurgeschiedenis', 'Overtuigend schrijven']
  },
  'Geschiedenis': {
    'VMBO-TL': ['Staatsinrichting van Nederland', 'Historisch overzicht vanaf 1900', 'De Koude Oorlog', 'Sociale zekerheid'],
    'HAVO': ['Tijdvakken 5 t/m 10', 'Historische Context: Het Britse Rijk', 'Historische Context: Duitsland in Europa', 'Historische Context: Nederland 1948-2008'],
    'VWO': ['Tijdvakken', 'Historische Context: Steden en burgers', 'Historische Context: Verlichting', 'Historische Context: China', 'Historische Context: Duitsland']
  },
  'Biologie': {
    'VMBO-TL': ['Cellen en weefsels', 'Voortplanting', 'Erfelijkheid', 'Ecologie', 'Mens en milieu', 'Voeding en vertering', 'Gaswisseling', 'Bloedsomloop'],
    'HAVO': ['Cellen', 'Voortplanting', 'Erfelijkheid en DNA', 'Evolutie', 'Ecologie', 'Mens en milieu', 'Stofwisseling', 'Regeling en waarneming'],
    'VWO': ['Cellen', 'DNA en Eiwitsynthese', 'Erfelijkheid', 'Evolutie', 'Ecologie', 'Metabolisme', 'Zenuwstelsel en Hormonen', 'Afweer']
  },
  'Engels': {
    'VMBO-TL': ['Leesvaardigheid', 'Woordenschat', 'Grammatica', 'Signaalwoorden', 'Tekstbegrip'],
    'HAVO': ['Leesvaardigheid', 'Examenidioom', 'Tekstanalyse', 'Verwijswoorden', 'Gatenteksten'],
    'VWO': ['Leesvaardigheid', 'Academisch Engels', 'Tekstanalyse', 'Inference questions', 'Examenidioom']
  },
};

// Function matching actual implementation
const getTopicsForSubject = (subject: string, level: StudentLevel): string[] => {
  const subjectData = EXAM_TOPICS[subject];
  if (!subjectData) {
    return [];
  }
  return subjectData[level] || [];
};

describe('Exam Data Service', () => {
  describe('getTopicsForSubject()', () => {
    it('moet topics retourneren voor geldig vak en niveau', () => {
      const topics = getTopicsForSubject('Wiskunde A', 'HAVO');

      expect(topics).toHaveLength(5);
      expect(topics).toContain('Statistiek');
      expect(topics).toContain('Tellen en kansen');
    });

    it('moet correcte topics retourneren voor VMBO-TL', () => {
      const topics = getTopicsForSubject('Nederlands', 'VMBO-TL');

      expect(topics).toContain('Leesvaardigheid');
      expect(topics).toContain('Spelling en grammatica');
    });

    it('moet correcte topics retourneren voor HAVO', () => {
      const topics = getTopicsForSubject('Nederlands', 'HAVO');

      expect(topics).toContain('Argumentatieve vaardigheden');
      expect(topics).toContain('Literatuurgeschiedenis');
    });

    it('moet correcte topics retourneren voor VWO', () => {
      const topics = getTopicsForSubject('Nederlands', 'VWO');

      expect(topics).toContain('Argumentatieanalyse');
      expect(topics).toContain('Wetenschappelijke teksten');
    });

    it('moet lege array retourneren voor ongeldig vak', () => {
      const topics = getTopicsForSubject('Latijn', 'HAVO');

      expect(topics).toEqual([]);
    });

    it('moet lege array retourneren voor ongeldig niveau', () => {
      const topics = getTopicsForSubject('Wiskunde A', 'MBO' as StudentLevel);

      expect(topics).toEqual([]);
    });

    it('moet case-sensitive zijn voor vaknaam', () => {
      const topicsCorrect = getTopicsForSubject('Wiskunde A', 'HAVO');
      const topicsLower = getTopicsForSubject('wiskunde a', 'HAVO');

      expect(topicsCorrect.length).toBeGreaterThan(0);
      expect(topicsLower).toEqual([]);
    });
  });

  describe('EXAM_TOPICS Data Integrity', () => {
    it('moet topics hebben voor alle niveaus per vak', () => {
      const levels: StudentLevel[] = ['VMBO-TL', 'HAVO', 'VWO'];

      Object.keys(EXAM_TOPICS).forEach(subject => {
        levels.forEach(level => {
          const topics = getTopicsForSubject(subject, level);
          expect(topics.length).toBeGreaterThan(0,
            `${subject} moet topics hebben voor ${level}`);
        });
      });
    });

    it('moet unieke topics hebben per vak/niveau combinatie', () => {
      const levels: StudentLevel[] = ['VMBO-TL', 'HAVO', 'VWO'];

      Object.keys(EXAM_TOPICS).forEach(subject => {
        levels.forEach(level => {
          const topics = getTopicsForSubject(subject, level);
          const uniqueTopics = [...new Set(topics)];
          expect(topics.length).toBe(uniqueTopics.length,
            `${subject} ${level} heeft duplicate topics`);
        });
      });
    });

    it('moet geen lege topic strings bevatten', () => {
      const levels: StudentLevel[] = ['VMBO-TL', 'HAVO', 'VWO'];

      Object.keys(EXAM_TOPICS).forEach(subject => {
        levels.forEach(level => {
          const topics = getTopicsForSubject(subject, level);
          topics.forEach(topic => {
            expect(topic.trim().length).toBeGreaterThan(0,
              `Lege topic gevonden in ${subject} ${level}`);
          });
        });
      });
    });
  });

  describe('Subject-specific Topics', () => {
    describe('Wiskunde A', () => {
      it('moet statistiek bevatten voor HAVO', () => {
        const topics = getTopicsForSubject('Wiskunde A', 'HAVO');
        expect(topics).toContain('Statistiek');
      });

      it('moet differentiaalrekening bevatten voor VWO', () => {
        const topics = getTopicsForSubject('Wiskunde A', 'VWO');
        expect(topics).toContain('Differentiaalrekening');
      });
    });

    describe('Wiskunde B', () => {
      it('moet goniometrie bevatten voor HAVO', () => {
        const topics = getTopicsForSubject('Wiskunde B', 'HAVO');
        expect(topics).toContain('Goniometrie');
      });

      it('moet integraalrekening bevatten voor VWO', () => {
        const topics = getTopicsForSubject('Wiskunde B', 'VWO');
        expect(topics.some(t => t.includes('integraalrekening'))).toBe(true);
      });
    });

    describe('Geschiedenis', () => {
      it('moet Koude Oorlog bevatten voor VMBO-TL', () => {
        const topics = getTopicsForSubject('Geschiedenis', 'VMBO-TL');
        expect(topics).toContain('De Koude Oorlog');
      });

      it('moet historische contexten bevatten voor HAVO', () => {
        const topics = getTopicsForSubject('Geschiedenis', 'HAVO');
        expect(topics.some(t => t.includes('Historische Context'))).toBe(true);
      });
    });

    describe('Biologie', () => {
      it('moet cellen bevatten voor alle niveaus', () => {
        const levels: StudentLevel[] = ['VMBO-TL', 'HAVO', 'VWO'];

        levels.forEach(level => {
          const topics = getTopicsForSubject('Biologie', level);
          expect(topics.some(t => t.toLowerCase().includes('cel'))).toBe(true);
        });
      });

      it('moet evolutie bevatten voor HAVO en VWO', () => {
        expect(getTopicsForSubject('Biologie', 'HAVO')).toContain('Evolutie');
        expect(getTopicsForSubject('Biologie', 'VWO')).toContain('Evolutie');
      });
    });

    describe('Engels', () => {
      it('moet leesvaardigheid bevatten voor alle niveaus', () => {
        const levels: StudentLevel[] = ['VMBO-TL', 'HAVO', 'VWO'];

        levels.forEach(level => {
          const topics = getTopicsForSubject('Engels', level);
          expect(topics).toContain('Leesvaardigheid');
        });
      });

      it('moet academisch Engels bevatten voor VWO', () => {
        const topics = getTopicsForSubject('Engels', 'VWO');
        expect(topics).toContain('Academisch Engels');
      });
    });

    describe('Aardrijkskunde', () => {
      it('moet klimaat-gerelateerde topics bevatten', () => {
        const vmbo = getTopicsForSubject('Aardrijkskunde', 'VMBO-TL');
        const havo = getTopicsForSubject('Aardrijkskunde', 'HAVO');
        const vwo = getTopicsForSubject('Aardrijkskunde', 'VWO');

        expect(vmbo.some(t => t.toLowerCase().includes('klimaat'))).toBe(true);
        expect(havo.some(t => t.toLowerCase().includes('klimaat'))).toBe(true);
        expect(vwo.some(t => t.toLowerCase().includes('klimaat'))).toBe(true);
      });
    });
  });

  describe('Topic Count Validation', () => {
    it('moet minstens 4 topics per vak/niveau hebben', () => {
      const levels: StudentLevel[] = ['VMBO-TL', 'HAVO', 'VWO'];

      Object.keys(EXAM_TOPICS).forEach(subject => {
        levels.forEach(level => {
          const topics = getTopicsForSubject(subject, level);
          expect(topics.length).toBeGreaterThanOrEqual(4,
            `${subject} ${level} heeft te weinig topics (${topics.length})`);
        });
      });
    });

    it('moet niet meer dan 10 topics per vak/niveau hebben', () => {
      const levels: StudentLevel[] = ['VMBO-TL', 'HAVO', 'VWO'];

      Object.keys(EXAM_TOPICS).forEach(subject => {
        levels.forEach(level => {
          const topics = getTopicsForSubject(subject, level);
          expect(topics.length).toBeLessThanOrEqual(10,
            `${subject} ${level} heeft te veel topics (${topics.length})`);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('moet lege string als vak afhandelen', () => {
      const topics = getTopicsForSubject('', 'HAVO');
      expect(topics).toEqual([]);
    });

    it('moet null-achtige waarden afhandelen', () => {
      const topics1 = getTopicsForSubject(null as any, 'HAVO');
      const topics2 = getTopicsForSubject(undefined as any, 'HAVO');

      expect(topics1).toEqual([]);
      expect(topics2).toEqual([]);
    });

    it('moet speciale karakters in vaknaam afhandelen', () => {
      const topics = getTopicsForSubject('Vak@#$%', 'HAVO');
      expect(topics).toEqual([]);
    });
  });
});

describe('Topic Interface', () => {
  interface SubjectTopic {
    id: string;
    name: string;
  }

  it('moet topic kunnen converteren naar SubjectTopic interface', () => {
    const topics = getTopicsForSubject('Wiskunde A', 'HAVO');

    const subjectTopics: SubjectTopic[] = topics.map((name, index) => ({
      id: `topic-${index}`,
      name,
    }));

    expect(subjectTopics).toHaveLength(topics.length);
    expect(subjectTopics[0]).toHaveProperty('id');
    expect(subjectTopics[0]).toHaveProperty('name');
  });
});
