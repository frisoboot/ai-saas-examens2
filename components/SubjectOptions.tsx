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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50/30 to-pink-50/20 p-6 md:p-10 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-32 w-96 h-96 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 -right-32 w-96 h-96 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-10">
          <Button
            variant="ghost"
            className="mb-6 -ml-2 hover:bg-white/60 backdrop-blur-sm transition-all"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar vakken
          </Button>

          <div className="flex items-center gap-5 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-lg opacity-50 animate-pulse" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-300/50">
                <SubjectIcon className="w-10 h-10" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 bg-clip-text text-transparent">{subject}</h1>
              <p className="text-slate-600 mt-2 font-medium">Kies hoe je wilt leren</p>
            </div>
          </div>
        </div>

        {/* Options Grid */}
        <div className="space-y-5">

          {/* AI Bijlesdocent - Chat */}
          <div
            onClick={onStartChat}
            className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl shadow-purple-100/50 hover:shadow-2xl hover:shadow-purple-200/60 border border-white/60 hover:border-purple-300/50 transition-all duration-500 cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-pink-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-start gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-lg shadow-purple-200/50 flex-shrink-0">
                  <MessageCircle className="w-10 h-10" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-purple-900 transition-colors">AI Bijlesdocent</h3>
                <p className="text-slate-700 mb-5 leading-relaxed">
                  Chat met een AI-docent die is gespecialiseerd in {subject}. Stel vragen, vraag uitleg en krijg persoonlijke hulp.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-purple-200/50">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Powered
                  </span>
                  <span className="text-sm text-slate-500">• Vraag alles wat je wilt weten</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Gegenereerde Toetsen */}
          <div
            onClick={() => setView('ai-setup')}
            className="group relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl shadow-indigo-100/50 hover:shadow-2xl hover:shadow-indigo-200/60 border border-white/60 hover:border-indigo-300/50 transition-all duration-500 cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-start gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-lg shadow-indigo-200/50 flex-shrink-0">
                  <Sparkles className="w-10 h-10" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-indigo-900 transition-colors">AI Examen Generator</h3>
                <p className="text-slate-700 mb-5 leading-relaxed">
                  De AI genereert nieuwe {subject} eindexamenvragen op {student.level} niveau. Kies hoeveel vragen je wilt maken.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-indigo-200/50">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Powered
                  </span>
                  <span className="text-sm text-slate-500">• Altijd nieuwe vragen • Kies onderwerp</span>
                </div>
              </div>
            </div>
          </div>

          {/* Eindexamen Oefenen */}
          <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl shadow-green-100/50 border border-white/60 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/30 via-transparent to-emerald-50/20" />
            <div className="relative flex items-start gap-6 mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl blur-lg opacity-30" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-green-200/50 flex-shrink-0">
                  <BookOpen className="w-10 h-10" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Eindexamen Oefenen</h3>
                <p className="text-slate-700 leading-relaxed">
                  Maak echte examenvragen uit oude examens. Complete examens met plaatjes, bronteksten en alle officiële vragen.
                </p>
              </div>
            </div>

            {availableYears.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-8 text-center border border-slate-200/50 backdrop-blur-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-200/50 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-700 font-semibold mb-2">
                  Nog geen examens beschikbaar voor {subject}
                </p>
                <p className="text-slate-500 text-sm">
                  Vraag je docent om examenvragen toe te voegen
                </p>
              </div>
            ) : (
              <div className="relative space-y-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Beschikbare Examens
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => onStartExam(year)}
                      className="group bg-gradient-to-br from-slate-50 to-green-50/30 hover:from-green-50 hover:to-emerald-50 border-2 border-slate-200 hover:border-green-400 rounded-2xl p-5 transition-all duration-300 text-left hover:shadow-lg hover:shadow-green-200/50 hover:scale-105 active:scale-95"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-white/50 group-hover:bg-green-500 flex items-center justify-center transition-colors shadow-sm">
                          <Calendar className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                        </div>
                        <span className="font-bold text-lg text-slate-900 group-hover:text-green-900 transition-colors">
                          {year}
                        </span>
                      </div>
                      <span className="text-xs text-slate-600 group-hover:text-green-700 font-medium transition-colors">
                        {yearCounts.get(year) || 0} vragen
                      </span>
                    </button>
                  ))}

                  {/* Random exam option */}
                  <button
                    onClick={() => onStartExam()}
                    className="group bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border-2 border-indigo-300 hover:border-indigo-400 rounded-2xl p-5 transition-all duration-300 text-left hover:shadow-lg hover:shadow-indigo-200/50 hover:scale-105 active:scale-95"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-white/50 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-purple-500 flex items-center justify-center transition-all shadow-sm">
                        <Sparkles className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
                      </div>
                      <span className="font-bold text-lg text-indigo-900">
                        Mix
                      </span>
                    </div>
                    <span className="text-xs text-indigo-700 font-medium">
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
