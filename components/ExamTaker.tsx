import React, { useState, useEffect, useRef } from 'react';
import { Question, ExamSession, ExamResult } from '../types';
import { saveResult } from '../services/storageService';
import { updateProgressAfterExam } from '../services/progressService';
import { getExplanation, generateExamSummary, gradeOpenQuestion } from '../services/geminiService';
import { Button } from './Button';
import { CheckCircle, Home, ChevronRight, X, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ExamSubmitting, QuestionReviewCard, ExamSummaryCard, ExamScoreCards, OpenQuestionGrade } from './exam';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();
  const [session, setSession] = useState(initialSession);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [openAnswerInput, setOpenAnswerInput] = useState('');

  // Review state
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);
  const [examSummary, setExamSummary] = useState<ExamSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Open question grading state
  const [openQuestionGrades, setOpenQuestionGrades] = useState<Record<string, OpenQuestionGrade>>({});
  const [gradingQuestions, setGradingQuestions] = useState<Set<string>>(new Set());

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

  // Grade all open questions automatically
  const gradeAllOpenQuestions = async (questions: Question[], answers: Record<string, number | string>) => {
    const openQuestions = questions.filter(q => q.type === 'OPEN');

    for (const question of openQuestions) {
      const answer = answers[question.id];
      if (typeof answer !== 'string' || !answer.trim()) continue;

      setGradingQuestions(prev => new Set(prev).add(question.id));

      try {
        const result = await gradeOpenQuestion(question, answer);
        setOpenQuestionGrades(prev => ({ ...prev, [question.id]: result.grade }));
        // Store feedback as AI explanation
        setAiExplanations(prev => ({ ...prev, [question.id]: result.feedback }));
      } catch (error) {
        console.error('Error grading question:', question.id, error);
      } finally {
        setGradingQuestions(prev => {
          const newSet = new Set(prev);
          newSet.delete(question.id);
          return newSet;
        });
      }
    }
  };

  const finishExam = async () => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;
    setIsSubmitting(true);
    setSubmissionError(null);

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

    // CRITICAL: Validate user is authenticated before attempting save
    if (!user?.id) {
      const errorMsg = 'Je bent niet ingelogd. Log opnieuw in om je resultaat op te slaan.';
      console.error('Cannot save exam result: user.id is undefined');
      setSubmissionError(errorMsg);
      setIsSubmitting(false);
      isFinishingRef.current = false;
      return;
    }

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
      level: session.questions[0]?.level,
      user_id: user.id // Link result to authenticated user for RLS
    };

    try {
      await saveResult(result);
      await updateProgressAfterExam(result);

      // SUCCESS: Move state updates inside try block
      setSession(prev => ({ ...prev, answers: finalAnswers }));
      setIsFinished(true);

      // Start grading open questions automatically
      gradeAllOpenQuestions(session.questions, finalAnswers);

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
      // Enhanced error handling with user feedback
      console.error('Fout bij opslaan resultaat:', error);

      let errorMessage = 'Er is een fout opgetreden bij het opslaan van je resultaat.';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setSubmissionError(errorMessage);

      // Reset flags to allow retry
      setIsSubmitting(false);
      isFinishingRef.current = false;
    }
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

  // --- ERROR SCREEN ---
  if (submissionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-red-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Fout bij opslaan</h2>
            <p className="text-gray-600">{submissionError}</p>
          </div>

          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={() => {
                setSubmissionError(null);
                finishExam();
              }}
              className="w-full"
            >
              Opnieuw proberen
            </Button>
            <Button
              variant="secondary"
              onClick={onFinish}
              className="w-full"
            >
              Terug naar dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- SUBMITTING LOADING SCREEN ---
  if (isSubmitting && !isFinished) {
    return <ExamSubmitting questionCount={session.questions.length} />;
  }

  // --- REVIEW MODE ---
  if (isFinished) {
    const mcScore = session.questions.filter(q => q.type === 'MULTIPLE_CHOICE' && session.answers[q.id] === q.correctIndex).length;
    const totalMc = session.questions.filter(q => q.type === 'MULTIPLE_CHOICE').length;
    const openQuestions = session.questions.filter(q => q.type === 'OPEN');
    const openCount = openQuestions.length;

    // Calculate open question scores
    const openScore = {
      correct: Object.values(openQuestionGrades).filter(g => g === 'correct').length,
      partial: Object.values(openQuestionGrades).filter(g => g === 'partial').length,
      incorrect: Object.values(openQuestionGrades).filter(g => g === 'incorrect').length,
    };

    // Calculate percentage and generate appropriate feedback
    const totalGraded = mcScore + openScore.correct + (openScore.partial * 0.5);
    const totalMax = totalMc + openCount;
    const percentage = totalMax > 0 ? Math.round((totalGraded / totalMax) * 100) : 0;

    const getFeedback = (score: number): { title: string; subtitle: string } => {
      if (score >= 90) return { title: "Uitstekend!", subtitle: "Je beheerst de stof." };
      if (score >= 75) return { title: "Goed gedaan!", subtitle: "De meeste vragen zijn correct." };
      if (score >= 55) return { title: "Voldoende", subtitle: "Er is nog ruimte voor verbetering." };
      if (score >= 40) return { title: "Bijna voldoende", subtitle: "Nog wat extra oefening nodig." };
      return { title: "Meer oefening nodig", subtitle: "Bestudeer de stof opnieuw." };
    };

    const feedback = getFeedback(percentage);

    return (
      <div className="min-h-screen bg-slate-50 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Compact Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Toets voltooid</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{feedback.title}</h2>
                <p className="text-slate-600 text-sm">{feedback.subtitle}</p>
              </div>
              <Button onClick={onFinish} variant="secondary" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </div>

            <ExamScoreCards
              mcScore={mcScore}
              totalMc={totalMc}
              openCount={openCount}
              openScore={openCount > 0 ? openScore : undefined}
              totalQuestions={session.questions.length}
            />
          </div>

          {/* AI Summary Section */}
          {(loadingSummary || examSummary) && (
            <ExamSummaryCard summary={examSummary!} isLoading={loadingSummary} />
          )}

          {/* Question Review - Compact List */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-4">Vraag overzicht</h3>
            <div className="space-y-2">
              {session.questions.map((q, idx) => (
                <QuestionReviewCard
                  key={q.id}
                  question={q}
                  questionIndex={idx}
                  answer={session.answers[q.id]}
                  aiExplanation={aiExplanations[q.id]}
                  isLoadingExplanation={loadingExplanation === q.id}
                  onRequestExplanation={() => handleRequestAIExplanation(q)}
                  openQuestionGrade={openQuestionGrades[q.id]}
                  isGradingOpen={gradingQuestions.has(q.id)}
                />
              ))}
            </div>
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
                <img
                  src={currentQuestion.imageUrl}
                  alt="Vraag afbeelding"
                  className="max-h-[40vh] w-auto object-contain"
                  loading="lazy"
                  decoding="async"
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
