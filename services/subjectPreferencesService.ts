import { Subject, SUBJECTS } from '../constants/subjects';

export interface SubjectPreferences {
  showAll: boolean;
  selectedSubjects: string[];
}

const STORAGE_KEY_PREFIX = 'subject_preferences_';

function getStorageKey(email: string): string {
  return `${STORAGE_KEY_PREFIX}${email.toLowerCase()}`;
}

export function getSubjectPreferences(email: string): SubjectPreferences {
  try {
    const raw = localStorage.getItem(getStorageKey(email));
    if (!raw) {
      return { showAll: true, selectedSubjects: [...SUBJECTS] };
    }
    const parsed = JSON.parse(raw) as SubjectPreferences;
    return parsed;
  } catch {
    return { showAll: true, selectedSubjects: [...SUBJECTS] };
  }
}

export function saveSubjectPreferences(email: string, prefs: SubjectPreferences): void {
  localStorage.setItem(getStorageKey(email), JSON.stringify(prefs));
}

export function getVisibleSubjects(email: string): readonly string[] {
  const prefs = getSubjectPreferences(email);
  if (prefs.showAll) {
    return SUBJECTS;
  }
  // Return in the same order as SUBJECTS
  return SUBJECTS.filter(s => prefs.selectedSubjects.includes(s));
}
