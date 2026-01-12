import React, { useState } from 'react';
import { ViewState, ExamSession, StudentProfile, StudentLevel, AdminUser } from './types';
import { getQuestions } from './services/storageService';
import { verifyStudentLogin, verifyAdminLogin } from './services/authService';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { ExamTaker } from './components/ExamTaker';
import { SubjectChat } from './components/SubjectChat';
import { AIQuestionGenerator } from './components/AIQuestionGenerator';
import { Button } from './components/Button';
import { GraduationCap, UserCog, ArrowRight, Lock, LogIn, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LANDING');

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
  const [chatSubject, setChatSubject] = useState<string | null>(null);
  const [aiQuestionSubject, setAiQuestionSubject] = useState<string | null>(null);
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
    } catch (error) {
      setLoginError("Er ging iets mis bij het inloggen.");
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

  const startAIQuestions = (subject: string) => {
    setAiQuestionSubject(subject);
    setView('AI_QUESTIONS');
  };

  const startChat = (subject: string) => {
    setChatSubject(subject);
    setView('SUBJECT_CHAT');
  };

  const renderContent = () => {
    switch (view) {
      case 'LANDING':
        return (
          <div className="min-h-screen flex bg-white">
            {/* Left Side - Branding & Info */}
            <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 relative overflow-hidden flex-col justify-between p-12 text-white">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2073&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/40 to-transparent"></div>
              
              <div className="relative z-10">
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl w-fit mb-6">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-5xl font-bold leading-tight mb-4">De slimste manier om te slagen.</h1>
                <p className="text-indigo-100 text-xl max-w-md">Oefen met AI-gegenereerde vragen en krijg direct feedback op jouw niveau.</p>
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold">Gepersonaliseerd</h3>
                    <p className="text-indigo-200 text-sm">Op maat gemaakt voor VMBO, HAVO en VWO.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <UserCog className="w-5 h-5" />
                  </div>
                   <div>
                    <h3 className="font-bold">AI Feedback</h3>
                    <p className="text-indigo-200 text-sm">Direct uitleg bij open vragen.</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 text-xs text-indigo-300">
                © {new Date().getFullYear()} AI Examentrainer
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
              <div className="w-full max-w-md space-y-8">
                
                <div className="lg:hidden text-center mb-8">
                  <div className="bg-indigo-600 p-3 rounded-xl inline-block mb-4 text-white shadow-lg shadow-indigo-200">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">AI Examentrainer</h1>
                </div>

                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
                  {!showAdminLogin ? (
                    <>
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Student Login</h2>
                        <p className="text-slate-500 text-sm mt-2">Log in met je account</p>
                      </div>

                      <form onSubmit={handleStudentAuth} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Gebruikersnaam</label>
                      <input
                        type="text"
                        required
                        className="block w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                        placeholder="Je naam..."
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Wachtwoord</label>
                      <input
                        type="password"
                        required
                        className="block w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                        placeholder="Je wachtwoord..."
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                      />
                    </div>

                        {loginError && (
                          <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center">
                            <Lock className="w-4 h-4 mr-2 flex-shrink-0" />
                            {loginError}
                          </div>
                        )}

                        <Button type="submit" className="w-full justify-center h-12 text-base shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all" size="lg">
                          Inloggen
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      </form>
                    </>
                  ) : (
                    <>
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Admin Login</h2>
                        <p className="text-slate-500 text-sm mt-2">Inloggen als docent</p>
                      </div>

                      <form onSubmit={handleAdminLogin} className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Gebruikersnaam</label>
                          <input
                            type="text"
                            required
                            className="block w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            placeholder="Admin gebruikersnaam"
                            value={adminUsername}
                            onChange={(e) => setAdminUsername(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Wachtwoord</label>
                          <input
                            type="password"
                            required
                            className="block w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            placeholder="Admin wachtwoord"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                          />
                        </div>

                        {loginError && (
                          <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center">
                            <Lock className="w-4 h-4 mr-2 flex-shrink-0" />
                            {loginError}
                          </div>
                        )}

                        <Button type="submit" className="w-full justify-center h-12 text-base shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all" size="lg">
                          Admin Inloggen
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      </form>
                    </>
                  )}
                </div>

                {/* Footer Toggle Link */}
                <div className="text-center">
                  <button
                    onClick={() => {
                      setShowAdminLogin(!showAdminLogin);
                      setLoginError('');
                    }}
                    className="text-xs font-semibold text-slate-400 hover:text-indigo-600 inline-flex items-center transition-colors px-4 py-2 rounded-lg hover:bg-slate-100"
                  >
                    <UserCog className="w-3 h-3 mr-2" />
                    {showAdminLogin ? 'Terug naar student login' : 'Docenten portaal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ADMIN':
        return <AdminDashboard onBack={() => setView('LANDING')} adminUsername={currentAdmin?.username || 'admin'} />;

      case 'STUDENT_DASHBOARD':
        if (!currentProfile) return null;
        return (
          <StudentDashboard
            student={currentProfile}
            onStartExam={startExam}
            onStartChat={startChat}
            onStartAIQuestions={startAIQuestions}
            onLogout={() => {
              setStudentName('');
              setStudentPassword('');
              setCurrentProfile(null);
              setView('LANDING');
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

      case 'AI_QUESTIONS':
        if (!currentProfile || !aiQuestionSubject) return null;
        return (
          <AIQuestionGenerator
            subject={aiQuestionSubject}
            student={currentProfile}
            onBack={() => setView('STUDENT_DASHBOARD')}
          />
        );

      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div className="font-sans antialiased text-slate-900 bg-[#f8fafc]">
      {renderContent()}
    </div>
  );
};

export default App;