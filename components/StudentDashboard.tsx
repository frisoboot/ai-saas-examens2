import React, { useMemo, useState, useEffect } from 'react';
import { getQuestions } from '../services/storageService';
import {
  getStudentProgress,
  getOverallProgress,
  getWeakestSubjects,
  getStrongestSubjects
} from '../services/progressService';
import { StudentProfile, Question, StudentProgress } from '../types';
import { BookOpen, Sparkles, MessageCircle, Award, Target, LogOut, TrendingUp, TrendingDown, BarChart3, AlertTriangle, Trophy } from 'lucide-react';
import { SubjectOptions } from './SubjectOptions';
import { getSubjectIcon, getSubjectColor } from '../utils/subjectIcons';
import { sanitizeText } from '../utils/sanitize';
import { SUBJECTS } from '../constants/subjects';

interface StudentDashboardProps {
  student: StudentProfile;
  onStartExam: (subject: string, year?: number) => void;
  onStartChat: (subject: string) => void;
  onStartAIQuestions: (subject: string, count: number, topic?: string, difficulty?: string, questionTypeMix?: string) => void;
  onStartFlashcards: (subject: string, count: number, topic?: string) => void;
  onStartLookalikeExam: (subject: string, count: number, topic?: string, examStyle?: string, timeLimit?: number) => void;
  onLogout?: () => void;
  onAdminDashboard?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  onStartExam,
  onStartChat,
  onStartAIQuestions,
  onStartFlashcards,
  onStartLookalikeExam,
  onLogout,
  onAdminDashboard
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Progress tracking state
  const [overallProgress, setOverallProgress] = useState<{
    totalExams: number;
    averageScore: number;
    improvementRate: number;
    lastExamDate?: string;
  } | null>(null);
  const [weakestSubjects, setWeakestSubjects] = useState<StudentProgress[]>([]);
  const [strongestSubjects, setStrongestSubjects] = useState<StudentProgress[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<Map<string, StudentProgress>>(new Map());
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const questionsData = await getQuestions();
        setQuestions(questionsData);
      } catch (error) {
        console.error('Fout bij ophalen vragen:', error);
        setQuestions([]);
      }
    };
    loadQuestions();
  }, []);

  // Load progress data
  useEffect(() => {
    const loadProgress = async () => {
      try {
        setProgressLoading(true);

        // Load all progress data in parallel
        const [overall, weakest, strongest, allProgress] = await Promise.all([
          getOverallProgress(student.name),
          getWeakestSubjects(student.name, 3),
          getStrongestSubjects(student.name, 3),
          getStudentProgress(student.name)
        ]);

        setOverallProgress(overall);
        setWeakestSubjects(weakest);
        setStrongestSubjects(strongest);

        // Create a map of subject -> progress for quick lookup
        const progressMap = new Map<string, StudentProgress>();
        allProgress.forEach(p => progressMap.set(p.subject, p));
        setSubjectProgress(progressMap);
      } catch (error) {
        console.error('Fout bij ophalen voortgang:', error);
      } finally {
        setProgressLoading(false);
      }
    };

    loadProgress();
  }, [student.name]);

  // Get exam question counts per subject (for display only)
  const examCounts = useMemo(() => {
    const map = new Map<string, number>();
    questions
      .filter(q => q.level === student.level && q.examYear) // Only count exam questions
      .forEach(q => {
        map.set(q.subject, (map.get(q.subject) || 0) + 1);
      });
    return map;
  }, [questions, student.level]);

  // If a subject is selected, show the options screen
  if (selectedSubject) {
    return (
      <SubjectOptions
        subject={selectedSubject}
        student={student}
        onBack={() => setSelectedSubject(null)}
        onStartChat={() => onStartChat(selectedSubject)}
        onStartAIQuestions={(count, topic, difficulty, questionTypeMix) =>
          onStartAIQuestions(selectedSubject, count, topic, difficulty, questionTypeMix)
        }
        onStartExam={(year) => onStartExam(selectedSubject, year)}
        onStartFlashcards={(count, topic) => onStartFlashcards(selectedSubject, count, topic)}
        onStartLookalikeExam={(count, topic, examStyle, timeLimit) =>
          onStartLookalikeExam(selectedSubject, count, topic, examStyle, timeLimit)
        }
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      
      {/* Sidebar - Profile & Stats */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col hidden lg:flex">
        <div className="p-8 border-b border-slate-100">
           <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-200">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">{student.name}</h2>
                <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded font-medium border border-slate-200">
                  {student.level} Student
                </span>
              </div>
           </div>
           
           <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                  <Target className="w-3 h-3" /> Focuspunt
                </div>
                <p className="text-sm text-slate-700 font-medium leading-relaxed">"{sanitizeText(student.strugglePoints)}"</p>
              </div>
           </div>
        </div>

        <nav className="flex-1 p-6 space-y-4 overflow-y-auto">
           <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Jouw Voortgang</div>

           {progressLoading ? (
             <div className="flex items-center justify-center py-8">
               <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
             </div>
           ) : overallProgress && overallProgress.totalExams > 0 ? (
             <>
               {/* Overall Statistics */}
               <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                 <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase mb-3">
                   <BarChart3 className="w-3 h-3" /> Totaal Overzicht
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="bg-white/60 rounded-lg p-2.5">
                     <div className="text-2xl font-bold text-indigo-700">{overallProgress.totalExams}</div>
                     <div className="text-xs text-slate-500">Toetsen gemaakt</div>
                   </div>
                   <div className="bg-white/60 rounded-lg p-2.5">
                     <div className="text-2xl font-bold text-indigo-700">{overallProgress.averageScore.toFixed(1)}%</div>
                     <div className="text-xs text-slate-500">Gemiddelde score</div>
                   </div>
                 </div>
                 {overallProgress.improvementRate !== 0 && (
                   <div className={`flex items-center gap-2 mt-3 text-sm ${overallProgress.improvementRate > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                     {overallProgress.improvementRate > 0 ? (
                       <TrendingUp className="w-4 h-4" />
                     ) : (
                       <TrendingDown className="w-4 h-4" />
                     )}
                     <span className="font-medium">
                       {overallProgress.improvementRate > 0 ? '+' : ''}{overallProgress.improvementRate.toFixed(1)}% verbetering
                     </span>
                   </div>
                 )}
               </div>

               {/* Strongest Subjects */}
               {strongestSubjects.length > 0 && (
                 <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                   <div className="flex items-center gap-2 text-xs font-bold text-green-600 uppercase mb-3">
                     <Trophy className="w-3 h-3" /> Sterkste Vakken
                   </div>
                   <div className="space-y-2">
                     {strongestSubjects.map((subject) => (
                       <div key={subject.subject} className="flex items-center justify-between bg-white/60 rounded-lg p-2">
                         <span className="text-sm font-medium text-slate-700">{subject.subject}</span>
                         <span className="text-sm font-bold text-green-600">{subject.averageScore.toFixed(1)}%</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* Weakest Subjects */}
               {weakestSubjects.length > 0 && (
                 <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                   <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase mb-3">
                     <AlertTriangle className="w-3 h-3" /> Extra Oefenen
                   </div>
                   <div className="space-y-2">
                     {weakestSubjects.map((subject) => (
                       <div key={subject.subject} className="flex items-center justify-between bg-white/60 rounded-lg p-2">
                         <span className="text-sm font-medium text-slate-700">{subject.subject}</span>
                         <span className="text-sm font-bold text-orange-600">{subject.averageScore.toFixed(1)}%</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </>
           ) : (
             <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 text-indigo-700">
               <Award className="w-5 h-5" />
               <div className="flex-1">
                 <div className="text-sm font-bold">Start met oefenen</div>
                 <div className="text-xs opacity-70">Maak je eerste toets</div>
               </div>
             </div>
           )}
        </nav>

        {/* Logout Button */}
        {onLogout && (
          <div className="p-6 border-t border-slate-100">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Uitloggen</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                 {student.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-slate-800">{student.name}</span>
           </div>
           {onLogout && (
             <button
               onClick={onLogout}
               className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
               title="Uitloggen"
             >
               <LogOut className="w-5 h-5" />
             </button>
           )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12">
           <div className="max-w-7xl mx-auto">
              <header className="mb-10">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Jouw Vakken - {student.level}</h1>
                <p className="text-slate-500 text-lg">Kies een vak om te starten met leren, oefenen of chatten met de AI-docent.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {SUBJECTS.map((subject) => {
                  const examCount = examCounts.get(subject) || 0;
                  const Icon = getSubjectIcon(subject);
                  const colorClass = getSubjectColor(subject);
                  const progress = subjectProgress.get(subject);

                  return (
                    <div
                      key={subject}
                      onClick={() => setSelectedSubject(subject)}
                      className="group bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-200/60 hover:border-indigo-500/30 transition-all duration-300 flex flex-col cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-opacity-100 transition-all duration-300 shadow-sm ${colorClass} bg-opacity-100`}>
                          <Icon className="w-7 h-7" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {examCount > 0 && (
                            <span className="bg-green-50 text-green-600 text-xs font-bold px-3 py-1.5 rounded-full border border-green-100">
                              {examCount} {examCount === 1 ? 'Examen' : 'Examens'}
                            </span>
                          )}
                          {progress && progress.totalExamsTaken > 0 && (
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                              progress.averageScore >= 70
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : progress.averageScore >= 55
                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                : 'bg-red-50 text-red-600 border-red-100'
                            }`}>
                              {progress.averageScore.toFixed(0)}% gem.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 mb-4">
                        <h3 className="text-xl font-bold text-slate-900 mb-1">{subject}</h3>
                        <p className="text-slate-400 text-sm">{student.level} niveau</p>
                      </div>

                      {/* Progress Bar */}
                      {progress && progress.totalExamsTaken > 0 && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                            <span>{progress.totalExamsTaken} toets{progress.totalExamsTaken !== 1 ? 'en' : ''} gemaakt</span>
                            {progress.improvementRate !== undefined && progress.improvementRate !== 0 && (
                              <span className={`flex items-center gap-1 ${progress.improvementRate > 0 ? 'text-green-600' : 'text-orange-500'}`}>
                                {progress.improvementRate > 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {progress.improvementRate > 0 ? '+' : ''}{progress.improvementRate.toFixed(0)}%
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                progress.averageScore >= 70
                                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                  : progress.averageScore >= 55
                                  ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                  : 'bg-gradient-to-r from-red-400 to-red-500'
                              }`}
                              style={{ width: `${Math.min(progress.averageScore, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MessageCircle className="w-4 h-4" />
                        <span>Chat</span>
                        <span className="text-slate-300">•</span>
                        <Sparkles className="w-4 h-4" />
                        <span>AI Toetsen</span>
                        {examCount > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <BookOpen className="w-4 h-4" />
                            <span>Examens</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};