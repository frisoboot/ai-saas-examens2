import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ExamSession, StudentProfile, FlashcardSession } from './types';
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

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Inner app die useAuth kan gebruiken
const AppContent: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading, user, profile, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentUsername, setPaymentUsername] = useState<string | null>(null);

  // Exam/Chat State
  const [currentExamSession, setCurrentExamSession] = useState<ExamSession | null>(null);
  const [currentFlashcardSession, setCurrentFlashcardSession] = useState<FlashcardSession | null>(null);
  const [chatSubject, setChatSubject] = useState<string | null>(null);

  // Check voor payment callback van Mollie
  useEffect(() => {
    const paymentCallback = searchParams.get('payment_callback');
    const payment = searchParams.get('payment');
    const username = searchParams.get('username');

    // Nieuwe flow: payment_callback=true na Mollie redirect
    if (paymentCallback === 'true') {
      navigate('/payment/callback', { replace: true });
    }
    // Legacy flow: voor oude redirects met payment=success
    else if (payment === 'success' && username) {
      setPaymentUsername(username);
      navigate('/payment/success', { replace: true });
    }
  }, [searchParams, navigate]);

  // Bepaal welk profiel te gebruiken (ingelogd of default fallback)
  const currentProfile: StudentProfile = profile || {
    name: 'Student',
    level: 'HAVO',
    strugglePoints: 'Algemene examenvoorbereiding',
    isActive: true
  };

  const startExam = async (subject: string, year?: number, tijdvak?: number) => {
    try {
      const allQuestions = await getQuestions();
      let subjectQuestions = allQuestions.filter(q =>
          q.subject === subject && q.level === currentProfile.level
      );

      // Filter by year if specified
      if (year !== undefined) {
        subjectQuestions = subjectQuestions.filter(q => q.examYear === year);
      }

      // Filter by tijdvak if specified
      if (tijdvak !== undefined) {
        subjectQuestions = subjectQuestions.filter(q => q.tijdvak === tijdvak);
      }

      if (subjectQuestions.length === 0) {
          let message = `Er zijn nog geen vragen voor ${subject}`;
          if (year && tijdvak) {
            message += ` uit ${year} Tijdvak ${tijdvak}`;
          } else if (year) {
            message += ` uit ${year}`;
          }
          message += ` op ${currentProfile.level} niveau.`;
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
      navigate('/exam');
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
      navigate('/exam');
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
    navigate('/chat');
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
      navigate('/flashcards');
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
      navigate('/exam');
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
        navigate('/');
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
    navigate('/');
    window.location.href = '/';
  };

  return (
    <div className="font-sans antialiased text-gray-900 bg-white">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <LandingPage
            onLogin={() => navigate('/login')}
            onCheckout={() => navigate('/checkout')}
          />
        } />

        <Route path="/login" element={
          isLoading ? (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Even geduld...</p>
              </div>
            </div>
          ) : isAuthenticated ? (
            <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
          ) : (
            <LoginPage
              onLogin={signIn}
              onCheckout={() => navigate('/checkout')}
              onLanding={() => navigate('/')}
              isLoading={false}
            />
          )
        } />

        <Route path="/checkout" element={
          <CheckoutForm
            onBack={() => navigate('/')}
            onSuccess={() => navigate('/login')}
          />
        } />

        <Route path="/payment/callback" element={
          <PaymentCallback
            onLogin={() => navigate('/login')}
            onRetry={() => navigate('/checkout')}
          />
        } />

        <Route path="/payment/success" element={
          <PaymentSuccess
            username={paymentUsername || ''}
            onLogin={() => navigate('/login')}
          />
        } />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <StudentDashboard
              student={currentProfile}
              onStartExam={startExam}
              onStartChat={startChat}
              onStartAIQuestions={startAIQuestions}
              onStartFlashcards={startFlashcards}
              onStartLookalikeExam={startLookalikeExam}
              onLogout={handleLogout}
              onSettings={() => navigate('/settings')}
            />
          </ProtectedRoute>
        } />

        <Route path="/exam" element={
          <ProtectedRoute>
            {currentExamSession ? (
              <ExamTaker
                session={currentExamSession}
                onFinish={() => navigate('/dashboard')}
              />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        } />

        <Route path="/chat" element={
          <ProtectedRoute>
            {chatSubject ? (
              <SubjectChat
                subject={chatSubject}
                student={currentProfile}
                onBack={() => navigate('/dashboard')}
              />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        } />

        <Route path="/flashcards" element={
          <ProtectedRoute>
            {currentFlashcardSession ? (
              <FlashcardStudy
                session={currentFlashcardSession}
                student={currentProfile}
                onBack={() => navigate('/dashboard')}
                onComplete={() => navigate('/dashboard')}
              />
            ) : (
              <Navigate to="/dashboard" replace />
            )}
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <SubscriptionSettings
              userEmail={user?.email || ''}
              onBack={() => navigate('/dashboard')}
            />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminDashboard
              key={user?.id || 'no-user'} // Force remount bij nieuwe login
              onBack={handleLogout}
              adminUsername={user?.email || 'admin'}
            />
          </AdminRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
