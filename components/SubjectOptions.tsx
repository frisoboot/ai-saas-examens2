import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { ArrowLeft, MessageCircle, Sparkles, Calendar, Layers, GraduationCap, Clock } from 'lucide-react';
import { StudentProfile } from '../types';
import { getAvailableYearsForSubject, getQuestionCountBySubjectAndYear } from '../services/storageService';
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
  onStartExam: (year?: number, timeLimit?: number) => void;
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
  const [view, setView] = useState<'default' | 'ai-setup' | 'flashcard-setup' | 'lookalike-setup'>('default');
  const [examTimeLimit, setExamTimeLimit] = useState<number>(0);
  const [showTimerOptions, setShowTimerOptions] = useState(false);

  const SubjectIcon = getSubjectIcon(subject);

  // Timer opties voor eindexamens (0 = geen timer, tijd in minuten)
  const EXAM_TIME_LIMITS = [
    { value: 0, label: 'Geen timer', description: 'Oefenen zonder tijdsdruk' },
    { value: 150, label: '2,5 uur', description: 'Standaard examenduur' },
    { value: 180, label: '3 uur', description: 'Uitgebreide examenduur' }
  ];
  const subjectColorClass = getSubjectColor(subject);

  useEffect(() => {
    const loadYears = async () => {
      try {
        // Get years only for this specific subject and level
        const years = await getAvailableYearsForSubject(subject, student.level);
        setAvailableYears(years);

        // Load question counts per year for this subject
        const counts = new Map<number, number>();
        for (const year of years) {
          const count = await getQuestionCountBySubjectAndYear(subject, year, student.level);
          counts.set(year, count);
        }
        setYearCounts(counts);
      } catch (error) {
        console.error('Fout bij ophalen examenjaren:', error);
        setAvailableYears([]);
      }
    };
    loadYears();
  }, [subject, student.level]);

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
            className="group bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-200/60 hover:border-emerald-500/30 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-sm flex-shrink-0">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-slate-900">Look-alike Examenvragen</h3>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">
                    Nieuw
                  </span>
                </div>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  Echte examensimulatie met authentieke vragen die niet te onderscheiden zijn van het centraal examen.
                  {['Nederlands', 'Engels', 'Duits', 'Frans', 'Spaans'].includes(subject) && ' Inclusief leesteksten.'}
                </p>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <GraduationCap className="w-4 h-4 text-emerald-500" />
                  <span>Examensimulatie</span>
                  <span className="text-slate-300">•</span>
                  <span>Timer optie</span>
                  <span className="text-slate-300">•</span>
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
                {/* Timer Toggle */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <button
                    onClick={() => setShowTimerOptions(!showTimerOptions)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${examTimeLimit > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center transition-colors`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="font-medium text-slate-900 text-sm">Timer</span>
                        <span className="text-slate-500 text-xs ml-2">
                          {examTimeLimit === 0 ? 'Uit' : examTimeLimit === 150 ? '2,5 uur' : '3 uur'}
                        </span>
                      </div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors ${examTimeLimit > 0 ? 'bg-amber-500' : 'bg-slate-300'} relative`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${examTimeLimit > 0 ? 'left-5' : 'left-1'}`} />
                    </div>
                  </button>

                  {showTimerOptions && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-3">Kies je examentijd:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {EXAM_TIME_LIMITS.map(limit => (
                          <button
                            key={limit.value}
                            onClick={() => setExamTimeLimit(limit.value)}
                            className={`p-3 rounded-xl font-medium transition-all text-center ${
                              examTimeLimit === limit.value
                                ? 'bg-amber-500 text-white shadow-lg'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <div className="text-sm font-semibold">{limit.label}</div>
                            <div className={`text-xs mt-0.5 ${examTimeLimit === limit.value ? 'text-amber-100' : 'text-slate-400'}`}>
                              {limit.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  Beschikbare Examens
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => onStartExam(year, examTimeLimit || undefined)}
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
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-medium">
                          {yearCounts.get(year) || 0} vragen
                        </span>
                        {examTimeLimit > 0 && (
                          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {examTimeLimit === 150 ? '2,5u' : '3u'}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}

                  {/* Random exam option */}
                  <button
                    onClick={() => onStartExam(undefined, examTimeLimit || undefined)}
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
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">
                        Alle jaren
                      </span>
                      {examTimeLimit > 0 && (
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {examTimeLimit === 150 ? '2,5u' : '3u'}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
