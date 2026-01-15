import React, { useState } from 'react';
import { Question, ExamSession, ExamResult } from '../types';
import { saveResult } from '../services/storageService';
import { updateProgressAfterExam } from '../services/progressService';
import { getExplanation, generateExamSummary } from '../services/geminiService';
import { Button } from './Button';
import { CheckCircle, XCircle, ArrowRight, Home, BrainCircuit, FileText, ChevronRight, X, Lightbulb, Target, TrendingUp, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ExamTakerProps {
  session: ExamSession;
  onFinish: () => void;
}

interface ExamSummary {
  overall: string;
  strengths: string[];
  improvements: string[];
  studyTips: string[];
}

export const ExamTaker: React.FC<ExamTakerProps> = ({ session: initialSession, onFinish }) => {
  const [session, setSession] = useState(initialSession);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [openAnswerInput, setOpenAnswerInput] = useState('');

  // Review state
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);
  const [examSummary, setExamSummary] = useState<ExamSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Timer state for Look-alike exams
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    if (initialSession.timeLimit && initialSession.timeLimit > 0) {
      return initialSession.timeLimit * 60; // Convert minutes to seconds
    }
    return null;
  });

  // Prevent multiple calls to finishExam
  const isFinishingRef = React.useRef(false);

  const currentQuestion = session.questions[activeQuestionIdx];
  const isLastQuestion = activeQuestionIdx === session.questions.length - 1;
  const progress = ((activeQuestionIdx + 1) / session.questions.length) * 100;

  React.useEffect(() => {
    if (currentQuestion.type === 'OPEN') {
      const existingAns = session.answers[currentQuestion.id];
      setOpenAnswerInput(typeof existingAns === 'string' ? existingAns : '');
    }
  }, [activeQuestionIdx, currentQuestion]);

  // Timer countdown effect
  React.useEffect(() => {
    if (remainingSeconds === null || isFinished || isSubmitting) return;

    if (remainingSeconds <= 0) {
      // Time's up - auto-finish the exam
      finishExam();
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, isFinished, isSubmitting]);

  // Format remaining time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine if time is running low (less than 2 minutes)
  const isTimeLow = remainingSeconds !== null && remainingSeconds < 120;

  const handleSelectAnswer = (val: number | string) => {
    setSession(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [currentQuestion.id]: val
      }
    }));
  };

  const handleNext = () => {
    if (currentQuestion.type === 'OPEN') {
      handleSelectAnswer(openAnswerInput);
    }
    if (isLastQuestion) {
      finishExam();
    } else {
      setActiveQuestionIdx(prev => prev + 1);
    }
  };

  const finishExam = async () => {
    // Prevent multiple calls
    if (isFinishingRef.current) {
      return;
    }
    isFinishingRef.current = true;
    setIsSubmitting(true);

    let finalAnswers = { ...session.answers };
    if (currentQuestion.type === 'OPEN') {
      finalAnswers[currentQuestion.id] = openAnswerInput;
    }

    let correctCount = 0;
    session.questions.forEach(q => {
      if (q.type === 'MULTIPLE_CHOICE') {
        if (finalAnswers[q.id] === q.correctIndex) correctCount++;
      }
    });

    // Calculate duration in seconds
    const durationSeconds = session.startTime
      ? Math.floor((Date.now() - session.startTime) / 1000)
      : undefined;

    const result: ExamResult = {
      id: Date.now().toString(),
      studentName: session.studentName,
      subject: session.subject,
      score: correctCount,
      totalQuestions: session.questions.length,
      date: new Date().toISOString(),
      answers: Object.entries(finalAnswers).map(([qid, val]) => ({ questionId: qid, value: val as string | number })),
      examYear: session.examYear,
      examType: session.examType,
      durationSeconds,
      level: session.questions[0]?.level // Get level from first question
    };

    try {
      await saveResult(result);

      // Update student progress
      await updateProgressAfterExam(result);

      // Generate AI summary automatically (only once)
      if (!examSummary && !loadingSummary) {
        setLoadingSummary(true);
        try {
          const summary = await generateExamSummary(
            session.questions,
            finalAnswers,
            correctCount,
            session.questions.length,
            session.studentName,
            session.subject
          );
          setExamSummary(summary);
        } catch (error) {
          console.error('Fout bij genereren samenvatting:', error);
        } finally {
          setLoadingSummary(false);
        }
      }
    } catch (error) {
      console.error('Fout bij opslaan resultaat:', error);
    }
    setSession(prev => ({ ...prev, answers: finalAnswers }));
    setIsFinished(true);
  };

  const handleRequestAIExplanation = async (question: Question) => {
    if (aiExplanations[question.id]) return;
    setLoadingExplanation(question.id);
    const answer = session.answers[question.id];
    if (answer === undefined) {
        setLoadingExplanation(null);
        return;
    }
    const explanation = await getExplanation(question, answer);
    setAiExplanations(prev => ({ ...prev, [question.id]: explanation }));
    setLoadingExplanation(null);
  };

  // --- SUBMITTING LOADING SCREEN ---
  if (isSubmitting && !isFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="text-center relative z-10">
          {/* Animated circles background */}
          <div className="relative mb-10">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full border-4 border-white/10 animate-ping" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-4 border-white/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-white/30 animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            <div className="relative w-24 h-24 mx-auto bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl shadow-black/20 border border-white/30">
              <BrainCircuit className="w-12 h-12 text-white animate-pulse" />
            </div>
          </div>

          {/* Loading text */}
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
            Toets wordt verwerkt...
          </h2>
          <p className="text-white/90 text-lg md:text-xl mb-10 max-w-md mx-auto drop-shadow">
            Je antwoorden worden opgeslagen en geanalyseerd door de AI
          </p>

          {/* Progress indicators */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="w-4 h-4 bg-white rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0ms' }} />
            <div className="w-4 h-4 bg-white rounded-full animate-bounce shadow-lg" style={{ animationDelay: '150ms' }} />
            <div className="w-4 h-4 bg-white rounded-full animate-bounce shadow-lg" style={{ animationDelay: '300ms' }} />
          </div>

          {/* Info card */}
          <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 max-w-md mx-auto border border-white/30 shadow-2xl">
            <div className="flex items-center gap-4 text-white text-base">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-bold text-lg mb-1">{session.questions.length} vragen</div>
                <div className="text-white/80 text-sm">Succesvol beantwoord</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- REVIEW MODE ---
  if (isFinished) {
    const mcScore = session.questions.filter(q => q.type === 'MULTIPLE_CHOICE' && session.answers[q.id] === q.correctIndex).length;
    const totalMc = session.questions.filter(q => q.type === 'MULTIPLE_CHOICE').length;
    const openCount = session.questions.filter(q => q.type === 'OPEN').length;
    const percentage = totalMc > 0 ? Math.round((mcScore / totalMc) * 100) : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50/40 to-pink-50/30 py-8 md:py-12 px-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-20 w-96 h-96 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 -right-20 w-96 h-96 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Results Header */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-200/50 p-8 md:p-12 mb-8 border border-white/60">
            <div className="text-center mb-10">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-lg opacity-50 animate-pulse" />
                <div className="relative inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg">
                  <CheckCircle className="w-5 h-5" />
                  Toets Voltooid
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 bg-clip-text text-transparent mb-4">
                Geweldig gedaan!
              </h2>
              <p className="text-slate-700 text-lg max-w-2xl mx-auto leading-relaxed">
                Je toets is afgerond. Bekijk hieronder je resultaten en vraag de AI om persoonlijke uitleg bij elke vraag.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 mb-10">
               {totalMc > 0 && (
                 <div className="relative group">
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
                   <div className="relative bg-gradient-to-br from-indigo-50 via-purple-50/80 to-pink-50/50 rounded-2xl p-8 border-2 border-indigo-200 text-center shadow-lg hover:shadow-xl transition-all">
                      <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 flex items-center justify-center gap-2">
                        <Target className="w-3.5 h-3.5" />
                        Meerkeuze Score
                      </div>
                      <div className="text-6xl font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        {mcScore}<span className="text-3xl opacity-50">/</span>{totalMc}
                      </div>
                      <div className="text-base font-bold text-indigo-700">{percentage}% correct</div>
                   </div>
                 </div>
               )}
               {openCount > 0 && (
                 <div className="relative group">
                   <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
                   <div className="relative bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 border-2 border-orange-200 text-center shadow-lg hover:shadow-xl transition-all">
                      <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-3 flex items-center justify-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        Open Vragen
                      </div>
                      <div className="text-6xl font-bold bg-gradient-to-br from-orange-500 to-amber-500 bg-clip-text text-transparent mb-2">{openCount}</div>
                      <div className="text-base font-bold text-orange-700">Beantwoord</div>
                   </div>
                 </div>
               )}
               <div className="relative group">
                 <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition-opacity" />
                 <div className="relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200 text-center shadow-lg hover:shadow-xl transition-all">
                    <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-3 flex items-center justify-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Totaal Vragen
                    </div>
                    <div className="text-6xl font-bold bg-gradient-to-br from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">{session.questions.length}</div>
                    <div className="text-base font-bold text-green-700">Gemaakt</div>
                 </div>
               </div>
            </div>

            <div className="text-center">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-400 to-slate-500 rounded-xl blur-md opacity-30" />
                <Button onClick={onFinish} variant="secondary" className="relative shadow-xl hover:shadow-2xl transition-all hover:scale-105 px-8 py-3 font-bold">
                    <Home className="w-5 h-5 mr-2"/>
                    Terug naar Dashboard
                </Button>
              </div>
            </div>
          </div>

          {/* AI Summary Section */}
          {loadingSummary ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 mb-8 border border-indigo-200 animate-pulse">
              <div className="flex flex-col items-center justify-center gap-4 text-indigo-600">
                <div className="relative">
                  <BrainCircuit className="w-12 h-12 animate-pulse" />
                  <div className="absolute -inset-2 bg-indigo-400/20 rounded-full animate-ping" />
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900 mb-1">AI analyseert je resultaten...</p>
                  <p className="text-sm text-slate-500">Dit duurt een paar seconden</p>
                </div>
              </div>
            </div>
          ) : examSummary && (
            <div className="bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/50 backdrop-blur-sm rounded-3xl shadow-2xl shadow-indigo-200/50 p-6 md:p-10 mb-8 border-2 border-indigo-100">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8 pb-6 border-b-2 border-indigo-100">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-300/50">
                  <BrainCircuit className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">AI Persoonlijke Feedback</h3>
                  <p className="text-slate-600">Gebaseerd op jouw antwoorden en prestatie</p>
                </div>
                <div className="bg-white/80 px-4 py-2 rounded-full border border-indigo-200 backdrop-blur-sm">
                  <span className="text-sm font-bold text-indigo-600">✨ AI Gegenereerd</span>
                </div>
              </div>

              {/* Overall feedback */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 md:p-8 mb-6 border-2 border-white shadow-lg">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📊</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1">Algemene Beoordeling</h4>
                  </div>
                </div>
                <p className="text-slate-700 text-lg leading-relaxed pl-13">{examSummary.overall}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Strengths */}
                {examSummary.strengths.length > 0 && (
                  <div className="bg-gradient-to-br from-green-50/90 to-emerald-50/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-100 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shadow-md">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-lg">Sterke Punten</h4>
                    </div>
                    <ul className="space-y-3">
                      {examSummary.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-3 bg-white/80 rounded-xl p-3 border border-green-100">
                          <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                          <span className="text-slate-700 leading-relaxed">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {examSummary.improvements.length > 0 && (
                  <div className="bg-gradient-to-br from-orange-50/90 to-amber-50/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-100 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-md">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-bold text-slate-900 text-lg">Verbeterpunten</h4>
                    </div>
                    <ul className="space-y-3">
                      {examSummary.improvements.map((improvement, idx) => (
                        <li key={idx} className="flex items-start gap-3 bg-white/80 rounded-xl p-3 border border-orange-100">
                          <span className="text-orange-500 font-bold flex-shrink-0">→</span>
                          <span className="text-slate-700 leading-relaxed">{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Study Tips */}
              {examSummary.studyTips.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50/90 to-cyan-50/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-100 shadow-lg">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-md">
                      <Lightbulb className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">Studietips</h4>
                      <p className="text-xs text-blue-700">Concrete acties om je verder te helpen</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {examSummary.studyTips.map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-white/90 rounded-xl p-4 border border-blue-100">
                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <span className="text-slate-700 leading-relaxed text-sm">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Question Review Cards */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-slate-600" />
              <h3 className="text-xl font-bold text-slate-900">Vraag voor Vraag Review</h3>
            </div>

            {session.questions.map((q, idx) => {
              const answer = session.answers[q.id];
              const isMC = q.type === 'MULTIPLE_CHOICE';
              const isCorrectMC = isMC && answer === q.correctIndex;

              return (
                <div key={q.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border-2 overflow-hidden transition-all hover:shadow-2xl">
                  {/* Status Bar */}
                  <div className={`h-2 w-full ${isMC ? (isCorrectMC ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-red-400 to-red-600') : 'bg-gradient-to-r from-orange-400 to-orange-600'}`} />

                  <div className="p-6 md:p-8">
                    {/* Question Header */}
                    <div className="flex items-start gap-4 mb-6">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                          isMC ? (isCorrectMC ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-red-400 to-red-600') : 'bg-gradient-to-br from-orange-400 to-orange-600'
                        }`}>
                          {isMC ? (
                            isCorrectMC ? <CheckCircle className="w-7 h-7 text-white" /> : <XCircle className="w-7 h-7 text-white" />
                          ) : (
                            <BrainCircuit className="w-7 h-7 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full uppercase tracking-wider">
                            Vraag {idx + 1} van {session.questions.length}
                          </span>
                          {isMC && (
                            <span className={`px-3 py-1 font-bold text-xs rounded-full ${
                              isCorrectMC
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {isCorrectMC ? '✓ Correct' : '✗ Fout'}
                            </span>
                          )}
                          {!isMC && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 font-bold text-xs rounded-full">
                              Open Vraag
                            </span>
                          )}
                        </div>
                        <h4 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">{q.text}</h4>
                      </div>
                    </div>

                    {/* Answer Display */}
                    <div className="mb-6">
                      {isMC ? (
                        <div className="space-y-2">
                          {q.options?.map((opt, optIdx) => {
                            const isSelected = optIdx === (answer as number);
                            const isRealCorrect = optIdx === q.correctIndex;

                            return (
                              <div
                                key={optIdx}
                                className={`p-4 rounded-xl flex items-center justify-between transition-all ${
                                  isRealCorrect
                                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 shadow-md'
                                    : isSelected && !isRealCorrect
                                      ? 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 shadow-md'
                                      : 'bg-slate-50 border border-slate-200 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-4 flex-1">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                    isRealCorrect
                                      ? 'bg-green-500 text-white'
                                      : isSelected && !isRealCorrect
                                        ? 'bg-red-500 text-white'
                                        : 'bg-slate-300 text-slate-600'
                                  }`}>
                                    {String.fromCharCode(65 + optIdx)}
                                  </div>
                                  <span className={`text-base ${
                                    isRealCorrect || (isSelected && !isRealCorrect)
                                      ? 'font-semibold text-slate-900'
                                      : 'text-slate-600'
                                  }`}>
                                    {opt}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isSelected && (
                                    <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-1 rounded-full">
                                      Jouw keuze
                                    </span>
                                  )}
                                  {isRealCorrect && <CheckCircle className="w-6 h-6 text-green-600" />}
                                  {isSelected && !isRealCorrect && <XCircle className="w-6 h-6 text-red-600" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">Je</span>
                              </div>
                              <span className="text-sm font-bold text-blue-900 uppercase tracking-wider">Jouw antwoord</span>
                            </div>
                            <p className="text-slate-800 leading-relaxed">{answer as string || 'Geen antwoord gegeven'}</p>
                          </div>

                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-white" />
                              </div>
                              <span className="text-sm font-bold text-green-900 uppercase tracking-wider">Model antwoord</span>
                            </div>
                            <p className="text-slate-800 leading-relaxed">{q.modelAnswer}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Explanation Section */}
                    {!aiExplanations[q.id] ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRequestAIExplanation(q)}
                        disabled={loadingExplanation === q.id}
                        className="w-full md:w-auto bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 hover:border-indigo-300 hover:shadow-lg"
                      >
                        {loadingExplanation === q.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent mr-2" />
                            AI is aan het denken...
                          </>
                        ) : (
                          <>
                            <BrainCircuit className="w-4 h-4 mr-2" />
                            Vraag AI om uitleg
                          </>
                        )}
                      </Button>
                    ) : (
                      <div className="bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/50 rounded-xl p-6 border-2 border-indigo-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-indigo-200">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                            <BrainCircuit className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900">AI Uitleg</h5>
                            <p className="text-xs text-slate-600">Persoonlijke feedback op jouw antwoord</p>
                          </div>
                        </div>
                        <div className="text-slate-700 leading-relaxed prose prose-indigo max-w-none prose-p:my-2 prose-strong:text-indigo-700 prose-ul:my-2">
                          <ReactMarkdown>{aiExplanations[q.id]}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- EXAM MODE (SPLIT SCREEN) ---
  const hasContext = !!currentQuestion.contextText;

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] overflow-hidden text-slate-900 font-sans">
      {/* Minimal Header */}
      <div className="bg-white border-b border-slate-100 h-14 flex-shrink-0 flex items-center justify-between px-6 sticky top-0 z-20">
         <div className="flex items-center gap-4">
            <span className="font-bold text-slate-700">{session.subject}</span>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-slate-500">Vraag {activeQuestionIdx + 1} / {session.questions.length}</span>
         </div>

         {/* Central Progress */}
         <div className="absolute left-1/2 transform -translate-x-1/2 w-1/3 max-w-xs hidden md:block">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
         </div>

         <div className="flex items-center gap-4">
            {/* Timer display for Look-alike exams */}
            {remainingSeconds !== null && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold transition-all ${
                isTimeLow
                  ? 'bg-red-100 text-red-700 animate-pulse'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                <Clock className={`w-5 h-5 ${isTimeLow ? 'animate-bounce' : ''}`} />
                <span>{formatTime(remainingSeconds)}</span>
              </div>
            )}

            <button
              onClick={onFinish}
              className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
              title="Stoppen"
            >
              <X className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* Main Content Split */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
         
         {/* LEFT COLUMN: Context (Paper/Reading Mode) */}
         {hasContext ? (
            <div className="lg:w-1/2 bg-[#fdfbf7] border-r border-[#eaddcf] overflow-y-auto custom-scrollbar">
                <div className="max-w-2xl mx-auto p-8 lg:p-12">
                   <div className="flex items-center gap-2 text-[#8c857b] font-serif italic mb-6 border-b border-[#eaddcf] pb-2">
                      <FileText className="w-4 h-4" />
                      <span>Bronmateriaal</span>
                   </div>
                   <div className="prose prose-slate max-w-none font-serif text-lg leading-loose text-slate-800">
                      <ReactMarkdown>{currentQuestion.contextText || ''}</ReactMarkdown>
                   </div>
                </div>
            </div>
         ) : (
            <div className="hidden lg:block lg:w-1/4 bg-[#f8fafc] border-r border-slate-100" />
         )}

         {/* RIGHT COLUMN: Question (Interaction) */}
         <div className={`flex-1 bg-white overflow-y-auto flex flex-col ${hasContext ? 'lg:w-1/2' : 'lg:w-2/4 lg:max-w-3xl lg:border-r lg:border-slate-100'}`}>
            <div className="flex-1 p-6 lg:p-10 max-w-3xl mx-auto w-full flex flex-col">
               
               {currentQuestion.imageUrl && (
                  <div className="mb-6 rounded-xl border border-slate-100 overflow-hidden bg-slate-50 flex justify-center">
                    <img 
                      src={currentQuestion.imageUrl} 
                      alt="Vraag" 
                      className="max-h-[40vh] w-auto object-contain"
                    />
                  </div>
                )}

                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8 leading-tight">
                  {currentQuestion.text}
                </h2>

                <div className="space-y-4 mb-8 flex-1">
                  {currentQuestion.type === 'MULTIPLE_CHOICE' ? (
                     currentQuestion.options?.map((opt, idx) => {
                       const isSelected = session.answers[currentQuestion.id] === idx;
                       return (
                        <button
                          key={idx}
                          onClick={() => handleSelectAnswer(idx)}
                          className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 flex items-center group relative ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/50 shadow-sm z-10'
                              : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50 bg-white'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-5 font-bold text-sm transition-colors flex-shrink-0 ${
                             isSelected
                             ? 'border-indigo-600 bg-indigo-600 text-white'
                             : 'border-slate-300 text-slate-400 group-hover:border-indigo-400 group-hover:text-indigo-500'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className={`text-lg ${isSelected ? 'font-semibold text-indigo-900' : 'text-slate-700'}`}>{opt}</span>
                        </button>
                      )})
                  ) : (
                    <div className="relative">
                      <label className="block text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">Jouw Antwoord</label>
                      <textarea
                        value={openAnswerInput}
                        onChange={(e) => setOpenAnswerInput(e.target.value)}
                        className="w-full p-5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 text-lg leading-relaxed bg-white text-slate-900 min-h-[250px] resize-none transition-all placeholder-slate-300"
                        placeholder="Typ hier je uitwerking..."
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                   <div className="text-xs text-slate-400 max-w-[200px] truncate">
                      {currentQuestion.source && `Bron: ${currentQuestion.source}`}
                   </div>
                   <Button 
                    onClick={handleNext} 
                    disabled={currentQuestion.type === 'MULTIPLE_CHOICE' && session.answers[currentQuestion.id] === undefined}
                    size="xl"
                    className="pl-8 pr-6 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transform hover:-translate-y-0.5"
                  >
                    {isLastQuestion ? 'Afronden' : 'Volgende'}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
            </div>
         </div>
         
         {/* Balance spacer for layout if no context */}
         {!hasContext && <div className="hidden lg:block lg:w-1/4 bg-[#f8fafc]" />}
      </div>
    </div>
  );
};