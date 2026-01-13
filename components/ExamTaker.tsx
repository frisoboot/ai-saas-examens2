import React, { useState } from 'react';
import { Question, ExamSession, ExamResult } from '../types';
import { saveResult } from '../services/storageService';
import { updateProgressAfterExam } from '../services/progressService';
import { getExplanation, generateExamSummary } from '../services/geminiService';
import { Button } from './Button';
import { CheckCircle, XCircle, ArrowRight, Home, BrainCircuit, FileText, ChevronRight, X, Lightbulb, Target, TrendingUp } from 'lucide-react';
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
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [openAnswerInput, setOpenAnswerInput] = useState('');

  // Review state
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);
  const [examSummary, setExamSummary] = useState<ExamSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const currentQuestion = session.questions[activeQuestionIdx];
  const isLastQuestion = activeQuestionIdx === session.questions.length - 1;
  const progress = ((activeQuestionIdx + 1) / session.questions.length) * 100;

  React.useEffect(() => {
    if (currentQuestion.type === 'OPEN') {
      const existingAns = session.answers[currentQuestion.id];
      setOpenAnswerInput(typeof existingAns === 'string' ? existingAns : '');
    }
  }, [activeQuestionIdx, currentQuestion]);

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

      // Generate AI summary automatically
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

  // --- REVIEW MODE ---
  if (isFinished) {
    const mcScore = session.questions.filter(q => q.type === 'MULTIPLE_CHOICE' && session.answers[q.id] === q.correctIndex).length;
    const totalMc = session.questions.filter(q => q.type === 'MULTIPLE_CHOICE').length;
    const openCount = session.questions.filter(q => q.type === 'OPEN').length;

    return (
      <div className="min-h-screen bg-[#f8fafc] py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 p-8 mb-8 text-center ring-1 ring-slate-100">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Toets Afgerond!</h2>
            <p className="text-slate-500 mb-8">Bekijk hieronder je resultaten en vraag de AI om uitleg.</p>
            
            <div className="flex justify-center gap-12 mb-8">
               {totalMc > 0 && (
                 <div className="text-center">
                    <div className="text-5xl font-bold text-indigo-600 mb-1">{mcScore}<span className="text-2xl text-slate-300">/</span>{totalMc}</div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Meerkeuze</div>
                 </div>
               )}
               {openCount > 0 && (
                 <div className="text-center">
                    <div className="text-5xl font-bold text-orange-500 mb-1">{openCount}</div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Open Vragen</div>
                 </div>
               )}
            </div>
            
            <Button onClick={onFinish} variant="secondary">
                <Home className="w-4 h-4 mr-2"/>
                Terug naar Dashboard
            </Button>
          </div>

          {/* AI Summary Section */}
          {loadingSummary ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-indigo-100">
              <div className="flex items-center justify-center gap-3 text-indigo-600">
                <BrainCircuit className="w-6 h-6 animate-pulse" />
                <p className="text-lg">AI analyseert je resultaten...</p>
              </div>
            </div>
          ) : examSummary && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-sm p-8 mb-8 border border-indigo-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-600 rounded-xl">
                  <BrainCircuit className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">AI Feedback</h3>
                  <p className="text-sm text-slate-600">Persoonlijke analyse van je prestatie</p>
                </div>
              </div>

              {/* Overall feedback */}
              <div className="bg-white rounded-xl p-5 mb-4 border border-indigo-100">
                <p className="text-slate-700 leading-relaxed">{examSummary.overall}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {/* Strengths */}
                {examSummary.strengths.length > 0 && (
                  <div className="bg-white rounded-xl p-5 border border-green-100">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold text-slate-900">Sterke Punten</h4>
                    </div>
                    <ul className="space-y-2">
                      {examSummary.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {examSummary.improvements.length > 0 && (
                  <div className="bg-white rounded-xl p-5 border border-orange-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-orange-600" />
                      <h4 className="font-semibold text-slate-900">Verbeterpunten</h4>
                    </div>
                    <ul className="space-y-2">
                      {examSummary.improvements.map((improvement, idx) => (
                        <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Study Tips */}
              {examSummary.studyTips.length > 0 && (
                <div className="bg-white rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-slate-900">Studietips</h4>
                  </div>
                  <ul className="space-y-2">
                    {examSummary.studyTips.map((tip, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">{idx + 1}.</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="space-y-6">
            {session.questions.map((q, idx) => {
              const answer = session.answers[q.id];
              const isMC = q.type === 'MULTIPLE_CHOICE';
              const isCorrectMC = isMC && answer === q.correctIndex;

              return (
                <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className={`h-1.5 w-full ${isMC ? (isCorrectMC ? 'bg-green-500' : 'bg-red-500') : 'bg-orange-500'}`} />
                  <div className="p-6 md:p-8">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {isMC ? (
                          isCorrectMC ? <CheckCircle className="w-6 h-6 text-green-500" /> : <XCircle className="w-6 h-6 text-red-500" />
                        ) : (
                          <BrainCircuit className="w-6 h-6 text-orange-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-xs font-bold text-slate-400 uppercase">Vraag {idx + 1}</span>
                        </div>
                        <h4 className="text-lg font-semibold text-slate-900 mb-4">{q.text}</h4>

                        {/* Answer Display */}
                        <div className="mb-6 bg-slate-50 rounded-xl p-4 border border-slate-100">
                          {isMC ? (
                            <div className="grid gap-2">
                               {q.options?.map((opt, optIdx) => {
                                 const isSelected = optIdx === (answer as number);
                                 const isRealCorrect = optIdx === q.correctIndex;
                                 let style = "p-3 rounded-lg text-sm flex items-center justify-between ";
                                 
                                 if (isRealCorrect) style += "bg-green-100 text-green-900 font-medium ring-1 ring-green-200";
                                 else if (isSelected && !isRealCorrect) style += "bg-red-100 text-red-900 ring-1 ring-red-200";
                                 else style += "text-slate-500 opacity-60";

                                 return (
                                   <div key={optIdx} className={style}>
                                     <div className="flex items-center">
                                       <span className="w-5 mr-2 font-mono opacity-50">{String.fromCharCode(65 + optIdx)}.</span>
                                       {opt}
                                     </div>
                                     {isRealCorrect && <CheckCircle className="w-4 h-4 text-green-600" />}
                                     {isSelected && !isRealCorrect && <XCircle className="w-4 h-4 text-red-600" />}
                                   </div>
                                 );
                               })}
                            </div>
                          ) : (
                            <div>
                               <div className="text-xs text-slate-500 uppercase font-bold mb-1">Jouw antwoord:</div>
                               <p className="text-slate-800 mb-3">{answer as string}</p>
                               <div className="h-px bg-slate-200 my-2" />
                               <div className="text-xs text-slate-500 uppercase font-bold mb-1">Model antwoord:</div>
                               <p className="text-slate-600 italic">{q.modelAnswer}</p>
                            </div>
                          )}
                        </div>

                        {!aiExplanations[q.id] ? (
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRequestAIExplanation(q)}
                                disabled={loadingExplanation === q.id}
                                className="w-full sm:w-auto"
                            >
                                {loadingExplanation === q.id ? 'AI is aan het denken...' : 'Vraag AI om uitleg'}
                            </Button>
                        ) : (
                            <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100 animate-fadeIn">
                                <div className="flex items-center gap-2 mb-3 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                                    <BrainCircuit className="w-4 h-4" />
                                    AI Feedback
                                </div>
                                <div className="text-slate-700 text-sm leading-relaxed prose prose-indigo max-w-none prose-p:my-1">
                                    <ReactMarkdown>{aiExplanations[q.id]}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                      </div>
                    </div>
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

         <button 
           onClick={onFinish}
           className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
           title="Stoppen"
         >
           <X className="w-5 h-5" />
         </button>
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