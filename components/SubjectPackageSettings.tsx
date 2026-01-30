import React, { useState, useEffect } from 'react';
import { BookOpen, Check, Loader2 } from 'lucide-react';
import { SUBJECTS } from '../constants/subjects';
import { getSubjectIcon, getSubjectColor } from '../utils/subjectIcons';
import { saveSelectedSubjects } from '../services/subjectPreferencesService';
import { useAuth } from '../contexts/AuthContext';

interface SubjectPackageSettingsProps {
  userEmail: string;
}

export const SubjectPackageSettings: React.FC<SubjectPackageSettingsProps> = ({
  userEmail
}) => {
  const { profile, refreshProfile } = useAuth();
  const [showAll, setShowAll] = useState(true);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([...SUBJECTS]);
  const [saving, setSaving] = useState(false);

  // Initialize from profile
  useEffect(() => {
    if (profile) {
      const hasSaved = profile.selectedSubjects !== null && profile.selectedSubjects !== undefined;
      setShowAll(!hasSaved);
      setSelectedSubjects(hasSaved ? profile.selectedSubjects! : [...SUBJECTS]);
    }
  }, [profile]);

  const persist = async (subjects: string[] | null) => {
    if (!userEmail) return;
    setSaving(true);
    try {
      await saveSelectedSubjects(userEmail, subjects);
      await refreshProfile();
    } catch (error) {
      console.error('Fout bij opslaan vakkenpakket:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleShowAll = async () => {
    if (showAll) {
      // Switch to custom: save current full list
      setShowAll(false);
      setSelectedSubjects([...SUBJECTS]);
      await persist([...SUBJECTS]);
    } else {
      // Switch to show all: save null
      setShowAll(true);
      setSelectedSubjects([...SUBJECTS]);
      await persist(null);
    }
  };

  const handleToggleSubject = async (subject: string) => {
    if (showAll) return;
    const updated = selectedSubjects.includes(subject)
      ? selectedSubjects.filter(s => s !== subject)
      : [...selectedSubjects, subject];
    setSelectedSubjects(updated);
    await persist(updated);
  };

  const handleSelectAll = async () => {
    setSelectedSubjects([...SUBJECTS]);
    await persist([...SUBJECTS]);
  };

  const handleDeselectAll = async () => {
    setSelectedSubjects([]);
    await persist([]);
  };

  const selectedCount = showAll ? SUBJECTS.length : selectedSubjects.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">Vakkenpakket</h2>
            <p className="text-sm text-slate-500">Kies welke vakken je op je dashboard wilt zien</p>
          </div>
          {saving && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Toggle: alle vakken of custom selectie */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">Alle vakken tonen</p>
            <p className="text-sm text-slate-500">
              {showAll
                ? 'Alle 16 vakken worden getoond'
                : `${selectedCount} van ${SUBJECTS.length} vakken geselecteerd`}
            </p>
          </div>
          <button
            onClick={handleToggleShowAll}
            disabled={saving}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              showAll ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                showAll ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Subject selection grid (only when not showAll) */}
        {!showAll && (
          <>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-500">Selecteer je vakken</span>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  disabled={saving}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                >
                  Alles selecteren
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={handleDeselectAll}
                  disabled={saving}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium disabled:opacity-50"
                >
                  Alles deselecteren
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUBJECTS.map((subject) => {
                const isSelected = selectedSubjects.includes(subject);
                const Icon = getSubjectIcon(subject);
                const colorClass = getSubjectColor(subject);

                return (
                  <button
                    key={subject}
                    onClick={() => handleToggleSubject(subject)}
                    disabled={saving}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-indigo-200 bg-indigo-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    } disabled:opacity-70`}
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
