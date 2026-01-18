import React, { useState, useEffect, useRef } from 'react';
import { Question, ExamSession, ExamResult } from '../types';
import { saveResult } from '../services/storageService';
import { updateProgressAfterExam } from '../services/progressService';
import { getExplanation, generateExamSummary } from '../services/geminiService';
import { Button } from './Button';
import { CheckCircle, Home, FileText, ChevronRight, X, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ExamSubmitting, QuestionReviewCard, ExamSummaryCard, ExamScoreCards } from './exam';

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
      return initialSession.timeLimit * 60;
    }
    return null;
  });

  const isFinishingRef = useRef(false);

  const currentQuestion = session.questions[activeQuestionIdx];
  const isLastQuestion = activeQuestionIdx === session.questions.length - 1;
  const progress = ((activeQuestionIdx + 1) / session.questions.length) * 100;

  useEffect(() => {
    if (currentQuestion.type === 'OPEN') {
      const existingAns = session.answers[currentQuestion.id];
      setOpenAnswerInput(typeof existingAns === 'string' ? existingAns : '');
    }
  }, [activeQuestionIdx, currentQuestion]);

  // Timer countdown effect
  useEffect(() => {
    if (remainingSeconds === null || isFinished || isSubmitting) return;

    if (remainingSeconds <= 0) {
      finishExam();
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, isFinished, isSubmitting]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isTimeLow = remainingSeconds !== null && remainingSeconds < 120;

  const handleSelectAnswer = (val: number | string) => {
    setSession(prev => ({
      ...prev,
      answers: { ...prev.answers, [currentQuestion.id]: val }
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
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    setIsSubmitting(true);

    let finalAnswers = { ...session.answers };
    if (currentQuestion.type === 'OPEN') {
      finalAnswers[currentQuestion.id] = openAnswerInput;
    }

    let correctCount = 0;
    session.questions.forEach(q => {
      if (q.type === 'MULTIPLE_CHOICE' && finalAnswers[q.id] === q.correctIndex) {
        correctCount++;
      }
    });

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
      level: session.questions[0]?.level
    };

    try {
      await saveResult(result);
      await updateProgressAfterExam(result);

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
    return <ExamSubmitting questionCount={session.questions.length} />;
  }

  // --- REVIEW MODE ---
  if (isFinished) {
    const mcScore = session.questions.filter(q => q.type === 'MULTIPLE_CHOICE' && session.answers[q.id] === q.correctIndex).length;
    const totalMc = session.questions.filter(q => q.type === 'MULTIPLE_CHOICE').length;
    const openCount = session.questions.filter(q => q.type === 'OPEN').length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50/40 to-pink-50/30 py-8 md:py-12 px-4 relative overflow-hidden">
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

            <ExamScoreCards
              mcScore={mcScore}
              totalMc={totalMc}
              openCount={openCount}
              totalQuestions={session.questions.length}
            />

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
          {(loadingSummary || examSummary) && (
            <ExamSummaryCard summary={examSummary!} isLoading={loadingSummary} />
          )}

          {/* Question Review Cards */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-slate-600" />
              <h3 className="text-xl font-bold text-slate-900">Vraag voor Vraag Review</h3>
            </div>

            {session.questions.map((q, idx) => (
              <QuestionReviewCard
                key={q.id}
                question={q}
                questionIndex={idx}
                totalQuestions={session.questions.length}
                answer={session.answers[q.id]}
                aiExplanation={aiExplanations[q.id]}
                isLoadingExplanation={loadingExplanation === q.id}
                onRequestExplanation={() => handleRequestAIExplanation(q)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- EXAM MODE (SPLIT SCREEN) ---
  const hasContext = !!currentQuestion.contextText;

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] overflow-hidden text-slate-900 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 h-14 flex-shrink-0 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-700">{session.subject}</span>
          <span className="text-slate-300">|</span>
          <span className="text-sm text-slate-500">Vraag {activeQuestionIdx + 1} / {session.questions.length}</span>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2 w-1/3 max-w-xs hidden md:block">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {remainingSeconds !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold transition-all ${
              isTimeLow ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-amber-100 text-amber-800'
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
        {/* LEFT COLUMN: Context */}
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

        {/* RIGHT COLUMN: Question */}
        <div className={`flex-1 bg-white overflow-y-auto flex flex-col ${hasContext ? 'lg:w-1/2' : 'lg:w-2/4 lg:max-w-3xl lg:border-r lg:border-slate-100'}`}>
          <div className="flex-1 p-6 lg:p-10 max-w-3xl mx-auto w-full flex flex-col">
            {currentQuestion.imageUrl && (
              <div className="mb-6 rounded-xl border border-slate-100 overflow-hidden bg-slate-50 flex justify-center">
                <img src={currentQuestion.imageUrl} alt="Vraag" className="max-h-[40vh] w-auto object-contain" />
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
                  );
                })
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

        {!hasContext && <div className="hidden lg:block lg:w-1/4 bg-[#f8fafc]" />}
      </div>
    </div>
  );
};
