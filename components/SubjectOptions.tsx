import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { ArrowLeft, MessageCircle, Sparkles, Calendar, Layers, GraduationCap } from 'lucide-react';
import { StudentProfile } from '../types';
import { getAvailableYears, getQuestionCountByYear, getAvailableTijdvakkenForYear, getQuestionCountByYearAndTijdvak } from '../services/storageService';
import { AIGeneratorMenu } from './AIGeneratorMenu';
import { FlashcardGeneratorMenu } from './FlashcardGeneratorMenu';
import { LookalikeGeneratorMenu } from './LookalikeGeneratorMenu';
import { getSubjectIcon, getSubjectColor } from '../utils/subjectIcons';

interface SubjectOptionsProps {
  subject: string;
  student: StudentProfile;
  onBack: () => void;
  onStartChat: () => void;
  onStartAIQuestions: (count: number, topic?: string, difficulty?: string, questionTypeMix?: string) => void;
  onStartExam: (year?: number, tijdvak?: number) => void;
  onStartFlashcards: (count: number, topic?: string) => void;
  onStartLookalikeExam: (count: number, topic?: string, examStyle?: string, timeLimit?: number) => void;
}

export const SubjectOptions: React.FC<SubjectOptionsProps> = ({
  subject,
  student,
  onBack,
  onStartChat,
  onStartAIQuestions,
  onStartExam,
  onStartFlashcards,
  onStartLookalikeExam
}) => {
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [yearCounts, setYearCounts] = useState<Map<number, number>>(new Map());
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [yearTijdvakken, setYearTijdvakken] = useState<Map<number, number[]>>(new Map());
  const [tijdvakCounts, setTijdvakCounts] = useState<Map<string, number>>(new Map());
  const [view, setView] = useState<'default' | 'ai-setup' | 'flashcard-setup' | 'lookalike-setup'>('default');

  const SubjectIcon = getSubjectIcon(subject);
  const subjectColorClass = getSubjectColor(subject);

  useEffect(() => {
    const loadYears = async () => {
      try {
        const years = await getAvailableYears();
        setAvailableYears(years);

        // Load question counts per year
        const counts = new Map<number, number>();
        for (const year of years) {
          const count = await getQuestionCountByYear(year, student.level);
          counts.set(year, count);
        }
        setYearCounts(counts);
      } catch (error) {
        console.error('Fout bij ophalen examenjaren:', error);
        setAvailableYears([]);
      }
    };
    loadYears();
  }, [student.level]);

  // Load tijdvakken when a year is selected
  useEffect(() => {
    const loadTijdvakken = async () => {
      if (!selectedYear) return;

      try {
        const tijdvakken = await getAvailableTijdvakkenForYear(selectedYear, student.level);
        setYearTijdvakken(prev => new Map(prev).set(selectedYear, tijdvakken));

        // Load question counts per tijdvak
        const counts = new Map<string, number>();
        for (const tijdvak of tijdvakken) {
          const count = await getQuestionCountByYearAndTijdvak(selectedYear, tijdvak, student.level);
          counts.set(`${selectedYear}-${tijdvak}`, count);
        }
        setTijdvakCounts(prev => new Map([...prev, ...counts]));
      } catch (error) {
        console.error('Fout bij ophalen tijdvakken:', error);
      }
    };
    loadTijdvakken();
  }, [selectedYear, student.level]);

  if (view === 'ai-setup') {
    return (
      <AIGeneratorMenu
        subject={subject}
        studentLevel={student.level}
        onBack={() => setView('default')}
        onGenerate={onStartAIQuestions}
      />
    );
  }

  if (view === 'flashcard-setup') {
    return (
      <FlashcardGeneratorMenu
        subject={subject}
        studentLevel={student.level}
        onBack={() => setView('default')}
        onGenerate={onStartFlashcards}
      />
    );
  }

  if (view === 'lookalike-setup') {
    return (
      <LookalikeGeneratorMenu
        subject={subject}
        studentLevel={student.level}
        onBack={() => setView('default')}
        onGenerate={onStartLookalikeExam}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <Button
            variant="ghost"
            className="mb-6 -ml-2 hover:bg-slate-100 transition-all"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar vakken
          </Button>

          <div className="flex items-center gap-5 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
              <SubjectIcon className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">{subject}</h1>
              <p className="text-slate-600 mt-2 font-medium">Kies hoe je wilt leren</p>
            </div>
          </div>
        </div>

        {/* Options Grid */}
        <div className="space-y-5">

          {/* AI Bijlesdocent - Chat */}
          <div
            onClick={onStartChat}
            className="group bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-200/60 hover:border-purple-500/30 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start gap-6">
              <div className={`w-14 h-14 rounded-2xl ${subjectColorClass} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-sm flex-shrink-0`}>
                <SubjectIcon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">AI Bijlesdocent</h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  Chat met een AI-docent die is gespecialiseerd in {subject}. Stel vragen, vraag uitleg en krijg persoonlijke hulp.
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat</span>
                  <span className="text-slate-300">•</span>
                  <Sparkles className="w-4 h-4" />
                  <span>AI Powered</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Gegenereerde Toetsen */}
          <div
            onClick={() => setView('ai-setup')}
            className="group bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-200/60 hover:border-indigo-500/30 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start gap-6">
              <div className={`w-14 h-14 rounded-2xl ${subjectColorClass} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-sm flex-shrink-0`}>
                <SubjectIcon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">AI Examen Generator</h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  De AI genereert nieuwe {subject} eindexamenvragen op {student.level} niveau. Kies hoeveel vragen je wilt maken.
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Toetsen</span>
                  <span className="text-slate-300">•</span>
                  <span>Altijd nieuwe vragen</span>
                </div>
              </div>
            </div>
          </div>

          {/* Look-alike Examenvragen */}
          <div
            onClick={() => setView('lookalike-setup')}
            className="group bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.25)] border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
          >
            {/* Background accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-full blur-2xl" />

            <div className="flex items-start gap-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg shadow-emerald-500/30 flex-shrink-0">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-white">Look-alike Examenvragen</h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
                    NIEUW
                  </span>
                </div>
                <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                  Echte examensimulatie met authentieke vragen die niet te onderscheiden zijn van het centraal examen.
                  {['Nederlands', 'Engels', 'Duits', 'Frans', 'Spaans'].includes(subject) && ' Inclusief leesteksten!'}
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Examensimulatie</span>
                  <span className="text-slate-600">•</span>
                  <span>Met timer optie</span>
                  <span className="text-slate-600">•</span>
                  <span>Tijdvak 1 & 2</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Flashcards */}
          <div
            onClick={() => setView('flashcard-setup')}
            className="group bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-200/60 hover:border-amber-500/30 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start gap-6">
              <div className={`w-14 h-14 rounded-2xl ${subjectColorClass} flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-sm flex-shrink-0`}>
                <SubjectIcon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">AI Flashcards</h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  Leer de stof met AI-gegenereerde flashcards. Kies een onderwerp en oefen begrippen, definities en feiten.
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Layers className="w-4 h-4" />
                  <span>Flashcards</span>
                  <span className="text-slate-300">•</span>
                  <span>Snel leren</span>
                </div>
              </div>
            </div>
          </div>

          {/* Eindexamen Oefenen */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/60">
            <div className="flex items-start gap-6 mb-6">
              <div className={`w-14 h-14 rounded-2xl ${subjectColorClass} flex items-center justify-center shadow-sm flex-shrink-0`}>
                <SubjectIcon className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Eindexamen Oefenen</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Maak echte examenvragen uit oude examens. Complete examens met plaatjes, bronteksten en alle officiële vragen.
                </p>
              </div>
            </div>

            {availableYears.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-200">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-700 font-semibold text-sm mb-1">
                  Nog geen examens beschikbaar voor {subject}
                </p>
                <p className="text-slate-500 text-xs">
                  Vraag je docent om examenvragen toe te voegen
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* If no year selected, show year selection */}
                {!selectedYear ? (
                  <>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      Kies een Examenjaar
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {availableYears.map(year => (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          className="group bg-white rounded-xl p-4 border border-slate-200/60 hover:border-green-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 text-left hover:scale-105 active:scale-95"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-lg bg-green-50 text-green-600 flex items-center justify-center transition-colors">
                              <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-base text-slate-900">
                              {year}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">
                            {yearCounts.get(year) || 0} vragen
                          </span>
                        </button>
                      ))}

                      {/* Random exam option */}
                      <button
                        onClick={() => onStartExam()}
                        className="group bg-white rounded-xl p-4 border border-slate-200/60 hover:border-indigo-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 text-left hover:scale-105 active:scale-95"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center transition-all">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-base text-slate-900">
                            Mix
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          Alle jaren
                        </span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* If year selected, show tijdvak selection */
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Examen {selectedYear} - Kies Tijdvak
                      </div>
                      <button
                        onClick={() => setSelectedYear(null)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        ← Andere jaar
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {yearTijdvakken.get(selectedYear)?.map(tijdvak => (
                        <button
                          key={tijdvak}
                          onClick={() => onStartExam(selectedYear, tijdvak)}
                          className="group bg-white rounded-xl p-4 border border-slate-200/60 hover:border-blue-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 text-left hover:scale-105 active:scale-95"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center transition-colors">
                              <span className="text-xs font-bold">{tijdvak}</span>
                            </div>
                            <span className="font-bold text-base text-slate-900">
                              Tijdvak {tijdvak}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">
                            {tijdvakCounts.get(`${selectedYear}-${tijdvak}`) || 0} vragen
                          </span>
                        </button>
                      ))}

                      {/* All tijdvakken option */}
                      <button
                        onClick={() => onStartExam(selectedYear)}
                        className="group bg-white rounded-xl p-4 border border-slate-200/60 hover:border-purple-500/30 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 text-left hover:scale-105 active:scale-95"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center transition-all">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-base text-slate-900">
                            Alle tijdvakken
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {yearCounts.get(selectedYear) || 0} vragen
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
