import React, { useState, useEffect, useRef } from 'react';
import { Question, ExamSession, ExamResult } from '../types';
import { saveResult } from '../services/storageService';
import { updateProgressAfterExam } from '../services/progressService';
import { getExplanation, generateExamSummary, gradeOpenQuestion } from '../services/geminiService';
import { Button } from './Button';
import { CheckCircle, Home, ChevronRight, X, Clock, Download, SkipForward, ZoomIn, FileText, BookOpen, Flag, AlertTriangle, Sparkles, Paperclip, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { examMarkdownComponents } from '../utils/markdownComponents';
import { ExamSubmitting, QuestionReviewCard, ExamSummaryCard, ExamScoreCards, OpenQuestionGrade } from './exam';
import { useAuth } from '../contexts/AuthContext';
import { PdfViewer } from './PdfViewer';

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

  // Skipped questions (for questions requiring worksheets)
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set());

  // "Vind ik moeilijk" - difficult questions marked by student
  const [difficultQuestions, setDifficultQuestions] = useState<Set<string>>(new Set());

  // Coach Modus: instant feedback state
  const [showingCoachFeedback, setShowingCoachFeedback] = useState(false);
  const [coachGradingOpen, setCoachGradingOpen] = useState(false);
  const isCoachMode = initialSession.feedbackMode === 'coach';

  // Image zoom state
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // PDF split-screen state - default to first available tab
  const [leftPanelTab, setLeftPanelTab] = useState<'opdrachten' | 'bijlage' | 'context'>(() => {
    if (initialSession.pdfUrl) return 'opdrachten';
    if (initialSession.bijlageUrl) return 'bijlage';
    return 'context';
  });
  // Mobile: toggle between PDF and questions
  const [showMobilePdf, setShowMobilePdf] = useState(false);

  // Timer state for Look-alike exams
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    if (initialSession.timeLimit && initialSession.timeLimit > 0) {
      return initialSession.timeLimit * 60;
    }
    return null;
  });

  const isFinishingRef = useRef(false);

  const currentQuestion = session.questions[activeQuestionIdx];
  const totalDisplay = session.totalExpectedQuestions || session.questions.length;
  const isLastQuestion = activeQuestionIdx === session.questions.length - 1 && !session.isStreaming;
  const isWaitingForNextQuestion = activeQuestionIdx >= session.questions.length - 1 && !!session.isStreaming;
  const progress = totalDisplay > 0 ? ((activeQuestionIdx + 1) / totalDisplay) * 100 : 0;

  // Sync streaming questions from parent prop
  useEffect(() => {
    setSession(prev => {
      if (
        initialSession.questions.length === prev.questions.length &&
        initialSession.isStreaming === prev.isStreaming
      ) return prev;
      return {
        ...prev,
        questions: initialSession.questions,
        isStreaming: initialSession.isStreaming,
        totalExpectedQuestions: initialSession.totalExpectedQuestions,
      };
    });
  }, [initialSession.questions.length, initialSession.isStreaming]);

  useEffect(() => {
    if (!currentQuestion) return;
    if (currentQuestion.type === 'OPEN') {
      const existingAns = session.answers[currentQuestion.id];
      setOpenAnswerInput(typeof existingAns === 'string' ? existingAns : '');
    }
    // Reset coach feedback when navigating to a new question
    setShowingCoachFeedback(false);
  }, [activeQuestionIdx, currentQuestion]);

  // Close zoomed image on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zoomedImageUrl) {
        setZoomedImageUrl(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedImageUrl]);

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

  const toggleDifficult = () => {
    setDifficultQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion.id)) {
        newSet.delete(currentQuestion.id);
      } else {
        newSet.add(currentQuestion.id);
      }
      return newSet;
    });
  };

  const handleSelectAnswer = (val: number | string) => {
    setSession(prev => ({
      ...prev,
      answers: { ...prev.answers, [currentQuestion.id]: val }
    }));
  };

  const handleSkipQuestion = () => {
    // Add to skipped questions set
    setSkippedQuestions(prev => new Set(prev).add(currentQuestion.id));

    // Remove any existing answer for this question
    setSession(prev => {
      const newAnswers = { ...prev.answers };
      delete newAnswers[currentQuestion.id];
      return { ...prev, answers: newAnswers };
    });

    // Navigate to next question or finish
    if (isLastQuestion) {
      finishExam();
    } else {
      setActiveQuestionIdx(prev => prev + 1);
    }
  };

  // Coach Modus: grade current question and show inline feedback
  const handleCoachCheck = async () => {
    // Save open answer first
    if (currentQuestion.type === 'OPEN') {
      handleSelectAnswer(openAnswerInput);
    }

    setShowingCoachFeedback(true);

    // Grade open questions with AI
    if (currentQuestion.type === 'OPEN') {
      if (!openAnswerInput.trim()) {
        // Empty answer is immediately incorrect
        setOpenQuestionGrades(prev => ({ ...prev, [currentQuestion.id]: 'incorrect' }));
        setAiExplanations(prev => ({ ...prev, [currentQuestion.id]: 'Je hebt deze vraag niet ingevuld.' }));
      } else {
        setCoachGradingOpen(true);
        try {
          const result = await gradeOpenQuestion(currentQuestion, openAnswerInput);
          setOpenQuestionGrades(prev => ({ ...prev, [currentQuestion.id]: result.grade }));
          setAiExplanations(prev => ({ ...prev, [currentQuestion.id]: result.feedback }));
        } catch (error) {
          console.error('Error grading question:', currentQuestion.id, error);
          setOpenQuestionGrades(prev => ({ ...prev, [currentQuestion.id]: null }));
        } finally {
          setCoachGradingOpen(false);
        }
      }
    }
  };

  // Coach Modus: move to next question after viewing feedback
  const handleCoachNext = () => {
    setShowingCoachFeedback(false);
    if (isLastQuestion) {
      finishExam();
    } else {
      setActiveQuestionIdx(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion.type === 'OPEN') {
      handleSelectAnswer(openAnswerInput);
    }

    // In Coach Modus: show feedback first (unless skipping)
    if (isCoachMode && !showingCoachFeedback) {
      handleCoachCheck();
      return;
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

      // Empty/blank answers are marked as incorrect immediately
      if (typeof answer !== 'string' || !answer.trim()) {
        setOpenQuestionGrades(prev => ({ ...prev, [question.id]: 'incorrect' }));
        setAiExplanations(prev => ({ ...prev, [question.id]: 'Je hebt deze vraag niet ingevuld.' }));
        continue;
      }

      setGradingQuestions(prev => new Set(prev).add(question.id));

      try {
        const result = await gradeOpenQuestion(question, answer);
        setOpenQuestionGrades(prev => ({ ...prev, [question.id]: result.grade }));
        // Store feedback as AI explanation
        setAiExplanations(prev => ({ ...prev, [question.id]: result.feedback }));
      } catch (error) {
        console.error('Error grading question:', question.id, error);
        // Mark failed questions with null grade to indicate grading failure
        setOpenQuestionGrades(prev => ({ ...prev, [question.id]: null }));
        // Provide user-visible feedback about grading failure
        const errorMsg = `Kon vraag niet nakijken: "${question.text.substring(0, 50)}...". De vraag wordt niet meegerekend in je eindcijfer.`;
        setAiExplanations(prev => ({ ...prev, [question.id]: errorMsg }));
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

    // Ensure ALL questions are in finalAnswers (unanswered MC = -1, unanswered OPEN = '')
    // This way unanswered questions are counted as incorrect in topic analysis
    session.questions.forEach(q => {
      if (!(q.id in finalAnswers)) {
        finalAnswers[q.id] = q.type === 'MULTIPLE_CHOICE' ? -1 : '';
      }
    });

    let correctCount = 0;
    const totalQuestionCount = session.questions.length; // Count ALL questions, not just answered
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
      totalQuestions: totalQuestionCount,
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

      // In coach mode, open questions were already graded one by one during the exam
      // Only bulk-grade remaining ungraded open questions
      if (!isCoachMode) {
        await gradeAllOpenQuestions(session.questions, finalAnswers);
      } else {
        // Grade any open questions that weren't graded yet (e.g., if timer ran out)
        const ungradedOpen = session.questions.filter(
          q => q.type === 'OPEN' && finalAnswers[q.id] && !(q.id in openQuestionGrades)
        );
        if (ungradedOpen.length > 0) {
          await gradeAllOpenQuestions(ungradedOpen, finalAnswers);
        }
      }
      
      setIsFinished(true);

      if (!examSummary && !loadingSummary) {
        setLoadingSummary(true);
        try {
          const summary = await generateExamSummary(
            session.questions,
            finalAnswers,
            correctCount,
            totalQuestionCount,
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

  // --- STREAMING LOADING SCREEN ---
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6">
            <div className="w-full h-full border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Examenvragen genereren</h2>
          <p className="text-slate-600 mb-4">
            Even geduld, de AI maakt {totalDisplay} examenvragen voor je aan...
          </p>
          <div className="w-48 mx-auto bg-indigo-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(5, (session.questions.length / totalDisplay) * 100)}%` }}
            />
          </div>
          <p className="text-sm text-indigo-500 mt-2 font-medium">
            {session.questions.length} / {totalDisplay} vragen geladen
          </p>
        </div>
      </div>
    );
  }

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
    const totalMc = session.questions.filter(q => q.type === 'MULTIPLE_CHOICE' && !skippedQuestions.has(q.id)).length;
    const openQuestions = session.questions.filter(q => q.type === 'OPEN');
    const openCount = openQuestions.filter(q => !skippedQuestions.has(q.id)).length;

    // Calculate open question scores
    const openScore = {
      correct: Object.values(openQuestionGrades).filter(g => g === 'correct').length,
      partial: Object.values(openQuestionGrades).filter(g => g === 'partial').length,
      incorrect: Object.values(openQuestionGrades).filter(g => g === 'incorrect').length,
      ungraded: Object.values(openQuestionGrades).filter(g => g === null).length,
    };

    // Calculate percentage and generate appropriate feedback
    // Only count successfully graded open questions in the denominator
    const gradedOpenCount = openScore.correct + openScore.partial + openScore.incorrect;
    const totalGraded = mcScore + openScore.correct + (openScore.partial * 0.5);
    const totalMax = totalMc + gradedOpenCount;
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
              totalQuestions={totalMc + openCount}
            />
          </div>

          {/* AI Summary Section */}
          {(loadingSummary || examSummary) && (
            <ExamSummaryCard summary={examSummary!} isLoading={loadingSummary} />
          )}

          {/* Skipped Questions Warning */}
          {skippedQuestions.size > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <SkipForward className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">
                  {skippedQuestions.size} vraag{skippedQuestions.size > 1 ? 'en' : ''} overgeslagen
                </p>
                <p className="text-sm text-amber-700">
                  Deze vragen vereisten een uitwerkbijlage en zijn niet meegerekend in je score.
                </p>
              </div>
            </div>
          )}

          {/* Difficult Questions Section */}
          {difficultQuestions.size > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Flag className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-orange-900">
                    Moeilijke vragen ({difficultQuestions.size})
                  </h3>
                  <p className="text-sm text-orange-700">
                    Vragen die je als moeilijk hebt gemarkeerd — vraag AI uitleg om ze beter te begrijpen
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {session.questions
                  .filter(q => difficultQuestions.has(q.id))
                  .map((q, _) => {
                    const originalIdx = session.questions.findIndex(sq => sq.id === q.id);
                    return (
                      <QuestionReviewCard
                        key={`diff-${q.id}`}
                        question={q}
                        questionIndex={originalIdx}
                        answer={session.answers[q.id]}
                        aiExplanation={aiExplanations[q.id]}
                        isLoadingExplanation={loadingExplanation === q.id}
                        onRequestExplanation={() => handleRequestAIExplanation(q)}
                        openQuestionGrade={openQuestionGrades[q.id]}
                        isGradingOpen={gradingQuestions.has(q.id)}
                        isSkipped={skippedQuestions.has(q.id)}
                      />
                    );
                  })}
              </div>
            </div>
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
                  isSkipped={skippedQuestions.has(q.id)}
                  isDifficult={difficultQuestions.has(q.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- EXAM MODE (SPLIT SCREEN) ---
  // Determine if this is a new section (different from previous question)
  const previousQuestion = activeQuestionIdx > 0 ? session.questions[activeQuestionIdx - 1] : null;
  const isNewSection = currentQuestion.section &&
    (!previousQuestion || previousQuestion.section !== currentQuestion.section);

  // Show section intro only on first question of section (where sectionIntro is defined)
  const showSectionIntro = isNewSection && currentQuestion.sectionIntro;

  // Has context includes section intro OR question-specific context
  const hasContext = !!currentQuestion.contextText || showSectionIntro;

  // PDF support: check if exam has a PDF tekstboekje and/or bijlage
  const examPdfUrl = session.pdfUrl;
  const examBijlageUrl = session.bijlageUrl;
  const hasPdf = !!examPdfUrl;
  const hasBijlage = !!examBijlageUrl;
  const hasLeftPanel = hasContext || hasPdf || hasBijlage;

  // Determine which content to show in left panel
  const showPdfPanel = hasPdf && leftPanelTab === 'opdrachten';
  const showBijlagePanel = hasBijlage && leftPanelTab === 'bijlage';
  const showContextPanel = hasContext && leftPanelTab === 'context';

  // Count available tabs for the left panel
  const availableTabs = [hasPdf && 'opdrachten', hasBijlage && 'bijlage', hasContext && 'context'].filter(Boolean);
  const hasMultipleTabs = availableTabs.length > 1;

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] overflow-hidden text-slate-900 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 h-14 flex-shrink-0 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <span className="font-bold text-slate-700">{session.subject}</span>
          <span className="text-slate-300">|</span>
          <span className="text-sm text-slate-500">Vraag {activeQuestionIdx + 1} / {totalDisplay}</span>
          {session.isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-indigo-500 font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="hidden sm:inline">{session.questions.length}/{totalDisplay} geladen</span>
            </span>
          )}
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
          {/* Coach Modus indicator */}
          {isCoachMode && (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Coach Modus
            </span>
          )}

          {/* Difficult questions counter */}
          {difficultQuestions.size > 0 && (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold">
              <Flag className="w-3 h-3" />
              {difficultQuestions.size}
            </span>
          )}

          {/* Mobile PDF toggle button */}
          {(hasPdf || hasBijlage) && (
            <button
              onClick={() => setShowMobilePdf(!showMobilePdf)}
              className={`lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                showMobilePdf
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              {showMobilePdf ? 'Vragen' : 'PDF'}
            </button>
          )}

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
        {/* LEFT COLUMN: PDF / Bijlage / Context / Tabs */}
        {hasLeftPanel ? (
          <div className={`lg:w-1/2 flex flex-col overflow-hidden border-r border-slate-200 ${showMobilePdf ? '' : 'hidden lg:flex'}`}>
            {/* Tab bar: show when multiple panel options are available */}
            {hasMultipleTabs && (
              <div className="flex-shrink-0 flex border-b border-slate-200 bg-white">
                {hasPdf && (
                  <button
                    onClick={() => setLeftPanelTab('opdrachten')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition ${
                      leftPanelTab === 'opdrachten'
                        ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Opdrachten
                  </button>
                )}
                {hasBijlage && (
                  <button
                    onClick={() => setLeftPanelTab('bijlage')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition ${
                      leftPanelTab === 'bijlage'
                        ? 'text-amber-700 border-b-2 border-amber-600 bg-amber-50/50'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Paperclip className="w-4 h-4" />
                    Bijlage
                  </button>
                )}
                {hasContext && (
                  <button
                    onClick={() => setLeftPanelTab('context')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition ${
                      leftPanelTab === 'context'
                        ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Context
                  </button>
                )}
              </div>
            )}

            {/* Opdrachten PDF Viewer */}
            {showPdfPanel && examPdfUrl && (
              <PdfViewer
                url={examPdfUrl}
                page={currentQuestion.pdfPage}
                label="Opdrachten"
                className="flex-1"
              />
            )}

            {/* Bijlage PDF Viewer */}
            {showBijlagePanel && examBijlageUrl && (
              <PdfViewer
                url={examBijlageUrl}
                page={currentQuestion.bijlagePdfPage}
                label="Bijlage"
                className="flex-1"
              />
            )}

            {/* Context Text */}
            {showContextPanel && (
              <div className="flex-1 bg-[#fdfbf7] overflow-y-auto custom-scrollbar">
                <div className="max-w-2xl mx-auto p-8 lg:p-12">
                  {/* Section Header */}
                  {isNewSection && (
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-slate-800 border-b-2 border-[#d4c4a8] pb-3">
                        {currentQuestion.section}
                      </h2>
                    </div>
                  )}

                  {/* Section Introduction (only on first question of section) */}
                  {showSectionIntro && (
                    <div className="prose prose-slate max-w-none font-serif text-lg leading-loose text-slate-800 mb-8">
                      <ReactMarkdown components={examMarkdownComponents}>{currentQuestion.sectionIntro}</ReactMarkdown>
                    </div>
                  )}

                  {/* Question-specific Context */}
                  {currentQuestion.contextText && (
                    <>
                      <div className="flex items-center gap-2 text-[#8c857b] font-serif italic mb-6 border-b border-[#eaddcf] pb-2">
                        <span>Bronmateriaal</span>
                      </div>
                      <div className="prose prose-slate max-w-none font-serif text-lg leading-loose text-slate-800">
                        <ReactMarkdown components={examMarkdownComponents}>{currentQuestion.contextText}</ReactMarkdown>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="hidden lg:block lg:w-1/4 bg-[#f8fafc] border-r border-slate-100" />
        )}

        {/* RIGHT COLUMN: Question */}
        <div className={`flex-1 bg-white overflow-y-auto flex flex-col ${showMobilePdf ? 'hidden lg:flex' : ''} ${hasLeftPanel ? 'lg:w-1/2' : 'lg:w-2/4 lg:max-w-3xl lg:border-r lg:border-slate-100'}`}>
          <div className="flex-1 p-6 lg:p-10 max-w-3xl mx-auto w-full flex flex-col">
            {currentQuestion.imageUrl && (
              <div
                className="mb-6 rounded-xl border border-slate-100 overflow-hidden bg-slate-50 flex justify-center cursor-pointer group relative"
                onClick={() => setZoomedImageUrl(currentQuestion.imageUrl!)}
                title="Klik om te vergroten"
              >
                <img
                  src={currentQuestion.imageUrl}
                  alt="Vraag afbeelding"
                  className="max-h-[40vh] w-auto object-contain transition-transform group-hover:scale-[1.02]"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-lg">
                    <ZoomIn className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
              </div>
            )}

            {/* Worksheet/Attachment Banner */}
            {currentQuestion.worksheetUrl && (() => {
              const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(currentQuestion.worksheetUrl || '');
              return (
                <div className={`mb-6 rounded-xl border-2 p-4 ${
                  currentQuestion.requiresWorksheet
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <Download className={`w-5 h-5 ${currentQuestion.requiresWorksheet ? 'text-amber-600' : 'text-blue-600'}`} />
                      <div>
                        <p className={`font-semibold ${currentQuestion.requiresWorksheet ? 'text-amber-900' : 'text-blue-900'}`}>
                          {currentQuestion.worksheetLabel || 'Uitwerkbijlage'}
                        </p>
                        {currentQuestion.requiresWorksheet && (
                          <p className="text-sm text-amber-700">
                            Deze vraag vereist de bijlage om te beantwoorden
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={currentQuestion.worksheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        {isImage ? 'Openen' : 'Download PDF'}
                      </a>

                      {currentQuestion.requiresWorksheet && (
                        <button
                          onClick={handleSkipQuestion}
                          className="px-4 py-2 border border-amber-300 bg-white rounded-lg hover:bg-amber-100 transition text-amber-700 flex items-center gap-2 text-sm font-medium"
                        >
                          <SkipForward className="w-4 h-4" />
                          Overslaan
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Show image preview if it's an image */}
                  {isImage && (
                    <div
                      className="mt-3 rounded-lg overflow-hidden border border-amber-200 bg-white cursor-pointer group relative"
                      onClick={() => setZoomedImageUrl(currentQuestion.worksheetUrl!)}
                      title="Klik om te vergroten"
                    >
                      <img
                        src={currentQuestion.worksheetUrl}
                        alt={currentQuestion.worksheetLabel || 'Uitwerkbijlage'}
                        className="w-full max-h-[50vh] object-contain transition-transform group-hover:scale-[1.01]"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-lg">
                          <ZoomIn className="w-5 h-5 text-slate-600" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Question number */}
            <div className="mb-4">
              <span className="text-sm font-bold text-indigo-600">Vraag {activeQuestionIdx + 1}</span>
            </div>

            <div className="prose prose-slate max-w-none text-lg leading-relaxed text-slate-900 mb-8">
              <ReactMarkdown components={examMarkdownComponents}>{currentQuestion.text}</ReactMarkdown>
            </div>

            <div className="space-y-4 mb-8 flex-1">
              {currentQuestion.type === 'MULTIPLE_CHOICE' ? (
                currentQuestion.options?.map((opt, idx) => {
                  const isSelected = session.answers[currentQuestion.id] === idx;
                  const isDisabledByFeedback = showingCoachFeedback;
                  // Coach feedback: highlight correct/incorrect answers
                  const showCoachColors = showingCoachFeedback && isCoachMode;
                  const isCorrectOption = idx === currentQuestion.correctIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => !isDisabledByFeedback && handleSelectAnswer(idx)}
                      disabled={isDisabledByFeedback}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 flex items-center group relative ${
                        showCoachColors
                          ? isCorrectOption
                            ? 'border-green-500 bg-green-50/50 shadow-sm z-10'
                            : isSelected
                              ? 'border-red-400 bg-red-50/50'
                              : 'border-slate-100 bg-white opacity-60'
                          : isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm z-10'
                            : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50 bg-white'
                      } ${isDisabledByFeedback ? 'cursor-default' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-5 font-bold text-sm transition-colors flex-shrink-0 ${
                        showCoachColors
                          ? isCorrectOption
                            ? 'border-green-600 bg-green-600 text-white'
                            : isSelected
                              ? 'border-red-500 bg-red-500 text-white'
                              : 'border-slate-300 text-slate-400'
                          : isSelected
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 text-slate-400 group-hover:border-indigo-400 group-hover:text-indigo-500'
                      }`}>
                        {showCoachColors && isCorrectOption ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : showCoachColors && isSelected && !isCorrectOption ? (
                          <X className="w-4 h-4" />
                        ) : (
                          String.fromCharCode(65 + idx)
                        )}
                      </div>
                      <span className={`text-lg ${
                        showCoachColors
                          ? isCorrectOption
                            ? 'font-semibold text-green-900'
                            : isSelected
                              ? 'font-semibold text-red-800'
                              : 'text-slate-500'
                          : isSelected
                            ? 'font-semibold text-indigo-900'
                            : 'text-slate-700'
                      }`}>{opt}</span>
                    </button>
                  );
                })
              ) : (
                <div className="relative">
                  <label className="block text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">Jouw Antwoord</label>
                  <textarea
                    value={openAnswerInput}
                    onChange={(e) => setOpenAnswerInput(e.target.value)}
                    disabled={showingCoachFeedback}
                    className={`w-full p-5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 text-lg leading-relaxed bg-white text-slate-900 min-h-[250px] resize-none transition-all placeholder-slate-300 ${
                      showingCoachFeedback ? 'opacity-75 cursor-default' : ''
                    }`}
                    placeholder="Typ hier je uitwerking..."
                    autoFocus={!showingCoachFeedback}
                  />
                </div>
              )}
            </div>

            {/* Coach Modus: Inline Feedback Panel */}
            {showingCoachFeedback && (
              <div className="mb-6 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-5 space-y-4 animate-in fade-in">
                {currentQuestion.type === 'MULTIPLE_CHOICE' ? (
                  // MC feedback
                  (() => {
                    const isCorrectMC = session.answers[currentQuestion.id] === currentQuestion.correctIndex;
                    const selectedIdx = session.answers[currentQuestion.id] as number;
                    const selectedText = currentQuestion.options?.[selectedIdx];
                    const correctText = currentQuestion.options?.[currentQuestion.correctIndex!];
                    return (
                      <div className="space-y-3">
                        <div className={`flex items-center gap-3 text-lg font-bold ${isCorrectMC ? 'text-green-700' : 'text-red-700'}`}>
                          {isCorrectMC ? (
                            <><CheckCircle className="w-6 h-6" /> Goed!</>
                          ) : (
                            <><X className="w-6 h-6" /> Helaas, fout</>
                          )}
                        </div>
                        {!isCorrectMC && (
                          <div className="text-sm space-y-2">
                            <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                              <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="text-red-700 font-medium">Jouw antwoord: </span>
                                <span className="text-red-600">{selectedText}</span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="text-green-700 font-medium">Correct antwoord: </span>
                                <span className="text-green-600">{correctText}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  // Open question feedback
                  <div className="space-y-3">
                    {coachGradingOpen ? (
                      <div className="flex items-center gap-3 text-indigo-700">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span className="font-medium">AI nakijken...</span>
                      </div>
                    ) : (
                      <>
                        {openQuestionGrades[currentQuestion.id] === 'correct' && (
                          <div className="flex items-center gap-3 text-lg font-bold text-green-700">
                            <CheckCircle className="w-6 h-6" /> Correct!
                          </div>
                        )}
                        {openQuestionGrades[currentQuestion.id] === 'partial' && (
                          <div className="flex items-center gap-3 text-lg font-bold text-amber-700">
                            <AlertTriangle className="w-6 h-6" /> Deels correct
                          </div>
                        )}
                        {openQuestionGrades[currentQuestion.id] === 'incorrect' && (
                          <div className="flex items-center gap-3 text-lg font-bold text-red-700">
                            <X className="w-6 h-6" /> Incorrect
                          </div>
                        )}
                        {openQuestionGrades[currentQuestion.id] === null && (
                          <div className="flex items-center gap-3 text-lg font-bold text-slate-600">
                            <AlertTriangle className="w-6 h-6" /> Kon niet nakijken
                          </div>
                        )}
                        {currentQuestion.modelAnswer && (
                          <div className="p-3 bg-green-50 rounded-lg text-sm">
                            <span className="text-green-700 text-xs font-medium uppercase tracking-wide">Modelantwoord</span>
                            <p className="text-green-800 mt-1">{currentQuestion.modelAnswer}</p>
                          </div>
                        )}
                      </>
                    )}
                    {aiExplanations[currentQuestion.id] && (
                      <div className="p-3 bg-white rounded-lg border border-indigo-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-indigo-500" />
                          <span className="text-xs font-medium text-indigo-700 uppercase tracking-wide">AI Feedback</span>
                        </div>
                        <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1">
                          <ReactMarkdown>{aiExplanations[currentQuestion.id]}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-400 max-w-[200px] truncate">
                  {currentQuestion.source && `Bron: ${currentQuestion.source}`}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* "Vind ik moeilijk" button */}
                <button
                  onClick={toggleDifficult}
                  disabled={showingCoachFeedback && isCoachMode}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    difficultQuestions.has(currentQuestion.id)
                      ? 'bg-orange-100 text-orange-700 border-2 border-orange-300 shadow-sm'
                      : 'bg-slate-50 text-slate-500 border-2 border-transparent hover:bg-orange-50 hover:text-orange-600'
                  }`}
                  title={difficultQuestions.has(currentQuestion.id) ? 'Markering verwijderen' : 'Markeer als moeilijk'}
                >
                  <Flag className={`w-4 h-4 ${difficultQuestions.has(currentQuestion.id) ? 'fill-orange-500' : ''}`} />
                  <span className="hidden sm:inline">
                    {difficultQuestions.has(currentQuestion.id) ? 'Gemarkeerd' : 'Vind ik moeilijk'}
                  </span>
                </button>

                {/* Next / Check / Continue button */}
                {showingCoachFeedback ? (
                  <Button
                    onClick={handleCoachNext}
                    disabled={coachGradingOpen || isWaitingForNextQuestion}
                    size="xl"
                    className="pl-8 pr-6 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transform hover:-translate-y-0.5"
                  >
                    {isWaitingForNextQuestion ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Laden...</>
                    ) : (
                      <>{isLastQuestion ? 'Afronden' : 'Volgende vraag'}<ChevronRight className="w-5 h-5 ml-2" /></>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={(currentQuestion.type === 'MULTIPLE_CHOICE' && session.answers[currentQuestion.id] === undefined) || isWaitingForNextQuestion}
                    size="xl"
                    className="pl-8 pr-6 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transform hover:-translate-y-0.5"
                  >
                    {isWaitingForNextQuestion ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Laden...</>
                    ) : isCoachMode ? (
                      <>{isLastQuestion ? 'Check & Afronden' : 'Check'}<ChevronRight className="w-5 h-5 ml-2" /></>
                    ) : (
                      <>{isLastQuestion ? 'Afronden' : 'Volgende'}<ChevronRight className="w-5 h-5 ml-2" /></>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {!hasLeftPanel && <div className="hidden lg:block lg:w-1/4 bg-[#f8fafc]" />}
      </div>

      {/* Image Zoom Modal */}
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-zoom-out"
          onClick={() => setZoomedImageUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
            onClick={() => setZoomedImageUrl(null)}
            aria-label="Sluiten"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={zoomedImageUrl}
            alt="Vergrote afbeelding"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            Klik ergens of druk ESC om te sluiten
          </p>
        </div>
      )}
    </div>
  );
};
