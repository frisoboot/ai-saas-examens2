import React, { useState, useEffect } from 'react';
import { ViewState, ExamSession, StudentProfile, StudentLevel, AdminUser, FlashcardSession } from './types';
import { getQuestions } from './services/storageService';
import { verifyStudentLogin, verifyAdminLogin, signOut } from './services/authService';
import { generateAIQuestions, generateFlashcards, generateLookalikeExamQuestions } from './services/geminiService';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { ExamTaker } from './components/ExamTaker';
import { SubjectChat } from './components/SubjectChat';
import { FlashcardStudy } from './components/FlashcardStudy';
import { LandingPage } from './components/LandingPage';
import { CheckoutForm } from './components/CheckoutForm';
import { PaymentSuccess } from './components/PaymentSuccess';
import { PaymentCallback } from './components/PaymentCallback';
import { Button } from './components/Button';
import { GraduationCap, UserCog, ArrowRight, ArrowLeft, Lock, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('PUBLIC_LANDING');
  const [paymentUsername, setPaymentUsername] = useState<string | null>(null);

  // Check voor payment callback van Mollie
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentCallback = params.get('payment_callback');
    const payment = params.get('payment');
    const username = params.get('username');

    // Nieuwe flow: payment_callback=true na Mollie redirect
    if (paymentCallback === 'true') {
      setView('PAYMENT_CALLBACK' as ViewState);
      // Verwijder query params uit URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    // Legacy flow: voor oude redirects met payment=success
    else if (payment === 'success' && username) {
      setPaymentUsername(username);
      setView('PAYMENT_SUCCESS' as ViewState);
      // Verwijder query params uit URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Auth State
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // Input State
  const [studentName, setStudentName] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [currentProfile, setCurrentProfile] = useState<StudentProfile | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [currentExamSession, setCurrentExamSession] = useState<ExamSession | null>(null);
  const [currentFlashcardSession, setCurrentFlashcardSession] = useState<FlashcardSession | null>(null);
  const [chatSubject, setChatSubject] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');

  const handleStudentAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!studentName.trim() || !studentPassword.trim()) {
      setLoginError("Vul naam en wachtwoord in.");
      return;
    }

    try {
      const profile = await verifyStudentLogin(studentName, studentPassword);
      if (profile) {
        if (profile.isActive === false) {
          setLoginError("Je account is gedeactiveerd. Neem contact op met je docent.");
          return;
        }

        setCurrentProfile(profile);
        setView('STUDENT_DASHBOARD');
      } else {
        setLoginError("Naam of wachtwoord onjuist.");
      }
    } catch (error) {
      setLoginError("Er ging iets mis bij het inloggen.");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!adminUsername.trim() || !adminPassword.trim()) {
      setLoginError("Vul gebruikersnaam en wachtwoord in.");
      return;
    }

    try {
      const admin = await verifyAdminLogin(adminUsername, adminPassword);
      if (admin) {
        setCurrentAdmin(admin);
        setView('ADMIN');
        setShowAdminLogin(false);
        setAdminUsername('');
        setAdminPassword('');
      } else {
        setLoginError("Gebruikersnaam of wachtwoord onjuist.");
      }
    } catch (error: any) {
      // Show the actual error message from the API/auth service
      const errorMessage = error?.message || "Er ging iets mis bij het inloggen.";
      setLoginError(errorMessage);
    }
  };

  const startExam = async (subject: string, year?: number) => {
    if (!currentProfile) return;

    try {
      const allQuestions = await getQuestions();
      let subjectQuestions = allQuestions.filter(q =>
          q.subject === subject && q.level === currentProfile.level
      );

      // Filter by year if specified
      if (year !== undefined) {
        subjectQuestions = subjectQuestions.filter(q => q.examYear === year);
      }

      if (subjectQuestions.length === 0) {
          const message = year
            ? `Er zijn nog geen vragen voor ${subject} uit ${year} op ${currentProfile.level} niveau.`
            : `Er zijn nog geen vragen voor ${subject} op ${currentProfile.level} niveau.`;
          alert(message);
          return;
      }

      setCurrentExamSession({
        studentName: currentProfile.name,
        subject,
        questions: subjectQuestions,
        currentQuestionIndex: 0,
        answers: {},
        examType: year ? 'official_exam' : 'subject_practice',
        startTime: Date.now()
      });
      setView('EXAM');
    } catch (error) {
      console.error('Fout bij ophalen vragen:', error);
      alert('Er ging iets mis bij het ophalen van de vragen.');
    }
  };

  const startAIQuestions = async (
    subject: string,
    count: number = 10,
    topic?: string,
    difficulty?: string,
    questionTypeMix?: string
  ) => {
    if (!currentProfile) return;

    // Show loading feedback
    console.log(`Gemini genereert ${count} ${currentProfile.level} AI examen vragen voor ${subject}${topic ? ` over "${topic}"` : ''}...\n\nDit kan 10-20 seconden duren.`);

    try {
      const aiQuestions = await generateAIQuestions(subject, currentProfile.level, count, topic);

      if (aiQuestions.length === 0) {
          alert(`❌ Kon geen AI examen vragen genereren voor ${subject}.\n\nControleer of:\n- Je een geldige Gemini API key hebt (VITE_GEMINI_API_KEY)\n- Je internetverbinding werkt`);
          return;
      }

      setCurrentExamSession({
        studentName: currentProfile.name,
        subject,
        questions: aiQuestions,
        currentQuestionIndex: 0,
        answers: {},
        examType: 'ai_practice',
        startTime: Date.now()
      });
      setView('EXAM');
    } catch (error: any) {
      console.error('Fout bij genereren AI examen vragen:', error);

      let errorMessage = '❌ Er ging iets mis bij het genereren van de AI examen vragen.\n\n';

      if (error.message?.includes('API key')) {
        errorMessage += 'Controleer of je een geldige Gemini API key hebt ingesteld in je .env bestand:\nVITE_GEMINI_API_KEY=jouw-api-key';
      } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        errorMessage += 'Je hebt de API rate limit bereikt. Probeer het over een paar minuten opnieuw.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage += 'Controleer je internetverbinding en probeer het opnieuw.';
      } else {
        errorMessage += `Foutmelding: ${error.message || 'Onbekende fout'}`;
      }

      alert(errorMessage);
    }
  };

  const startChat = (subject: string) => {
    setChatSubject(subject);
    setView('SUBJECT_CHAT');
  };

  const startFlashcards = async (
    subject: string,
    count: number = 10,
    topic?: string
  ) => {
    if (!currentProfile) return;

    console.log(`Genereren van ${count} flashcards voor ${subject}${topic ? ` over "${topic}"` : ''}...`);

    try {
      const flashcards = await generateFlashcards(subject, currentProfile.level, count, topic);

      if (flashcards.length === 0) {
        alert(`Kon geen flashcards genereren voor ${subject}. Probeer het opnieuw.`);
        return;
      }

      setCurrentFlashcardSession({
        studentName: currentProfile.name,
        subject,
        level: currentProfile.level,
        cards: flashcards,
        currentCardIndex: 0,
        knownCards: [],
        unknownCards: [],
        startTime: Date.now()
      });
      setView('FLASHCARD_STUDY');
    } catch (error: any) {
      console.error('Fout bij genereren flashcards:', error);

      let errorMessage = 'Er ging iets mis bij het genereren van de flashcards.\n\n';

      if (error.message?.includes('API key')) {
        errorMessage += 'Controleer of je een geldige Gemini API key hebt ingesteld.';
      } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        errorMessage += 'Je hebt de API rate limit bereikt. Probeer het over een paar minuten opnieuw.';
      } else {
        errorMessage += `Foutmelding: ${error.message || 'Onbekende fout'}`;
      }

      alert(errorMessage);
    }
  };

  const startLookalikeExam = async (
    subject: string,
    count: number = 10,
    topic?: string,
    examStyle?: string,
    timeLimit?: number
  ) => {
    if (!currentProfile) return;

    console.log(`Genereren van ${count} look-alike examenvragen voor ${subject}${topic ? ` over "${topic}"` : ''}...`);

    try {
      const examQuestions = await generateLookalikeExamQuestions(
        subject,
        currentProfile.level,
        count,
        topic,
        examStyle as 'tijdvak1' | 'tijdvak2' | 'mixed' | undefined
      );

      if (examQuestions.length === 0) {
        alert(`Kon geen look-alike examenvragen genereren voor ${subject}. Probeer het opnieuw.`);
        return;
      }

      setCurrentExamSession({
        studentName: currentProfile.name,
        subject,
        questions: examQuestions,
        currentQuestionIndex: 0,
        answers: {},
        examType: 'ai_practice',
        startTime: Date.now(),
        timeLimit: timeLimit || undefined // Time limit in minutes (0 = no limit)
      });
      setView('EXAM');
    } catch (error: any) {
      console.error('Fout bij genereren look-alike examenvragen:', error);

      let errorMessage = 'Er ging iets mis bij het genereren van de look-alike examenvragen.\n\n';

      if (error.message?.includes('API key')) {
        errorMessage += 'Controleer of je een geldige Gemini API key hebt ingesteld.';
      } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        errorMessage += 'Je hebt de API rate limit bereikt. Probeer het over een paar minuten opnieuw.';
      } else {
        errorMessage += `Foutmelding: ${error.message || 'Onbekende fout'}`;
      }

      alert(errorMessage);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'PUBLIC_LANDING':
        return (
          <LandingPage
            onLogin={() => setView('LANDING')}
            onCheckout={() => setView('CHECKOUT')}
          />
        );

      case 'CHECKOUT':
        return (
          <CheckoutForm
            onBack={() => setView('PUBLIC_LANDING')}
            onSuccess={(username) => {
              // Na succesvolle registratie, vul username in en ga naar login
              setStudentName(username);
              setStudentPassword('');
              setLoginError('');
              setView('LANDING');
            }}
          />
        );

      case 'PAYMENT_CALLBACK':
        return (
          <PaymentCallback
            onLogin={(username) => {
              setStudentName(username);
              setStudentPassword('');
              setLoginError('');
              setView('LANDING');
            }}
            onRetry={() => {
              setView('CHECKOUT');
            }}
          />
        );

      case 'PAYMENT_SUCCESS':
        return (
          <PaymentSuccess
            username={paymentUsername || ''}
            onLogin={(username) => {
              setStudentName(username);
              setStudentPassword('');
              setLoginError('');
              setView('LANDING');
            }}
          />
        );

      case 'LANDING':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 relative overflow-hidden">
            {/* Back Button */}
            <button
              onClick={() => setView('PUBLIC_LANDING')}
              className="absolute top-6 left-6 z-20 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Terug</span>
            </button>

            {/* Background Elements */}
            <div className="absolute inset-0 z-0">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl opacity-60"></div>
               <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            </div>

            <div className="w-full max-w-[440px] relative z-10">
              
              <div className="text-center mb-10">
                <div className="flex justify-center mb-6">
                   <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center transform rotate-3 hover:rotate-6 transition-transform duration-300 border-2 border-white/20">
                     <GraduationCap className="w-8 h-8 text-white" />
                   </div>
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {showAdminLogin ? 'Admin Portal' : 'Welkom terug'}
                </h2>
                <p className="text-gray-500 mt-3 text-lg">
                  {showAdminLogin ? 'Beheer het platform' : 'Log in om verder te gaan'}
                </p>
              </div>

              <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-100">
                {!showAdminLogin ? (
                  <form onSubmit={handleStudentAuth} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2 ml-1">Gebruikersnaam</label>
                      <input
                        type="text"
                        required
                        className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-sm transition-all outline-none border hover:bg-gray-50/80"
                        placeholder="Je naam..."
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2 ml-1">Wachtwoord</label>
                      <input
                        type="password"
                        required
                        className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-sm transition-all outline-none border hover:bg-gray-50/80"
                        placeholder="Je wachtwoord..."
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                      />
                    </div>

                    {loginError && (
                      <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3 animate-shake">
                        <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <Button type="submit" className="w-full justify-center h-14 text-lg font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5" size="lg">
                      Inloggen
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleAdminLogin} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2 ml-1">Admin Gebruikersnaam</label>
                      <input
                        type="text"
                        required
                        className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-sm transition-all outline-none border hover:bg-gray-50/80"
                        placeholder="Gebruikersnaam"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2 ml-1">Wachtwoord</label>
                      <input
                        type="password"
                        required
                        className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-sm transition-all outline-none border hover:bg-gray-50/80"
                        placeholder="Wachtwoord"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                      />
                    </div>

                    {loginError && (
                      <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3 animate-shake">
                        <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <Button type="submit" className="w-full justify-center h-14 text-lg font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5" size="lg">
                      Admin Inloggen
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </form>
                )}
                
                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                  <button
                    onClick={() => {
                      setShowAdminLogin(!showAdminLogin);
                      setLoginError('');
                    }}
                    className="text-sm font-medium text-gray-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 mx-auto"
                  >
                    {showAdminLogin ? (
                      <>
                        <UserCog className="w-4 h-4" />
                        Terug naar student login
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Docenten portaal
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ADMIN':
        return <AdminDashboard onBack={() => { signOut(); setCurrentAdmin(null); setView('PUBLIC_LANDING'); }} adminUsername={currentAdmin?.username || 'admin'} />;

      case 'STUDENT_DASHBOARD':
        if (!currentProfile) return null;
        return (
          <StudentDashboard
            student={currentProfile}
            onStartExam={startExam}
            onStartChat={startChat}
            onStartAIQuestions={startAIQuestions}
            onStartFlashcards={startFlashcards}
            onStartLookalikeExam={startLookalikeExam}
            onLogout={() => {
              setStudentName('');
              setStudentPassword('');
              setCurrentProfile(null);
              setView('PUBLIC_LANDING');
            }}
          />
        );

      case 'EXAM':
        if (!currentExamSession) return null;
        return (
          <ExamTaker 
            session={currentExamSession} 
            onFinish={() => setView('STUDENT_DASHBOARD')} 
          />
        );

      case 'SUBJECT_CHAT':
        if (!currentProfile || !chatSubject) return null;
        return (
          <SubjectChat
            subject={chatSubject}
            student={currentProfile}
            onBack={() => setView('STUDENT_DASHBOARD')}
          />
        );

      case 'FLASHCARD_STUDY':
        if (!currentProfile || !currentFlashcardSession) return null;
        return (
          <FlashcardStudy
            session={currentFlashcardSession}
            student={currentProfile}
            onBack={() => setView('STUDENT_DASHBOARD')}
            onComplete={() => setView('STUDENT_DASHBOARD')}
          />
        );

      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div className="font-sans antialiased text-gray-900 bg-white">
      {renderContent()}
    </div>
  );
};

export default App;
