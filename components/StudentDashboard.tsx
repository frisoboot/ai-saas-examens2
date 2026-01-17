import React, { useMemo, useState, useEffect } from 'react';
import { getQuestions } from '../services/storageService';
import { StudentProfile, Question } from '../types';
import { Button } from './Button';
import { BookOpen, Sparkles, MessageCircle, Award, Target } from 'lucide-react';
import { SubjectOptions } from './SubjectOptions';
import { getSubjectIcon, getSubjectColor } from '../utils/subjectIcons';

// Sanitize user input to prevent XSS attacks - strips HTML tags entirely
const sanitizeText = (text: string): string => {
  return text.replace(/<[^>]*>/g, '');
};

interface StudentDashboardProps {
  student: StudentProfile;
  onStartExam: (subject: string, year?: number) => void;
  onStartChat: (subject: string) => void;
  onStartAIQuestions: (subject: string, count: number, topic?: string, difficulty?: string, questionTypeMix?: string) => void;
  onStartFlashcards: (subject: string, count: number, topic?: string) => void;
  onStartLookalikeExam: (subject: string, count: number, topic?: string, examStyle?: string, timeLimit?: number) => void;
}

// All available subjects - always shown to students
const ALL_SUBJECTS = [
  'Aardrijkskunde', 'Bedrijfseconomie', 'Biologie', 'Duits', 'Economie',
  'Engels', 'Frans', 'Geschiedenis', 'Kunst Algemeen', 'Maatschappijwetenschappen',
  'Natuurkunde', 'Nederlands', 'Scheikunde', 'Wiskunde A', 'Wiskunde B', 'Wiskunde C'
];

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  onStartExam,
  onStartChat,
  onStartAIQuestions,
  onStartFlashcards,
  onStartLookalikeExam
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

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

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
           <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Jouw Voortgang</div>
           
           {/* Placeholder stats */}
           <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 text-indigo-700">
              <Award className="w-5 h-5" />
              <div className="flex-1">
                <div className="text-sm font-bold">Start met oefenen</div>
                <div className="text-xs opacity-70">Maak je eerste toets</div>
              </div>
           </div>
        </nav>

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
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12">
           <div className="max-w-7xl mx-auto">
              <header className="mb-10">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Jouw Vakken - {student.level}</h1>
                <p className="text-slate-500 text-lg">Kies een vak om te starten met leren, oefenen of chatten met de AI-docent.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {ALL_SUBJECTS.map((subject) => {
                  const examCount = examCounts.get(subject) || 0;
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
                        {examCount > 0 && (
                          <span className="bg-green-50 text-green-600 text-xs font-bold px-3 py-1.5 rounded-full border border-green-100">
                            {examCount} {examCount === 1 ? 'Examen' : 'Examens'}
                          </span>
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
           </div>
        </div>
      </main>
    </div>
  );
};