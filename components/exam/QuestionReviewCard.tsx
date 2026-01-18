import React from 'react';
import { Question } from '../../types';
import { Button } from '../Button';
import { CheckCircle, XCircle, BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface QuestionReviewCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  answer: string | number | undefined;
  aiExplanation?: string;
  isLoadingExplanation: boolean;
  onRequestExplanation: () => void;
}

export const QuestionReviewCard: React.FC<QuestionReviewCardProps> = ({
  question,
  questionIndex,
  totalQuestions,
  answer,
  aiExplanation,
  isLoadingExplanation,
  onRequestExplanation
}) => {
  const isMC = question.type === 'MULTIPLE_CHOICE';
  const isCorrectMC = isMC && answer === question.correctIndex;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border-2 overflow-hidden transition-all hover:shadow-2xl">
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
                Vraag {questionIndex + 1} van {totalQuestions}
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
            <h4 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">{question.text}</h4>
          </div>
        </div>

        {/* Answer Display */}
        <div className="mb-6">
          {isMC ? (
            <div className="space-y-2">
              {question.options?.map((opt, optIdx) => {
                const isSelected = optIdx === (answer as number);
                const isRealCorrect = optIdx === question.correctIndex;

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
                <p className="text-slate-800 leading-relaxed">{question.modelAnswer}</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Explanation Section */}
        {!aiExplanation ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onRequestExplanation}
            disabled={isLoadingExplanation}
            className="w-full md:w-auto bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 hover:border-indigo-300 hover:shadow-lg"
          >
            {isLoadingExplanation ? (
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
              <ReactMarkdown>{aiExplanation}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
