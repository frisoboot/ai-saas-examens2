import React, { useState } from 'react';
import { ViewState, ExamSession, StudentProfile, StudentLevel } from './types';
import { getQuestions, saveStudentProfile, getStudentProfile, verifyStudentLogin } from './services/storageService';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { ExamTaker } from './components/ExamTaker';
import { SubjectChat } from './components/SubjectChat';
import { Button } from './components/Button';
import { GraduationCap, UserCog, ArrowRight, Lock, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';

const ADMIN_PIN = "admin123";

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LANDING');
  
  // Auth State
  const [isRegistering, setIsRegistering] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  // Input State
  const [studentName, setStudentName] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentLevel, setStudentLevel] = useState<StudentLevel>('HAVO');
  const [studentStruggle, setStudentStruggle] = useState('');
  const [adminPinInput, setAdminPinInput] = useState('');
  
  const [currentProfile, setCurrentProfile] = useState<StudentProfile | null>(null);
  const [currentExamSession, setCurrentExamSession] = useState<ExamSession | null>(null);
  const [chatSubject, setChatSubject] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');

  const handleStudentAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!studentName.trim() || !studentPassword.trim()) {
      setLoginError("Vul naam en wachtwoord in.");
      return;
    }

    if (isRegistering) {
      const existing = getStudentProfile(studentName);
      if (existing) {
        setLoginError("Deze naam bestaat al. Log in of kies een andere naam.");
        return;
      }

      const newProfile: StudentProfile = {
        name: studentName,
        password: studentPassword,
        level: studentLevel,
        strugglePoints: studentStruggle || 'Algemene examenstof'
      };
      
      saveStudentProfile(newProfile);
      setCurrentProfile(newProfile);
      setView('STUDENT_DASHBOARD');
      
    } else {
      const isValid = verifyStudentLogin(studentName, studentPassword);
      if (isValid) {
        const profile = getStudentProfile(studentName);
        if (profile) {
            setCurrentProfile(profile);
            setView('STUDENT_DASHBOARD');
        }
      } else {
        setLoginError("Naam of wachtwoord onjuist.");
      }
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput === ADMIN_PIN) {
      setView('ADMIN');
      setShowAdminLogin(false);
      setAdminPinInput('');
    } else {
      alert("Foute toegangscode!");
    }
  };

  const startExam = (subject: string) => {
    if (!currentProfile) return;

    const allQuestions = getQuestions();
    const subjectQuestions = allQuestions.filter(q => 
        q.subject === subject && q.level === currentProfile.level
    );
    
    if (subjectQuestions.length === 0) {
        alert(`Er zijn nog geen vragen voor ${subject} op ${currentProfile.level} niveau.`);
        return;
    }

    setCurrentExamSession({
      studentName: currentProfile.name,
      subject,
      questions: subjectQuestions,
      currentQuestionIndex: 0,
      answers: {}
    });
    setView('EXAM');
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
                  <div className="flex bg-slate-100/80 p-1 rounded-xl mb-8">
                    <button 
                      type="button"
                      onClick={() => { setIsRegistering(false); setLoginError(''); }}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${!isRegistering ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Inloggen
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setIsRegistering(true); setLoginError(''); }}
                      className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${isRegistering ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Registreren
                    </button>
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

                    {isRegistering && (
                      <div className="space-y-5 animate-fadeIn">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Niveau</label>
                          <div className="grid grid-cols-3 gap-3">
                              {(['VMBO-TL', 'HAVO', 'VWO'] as StudentLevel[]).map((lvl) => (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => setStudentLevel(lvl)}
                                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                    studentLevel === lvl 
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  {lvl}
                                </button>
                              ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Waar heb je moeite mee?</label>
                          <textarea
                            rows={2}
                            className="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm resize-none"
                            placeholder="Bijv: Economie vraagstukken, Engelse teksten..."
                            value={studentStruggle}
                            onChange={(e) => setStudentStruggle(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {loginError && (
                      <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center">
                        <Lock className="w-4 h-4 mr-2 flex-shrink-0" />
                        {loginError}
                      </div>
                    )}

                    <Button type="submit" className="w-full justify-center h-12 text-base shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all" size="lg">
                      {isRegistering ? 'Account Aanmaken' : 'Starten'}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </form>
                </div>

                {/* Footer Admin Link */}
                <div className="text-center">
                   {!showAdminLogin ? (
                    <button 
                      onClick={() => setShowAdminLogin(true)}
                      className="text-xs font-semibold text-slate-400 hover:text-indigo-600 inline-flex items-center transition-colors px-4 py-2 rounded-lg hover:bg-slate-100"
                    >
                      <UserCog className="w-3 h-3 mr-2" />
                      Docenten portaal
                    </button>
                  ) : (
                    <form onSubmit={handleAdminLogin} className="flex gap-2 justify-center animate-fadeIn max-w-[200px] mx-auto">
                       <input 
                         type="password"
                         placeholder="PIN Code"
                         className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                         value={adminPinInput}
                         onChange={(e) => setAdminPinInput(e.target.value)}
                         autoFocus
                       />
                       <button 
                         type="button" 
                         onClick={() => setShowAdminLogin(false)}
                         className="px-2 text-slate-400 hover:text-slate-600"
                       >
                         <Lock className="w-3 h-3" />
                       </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'ADMIN':
        return <AdminDashboard onBack={() => setView('LANDING')} />;

      case 'STUDENT_DASHBOARD':
        if (!currentProfile) return null;
        return (
          <StudentDashboard 
            student={currentProfile}
            onStartExam={startExam} 
            onStartChat={startChat}
            onLogout={() => {
              setStudentName('');
              setStudentPassword('');
              setStudentStruggle('');
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