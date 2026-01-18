/**
 * Shared list of all available subjects in the exam platform.
 * Used across components, services, and validation.
 */
export const SUBJECTS = [
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

export type Subject = typeof SUBJECTS[number];
