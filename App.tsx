import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ExamSession, StudentProfile, FlashcardSession } from './types';
import { getQuestions } from './services/storageService';
import { generateFlashcards, generateLookalikeExamQuestions } from './services/geminiService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ExamTaker } from './components/ExamTaker';
import { SubjectChat } from './components/SubjectChat';
import { FlashcardStudy } from './components/FlashcardStudy';
import { LandingPageNew as LandingPage } from './components/LandingPageNew';
import { CheckoutForm } from './components/CheckoutForm';
import { PaymentSuccess } from './components/PaymentSuccess';
import { PaymentCallback } from './components/PaymentCallback';
import { SubscriptionSettings } from './components/SubscriptionSettings';
import { LoadingScreen } from './components/LoadingScreen';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Profiel laden..." />;
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
    return <LoadingScreen message="Admin verificatie..." />;
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
  // Payment ID uit Mollie redirect URL (fallback voor localStorage)
  const [urlPaymentId, setUrlPaymentId] = useState<string | null>(null);

  // Exam/Chat State
  const [currentExamSession, setCurrentExamSession] = useState<ExamSession | null>(null);
  const [currentFlashcardSession, setCurrentFlashcardSession] = useState<FlashcardSession | null>(null);
  const [chatSubject, setChatSubject] = useState<string | null>(null);

  // Check voor payment callback van Mollie
  useEffect(() => {
    const paymentCallback = searchParams.get('payment_callback');
    const payment = searchParams.get('payment');
    const username = searchParams.get('username');
    // Payment ID uit Mollie redirect URL (fallback voor als localStorage leeg is)
    const pid = searchParams.get('pid');

    // Nieuwe flow: payment_callback=true na Mollie redirect
    if (paymentCallback === 'true') {
      if (pid) {
        setUrlPaymentId(pid);
      }
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

  const startExam = async (subject: string, year?: number, timeLimit?: number) => {
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
        startTime: Date.now(),
        timeLimit // Time limit in minutes (0 = no limit)
      });
      navigate('/exam');
    } catch (error) {
      console.error('Fout bij ophalen vragen:', error);
      alert('Er ging iets mis bij het ophalen van de vragen.');
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
        timeLimit // Time limit in minutes (0 = no limit)
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
    // Stap 1: Roep signOut aan om Supabase sessie te invalideren
    await signOut();
    // Stap 2: Wis resterende storage en redirect
    localStorage.clear();
    sessionStorage.clear();
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
            <LoadingScreen message="Inloggen..." />
          ) : isAuthenticated ? (
            <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
          ) : (
            <LoginPage
              onLogin={signIn}
              onCheckout={() => navigate('/checkout')}
              onLanding={() => navigate('/')}
              onForgotPassword={() => navigate('/forgot-password')}
              isLoading={false}
            />
          )
        } />

        <Route path="/forgot-password" element={
          isAuthenticated ? (
            <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
          ) : (
            <ForgotPasswordPage
              onBack={() => navigate('/login')}
              onLanding={() => navigate('/')}
            />
          )
        } />

        <Route path="/reset-password" element={
          <ResetPasswordPage
            onSuccess={() => navigate(isAdmin ? '/admin' : '/dashboard')}
            onLogin={() => navigate('/login')}
          />
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
            urlPaymentId={urlPaymentId}
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
