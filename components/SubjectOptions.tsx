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
  onStartAIQuestions: (count: number, topic?: string) => void;
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
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-6 -ml-2"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar vakken
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <SubjectIcon className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{subject}</h1>
              <p className="text-slate-500 mt-1">Kies hoe je wilt leren</p>
            </div>
          </div>
        </div>

        {/* Options Grid */}
        <div className="space-y-4">

          {/* AI Bijlesdocent - Chat */}
          <div
            onClick={onStartChat}
            className="group bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-200/60 hover:border-indigo-500/30 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm flex-shrink-0">
                <MessageCircle className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">AI Bijlesdocent</h3>
                <p className="text-slate-600 mb-4">
                  Chat met een AI-docent die is gespecialiseerd in {subject}. Stel vragen, vraag uitleg en krijg persoonlijke hulp.
                </p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full border border-purple-100">
                    <Sparkles className="w-3 h-3" />
                    AI Powered
                  </span>
                  <span className="text-xs text-slate-400">• Vraag alles wat je wilt weten</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Gegenereerde Toetsen */}
          <div
            onClick={() => setView('ai-setup')}
            className="group bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-200/60 hover:border-blue-500/30 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm flex-shrink-0">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">AI Examen Generator</h3>
                <p className="text-slate-600 mb-4">
                  De AI genereert nieuwe {subject} eindexamenvragen op {student.level} niveau. Kies hoeveel vragen je wilt maken.
                </p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-100">
                    <Sparkles className="w-3 h-3" />
                    AI Powered
                  </span>
                  <span className="text-xs text-slate-400">• Altijd nieuwe vragen • Kies onderwerp</span>
                </div>
              </div>
            </div>
          </div>

          {/* Eindexamen Oefenen */}
          <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/60">
            <div className="flex items-start gap-6 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Eindexamen Oefenen</h3>
                <p className="text-slate-600 mb-4">
                  Maak echte examenvragen uit oude examens. Complete examens met plaatjes, bronteksten en alle officiële vragen.
                </p>
              </div>
            </div>

            {availableYears.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-100">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 text-sm">
                  Nog geen examens beschikbaar voor {subject}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Vraag je docent om examenvragen toe te voegen
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
                  Beschikbare Examens
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => onStartExam(year)}
                      className="group bg-slate-50 hover:bg-green-50 border border-slate-200 hover:border-green-300 rounded-xl p-4 transition-all duration-200 text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-slate-400 group-hover:text-green-600" />
                        <span className="font-bold text-slate-900 group-hover:text-green-900">
                          {year}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 group-hover:text-green-700">
                        {yearCounts.get(year) || 0} vragen
                      </span>
                    </button>
                  ))}

                  {/* Random exam option */}
                  <button
                    onClick={() => onStartExam()}
                    className="group bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 rounded-xl p-4 transition-all duration-200 text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-indigo-900">
                        Mix
                      </span>
                    </div>
                    <span className="text-xs text-indigo-700">
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
