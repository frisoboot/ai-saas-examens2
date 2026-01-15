import React, { useMemo, useState, useEffect } from 'react';
import { getQuestions } from '../services/storageService';
import { StudentProfile, Question } from '../types';
import { Button } from './Button';
import { BookOpen, LogOut, Sparkles, MessageCircle, User, Award, Target, BookMarked, Layers, CreditCard, XCircle } from 'lucide-react';
import { SubjectOptions } from './SubjectOptions';
import { getSubjectIcon, getSubjectColor } from '../utils/subjectIcons';

interface StudentDashboardProps {
  student: StudentProfile;
  onStartExam: (subject: string, year?: number) => void;
  onStartChat: (subject: string) => void;
  onStartAIQuestions: (subject: string, count: number, topic?: string, difficulty?: string, questionTypeMix?: string) => void;
  onStartFlashcards: (subject: string, count: number, topic?: string) => void;
  onStartLookAlike: (subject: string, count: number, topic?: string) => void;
  onLogout: () => void;
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
  onStartLookAlike,
  onLogout
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Check if student has a paid subscription (not admin-created)
  const hasSubscription = !student.createdByAdmin &&
    (student.subscriptionStatus === 'trial' || student.subscriptionStatus === 'active');

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setCancelError('');

    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName: student.name })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Opzeggen mislukt');
      }

      setCancelSuccess(true);
      // Refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setCancelError(err.message || 'Er ging iets mis');
      setCancelLoading(false);
    }
  };

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
        onStartLookAlike={(count, topic) => onStartLookAlike(selectedSubject, count, topic)}
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
                <p className="text-sm text-slate-700 font-medium leading-relaxed">"{student.strugglePoints}"</p>
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

           {/* Subscription info for paid users */}
           {hasSubscription && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Abonnement</div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">
                      {student.subscriptionStatus === 'trial' ? 'Gratis Trial' : 'Actief Abonnement'}
                    </span>
                  </div>
                  {student.subscriptionExpiresAt && (
                    <p className="text-xs text-slate-500 mb-3">
                      {student.subscriptionStatus === 'trial' ? 'Trial eindigt' : 'Verlengd op'}: {new Date(student.subscriptionExpiresAt).toLocaleDateString('nl-NL')}
                    </p>
                  )}
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors"
                  >
                    Abonnement opzeggen
                  </button>
                </div>
              </div>
           )}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-3" />
            Uitloggen
          </Button>
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
           <Button variant="ghost" size="sm" onClick={onLogout}>
             <LogOut className="w-4 h-4" />
           </Button>
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

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            {cancelSuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Opgezegd</h3>
                <p className="text-slate-600">Je abonnement is opgezegd. Je kunt blijven gebruiken tot het einde van de huidige periode.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Abonnement opzeggen?</h3>
                    <p className="text-sm text-slate-500">Dit kun je niet ongedaan maken</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-amber-800">
                    <strong>Let op:</strong> Na opzegging kun je nog gebruiken tot het einde van je huidige periode. Daarna heb je geen toegang meer tot de examenvragen en AI-features.
                  </p>
                </div>

                {cancelError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                    {cancelError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    disabled={cancelLoading}
                    className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition disabled:opacity-50"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                    className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {cancelLoading ? 'Bezig...' : 'Ja, opzeggen'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};