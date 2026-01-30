import React, { useState, useEffect } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { SUBJECTS } from '../constants/subjects';
import { getSubjectIcon, getSubjectColor } from '../utils/subjectIcons';
import {
  SubjectPreferences,
  getSubjectPreferences,
  saveSubjectPreferences
} from '../services/subjectPreferencesService';

interface SubjectPackageSettingsProps {
  userEmail: string;
}

export const SubjectPackageSettings: React.FC<SubjectPackageSettingsProps> = ({
  userEmail
}) => {
  const [prefs, setPrefs] = useState<SubjectPreferences>({ showAll: true, selectedSubjects: [...SUBJECTS] });

  useEffect(() => {
    if (userEmail) {
      setPrefs(getSubjectPreferences(userEmail));
    }
  }, [userEmail]);

  const save = (updated: SubjectPreferences) => {
    setPrefs(updated);
    saveSubjectPreferences(userEmail, updated);
  };

  const toggleShowAll = () => {
    if (prefs.showAll) {
      // Switching to custom: keep current selection (all)
      save({ showAll: false, selectedSubjects: [...SUBJECTS] });
    } else {
      save({ showAll: true, selectedSubjects: [...SUBJECTS] });
    }
  };

  const toggleSubject = (subject: string) => {
    if (prefs.showAll) return;
    const selected = new Set(prefs.selectedSubjects);
    if (selected.has(subject)) {
      selected.delete(subject);
    } else {
      selected.add(subject);
    }
    save({ showAll: false, selectedSubjects: Array.from(selected) });
  };

  const selectAll = () => {
    save({ showAll: false, selectedSubjects: [...SUBJECTS] });
  };

  const deselectAll = () => {
    save({ showAll: false, selectedSubjects: [] });
  };

  const selectedCount = prefs.showAll ? SUBJECTS.length : prefs.selectedSubjects.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Vakkenpakket</h2>
            <p className="text-sm text-slate-500">Kies welke vakken je op je dashboard wilt zien</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Toggle: alle vakken of custom selectie */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">Alle vakken tonen</p>
            <p className="text-sm text-slate-500">
              {prefs.showAll
                ? 'Alle 16 vakken worden getoond'
                : `${selectedCount} van ${SUBJECTS.length} vakken geselecteerd`}
            </p>
          </div>
          <button
            onClick={toggleShowAll}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              prefs.showAll ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                prefs.showAll ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Subject selection grid (only when not showAll) */}
        {!prefs.showAll && (
          <>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-500">Selecteer je vakken</span>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Alles selecteren
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={deselectAll}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                >
                  Alles deselecteren
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUBJECTS.map((subject) => {
                const isSelected = prefs.selectedSubjects.includes(subject);
                const Icon = getSubjectIcon(subject);
                const colorClass = getSubjectColor(subject);

                return (
                  <button
                    key={subject}
                    onClick={() => toggleSubject(subject)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-indigo-200 bg-indigo-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? colorClass : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className={`text-sm font-medium flex-1 ${
                      isSelected ? 'text-slate-900' : 'text-slate-400'
                    }`}>
                      {subject}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedCount === 0 && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <p className="text-sm text-amber-800 font-medium">
                  Selecteer minstens 1 vak om op je dashboard te tonen.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
