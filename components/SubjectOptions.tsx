import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { ArrowLeft, MessageCircle, Sparkles, BookOpen, Calendar } from 'lucide-react';
import { StudentProfile } from '../types';
import { getAvailableYears, getQuestionCountByYear } from '../services/storageService';
import { AIGeneratorMenu } from './AIGeneratorMenu';
import { getSubjectIcon } from '../utils/subjectIcons';

interface SubjectOptionsProps {
  subject: string;
  student: StudentProfile;
  onBack: () => void;
  onStartChat: () => void;
  onStartAIQuestions: (count: number, topic?: string, difficulty?: string, questionTypeMix?: string, timeLimit?: number) => void;
  onStartExam: (year?: number) => void;
}

export const SubjectOptions: React.FC<SubjectOptionsProps> = ({
  subject,
  student,
  onBack,
  onStartChat,
  onStartAIQuestions,
  onStartExam
}) => {
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [yearCounts, setYearCounts] = useState<Map<number, number>>(new Map());
  const [view, setView] = useState<'default' | 'ai-setup'>('default');
  
  const SubjectIcon = getSubjectIcon(subject);

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
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-sm flex-shrink-0">
                <MessageCircle className="w-7 h-7" />
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
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-sm flex-shrink-0">
                <Sparkles className="w-7 h-7" />
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

          {/* Eindexamen Oefenen */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/60">
            <div className="flex items-start gap-6 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <BookOpen className="w-7 h-7" />
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
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  Beschikbare Examens
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => onStartExam(year)}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
