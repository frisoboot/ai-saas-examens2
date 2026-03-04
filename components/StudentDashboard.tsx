import React, { useMemo, useState, useEffect } from 'react';
import { SEO } from './SEO';
import { getQuestions } from '../services/storageService';
import { StudentProfile, Question, FeedbackMode } from '../types';
import { BookOpen, Sparkles, MessageCircle, Target, LogOut, Settings, BarChart3 } from 'lucide-react';
import { SubjectOptions } from './SubjectOptions';
import { getSubjectIcon, getSubjectColor } from '../utils/subjectIcons';
import { sanitizeText } from '../utils/sanitize';
import { getVisibleSubjects } from '../services/subjectPreferencesService';
import { SUBJECT_CATEGORIES } from '../constants/subjects';
import { StudentDifficultyOverview } from './StudentDifficultyOverview';

interface StudentDashboardProps {
  student: StudentProfile;
  onStartExam: (subject: string, year?: number, timeLimit?: number, feedbackMode?: FeedbackMode, tijdvak?: number) => void;
  onStartChat: (subject: string) => void;
  onStartFlashcards: (subject: string, count: number, topic?: string) => void;
  onStartLookalikeExam: (subject: string, count: number, topic?: string, examStyle?: string, timeLimit?: number) => void;
  onLogout?: () => void;
  onAdminDashboard?: () => void;
  onSettings?: () => void;
  onFeedback?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  onStartExam,
  onStartChat,
  onStartFlashcards,
  onStartLookalikeExam,
  onLogout,
  onAdminDashboard,
  onSettings,
  onFeedback
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Get visible subjects based on user preferences (from profile in database)
  const visibleSubjects = useMemo(() => {
    return getVisibleSubjects(student.selectedSubjects);
  }, [student.selectedSubjects]);

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

  // Get unique exam counts per subject (count distinct year+tijdvak combinations)
  const examCounts = useMemo(() => {
    const examsPerSubject = new Map<string, Set<string>>();
    questions
      .filter(q => q.level === student.level && q.examYear) // Only count exam questions
      .forEach(q => {
        if (!examsPerSubject.has(q.subject)) {
          examsPerSubject.set(q.subject, new Set());
        }
        const tijdvak = q.tijdvak || 1;
        examsPerSubject.get(q.subject)!.add(`${q.examYear}-${tijdvak}`);
      });
    const map = new Map<string, number>();
    examsPerSubject.forEach((exams, subject) => {
      map.set(subject, exams.size);
    });
    return map;
  }, [questions, student.level]);

  // Count total questions per subject
  const questionCounts = useMemo(() => {
    const map = new Map<string, number>();
    questions
      .filter(q => q.level === student.level && q.examYear)
      .forEach(q => {
        map.set(q.subject, (map.get(q.subject) || 0) + 1);
      });
    return map;
  }, [questions, student.level]);

  // Group visible subjects by category
  const groupedSubjects = useMemo(() => {
    const visibleSet = new Set(visibleSubjects);
    return SUBJECT_CATEGORIES
      .map(category => ({
        label: category.label,
        subjects: category.subjects.filter(s => visibleSet.has(s)),
      }))
      .filter(group => group.subjects.length > 0);
  }, [visibleSubjects]);

  // If a subject is selected, show the options screen
  if (selectedSubject) {
    return (
      <SubjectOptions
        subject={selectedSubject}
        student={student}
        onBack={() => setSelectedSubject(null)}
        onStartChat={() => onStartChat(selectedSubject)}
        onStartExam={(year, timeLimit, feedbackMode, tijdvak) => onStartExam(selectedSubject, year, timeLimit, feedbackMode, tijdvak)}
        onStartFlashcards={(count, topic) => onStartFlashcards(selectedSubject, count, topic)}
        onStartLookalikeExam={(count, topic, examStyle, timeLimit) =>
          onStartLookalikeExam(selectedSubject, count, topic, examStyle, timeLimit)
        }
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <SEO
        title="Dashboard"
        description="Oefen voor je eindexamen met AI-gegenereerde vragen, flashcards en persoonlijke begeleiding."
        noindex={true}
      />

      {/* Sidebar - Profile & Stats */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col hidden lg:flex" role="complementary" aria-label="Profiel en voortgang">
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

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
           <StudentDifficultyOverview />
        </nav>

        {/* Feedback, Settings & Logout Buttons */}
        <div className="p-6 border-t border-slate-100 space-y-2">
          {onFeedback && (
            <button
              onClick={onFeedback}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-slate-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-medium">Voortgang & Feedback</span>
            </button>
          )}
          {onSettings && (
            <button
              onClick={onSettings}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">Instellingen</span>
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Uitloggen</span>
            </button>
          )}
        </div>
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
           <div className="flex items-center gap-2">
             {onFeedback && (
               <button
                 onClick={onFeedback}
                 className="p-2 rounded-lg text-slate-500 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                 title="Voortgang & Feedback"
               >
                 <BarChart3 className="w-5 h-5" />
               </button>
             )}
             {onSettings && (
               <button
                 onClick={onSettings}
                 className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                 title="Instellingen"
               >
                 <Settings className="w-5 h-5" />
               </button>
             )}
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
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12">
           <div className="max-w-7xl mx-auto">
              <header className="mb-10">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Jouw Vakken - {student.level}</h1>
                <p className="text-slate-500 text-lg">Kies een vak om te starten met leren, oefenen of chatten met de AI-docent.</p>
              </header>

              <div className="space-y-10">
                {groupedSubjects.map((group) => (
                  <section key={group.label}>
                    <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      {group.label}
                      <span className="text-xs font-normal text-slate-400">({group.subjects.length} {group.subjects.length === 1 ? 'vak' : 'vakken'})</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {group.subjects.map((subject) => {
                        const examCount = examCounts.get(subject) || 0;
                        const questionCount = questionCounts.get(subject) || 0;
                        const Icon = getSubjectIcon(subject);
                        const colorClass = getSubjectColor(subject);

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
                              {questionCount > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="bg-green-50 text-green-600 text-xs font-bold px-3 py-1.5 rounded-full border border-green-100">
                                    {questionCount} {questionCount === 1 ? 'vraag' : 'vragen'}
                                  </span>
                                  <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-100">
                                    {examCount} {examCount === 1 ? 'examen' : 'examens'}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 mb-6">
                              <h3 className="text-xl font-bold text-slate-900 mb-1">{subject}</h3>
                              <p className="text-slate-400 text-sm">{student.level} niveau</p>
                            </div>

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
                  </section>
                ))}
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};