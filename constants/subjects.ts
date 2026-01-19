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

/**
 * Type guard to check if a string is a valid Subject
 * This provides proper type narrowing for TypeScript
 */
export function isValidSubject(subject: string): subject is Subject {
  return (SUBJECTS as readonly string[]).includes(subject);
}
