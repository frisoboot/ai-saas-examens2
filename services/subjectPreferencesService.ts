import { SUBJECTS } from '../constants/subjects';
import { dbStudents } from './supabaseService';

/**
 * Save the selected subjects for a user to the database.
 * Pass null to show all subjects.
 */
export async function saveSelectedSubjects(email: string, selectedSubjects: string[] | null): Promise<void> {
  await dbStudents.updateSelectedSubjects(email, selectedSubjects);
}

/**
 * Get the list of visible subjects based on the profile's selectedSubjects field.
 * If selectedSubjects is null or undefined, all subjects are shown.
 */
export function getVisibleSubjects(selectedSubjects: string[] | null | undefined): readonly string[] {
  if (!selectedSubjects || selectedSubjects.length === 0) {
    return SUBJECTS;
  }
  // Return in the same order as SUBJECTS
  return SUBJECTS.filter(s => selectedSubjects.includes(s));
}
