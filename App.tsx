import React, { useState } from 'react';
import { ViewState, ExamSession, StudentProfile, FlashcardSession } from './types';
import { getQuestions } from './services/storageService';
import { generateAIQuestions, generateFlashcards, generateLookalikeExamQuestions } from './services/geminiService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ExamTaker } from './components/ExamTaker';
import { SubjectChat } from './components/SubjectChat';
import { FlashcardStudy } from './components/FlashcardStudy';
import { LandingPage } from './components/LandingPage';
import { CheckoutForm } from './components/CheckoutForm';
import { PaymentSuccess } from './components/PaymentSuccess';
import { PaymentCallback } from './components/PaymentCallback';
import { SubscriptionSettings } from './components/SubscriptionSettings';

// Inner app die useAuth kan gebruiken
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, isAdmin, user, profile, signIn, signOut } = useAuth();

  const [view, setView] = useState<ViewState>('PUBLIC_LANDING');
  const [paymentUsername, setPaymentUsername] = useState<string | null>(null);

  // Exam/Chat State
  const [currentExamSession, setCurrentExamSession] = useState<ExamSession | null>(null);
  const [currentFlashcardSession, setCurrentFlashcardSession] = useState<FlashcardSession | null>(null);
  const [chatSubject, setChatSubject] = useState<string | null>(null);

  // Check voor payment callback van Mollie
  React.useEffect(() => {
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

  // Bepaal welk profiel te gebruiken (ingelogd of default fallback)
  const currentProfile: StudentProfile = profile || {
    name: 'Student',
    level: 'HAVO',
    strugglePoints: 'Algemene examenvoorbereiding',
    isActive: true
  };

  const startExam = async (subject: string, year?: number) => {
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
    // Show loading feedback
    console.log(`Gemini genereert ${count} ${currentProfile.level} AI examen vragen voor ${subject}${topic ? ` over "${topic}"` : ''}...\n\nDit kan 10-20 seconden duren.`);

    try {
      const aiQuestions = await generateAIQuestions(subject, currentProfile.level, count, topic);

      if (aiQuestions.length === 0) {
          alert(`Kon geen AI examen vragen genereren voor ${subject}.\n\nControleer of:\n- Je een geldige Gemini API key hebt (VITE_GEMINI_API_KEY)\n- Je internetverbinding werkt`);
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

      let errorMessage = 'Er ging iets mis bij het genereren van de AI examen vragen.\n\n';

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

  const handleLogout = async () => {
    // Probeer uit te loggen met retry voor stabiliteit
    let retries = 3;
    let lastError: string | null = null;

    while (retries > 0) {
      const { error } = await signOut();

      if (!error) {
        // Logout gelukt - navigeer naar landing
        setView('PUBLIC_LANDING');
        // Force page refresh om state volledig te resetten
        window.location.href = '/';
        return;
      }

      lastError = error;
      retries--;

      if (retries > 0) {
        // Wacht even voordat we opnieuw proberen
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Als alle retries gefaald zijn, toch doorsturen maar log de error
    console.error('Uitloggen mislukt na meerdere pogingen:', lastError);
    // Forceer toch een refresh om lokale state te clearen
    setView('PUBLIC_LANDING');
    window.location.href = '/';
  };

  const renderContent = () => {
    // Payment callback views - altijd tonen ongeacht auth status
    if (view === 'PAYMENT_CALLBACK') {
      return (
        <PaymentCallback
          onLogin={() => setView('LOGIN' as ViewState)}
          onRetry={() => setView('CHECKOUT')}
        />
      );
    }

    if (view === 'PAYMENT_SUCCESS') {
      return (
        <PaymentSuccess
          username={paymentUsername || ''}
          onLogin={() => setView('LOGIN' as ViewState)}
        />
      );
    }

    // Public views
    if (view === 'PUBLIC_LANDING') {
      return (
        <LandingPage
          onLogin={() => setView('LOGIN' as ViewState)}
          onCheckout={() => setView('CHECKOUT')}
        />
      );
    }

    if (view === 'CHECKOUT') {
      return (
        <CheckoutForm
          onBack={() => setView('PUBLIC_LANDING')}
          onSuccess={() => setView('LOGIN' as ViewState)}
        />
      );
    }

    // Login view
    if (view === 'LOGIN' as ViewState) {
      // Als al ingelogd, ga naar juiste dashboard
      if (isAuthenticated) {
        setView(isAdmin ? 'ADMIN' : 'STUDENT_DASHBOARD');
        return null;
      }

      return (
        <LoginPage
          onLogin={signIn}
          onCheckout={() => setView('CHECKOUT')}
          onLanding={() => setView('PUBLIC_LANDING')}
          isLoading={isLoading}
        />
      );
    }

    // Protected views - vereisen authenticatie
    if (!isAuthenticated && !isLoading) {
      // Als niet ingelogd en probeert protected view te openen
      if (['ADMIN', 'STUDENT_DASHBOARD', 'EXAM', 'SUBJECT_CHAT', 'FLASHCARD_STUDY', 'SETTINGS'].includes(view)) {
        return (
          <LoginPage
            onLogin={signIn}
            onCheckout={() => setView('CHECKOUT')}
            onLanding={() => setView('PUBLIC_LANDING')}
            isLoading={isLoading}
          />
        );
      }
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Even geduld...</p>
          </div>
        </div>
      );
    }

    switch (view) {
      case 'LANDING':
        // Redirect to dashboard directly
        setView('STUDENT_DASHBOARD');
        return null;

      case 'ADMIN':
        // Admin dashboard - alleen voor admins
        if (!isAdmin) {
          setView('STUDENT_DASHBOARD');
          return null;
        }
        return (
          <AdminDashboard
            onBack={handleLogout}
            adminUsername={user?.email || 'admin'}
          />
        );

      case 'STUDENT_DASHBOARD':
        return (
          <StudentDashboard
            student={currentProfile}
            onStartExam={startExam}
            onStartChat={startChat}
            onStartAIQuestions={startAIQuestions}
            onStartFlashcards={startFlashcards}
            onStartLookalikeExam={startLookalikeExam}
            onLogout={handleLogout}
            onSettings={() => setView('SETTINGS')}
          />
        );

      case 'SETTINGS':
        return (
          <SubscriptionSettings
            userEmail={user?.email || ''}
            onBack={() => setView('STUDENT_DASHBOARD')}
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
        if (!chatSubject) return null;
        return (
          <SubjectChat
            subject={chatSubject}
            student={currentProfile}
            onBack={() => setView('STUDENT_DASHBOARD')}
          />
        );

      case 'FLASHCARD_STUDY':
        if (!currentFlashcardSession) return null;
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

// Main App component met AuthProvider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
