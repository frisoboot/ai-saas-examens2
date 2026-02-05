import React, { useState } from 'react';
import { Question } from '../../types';
import { CheckCircle, XCircle, MinusCircle, ChevronDown, Sparkles, Flag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { compactMarkdownComponents } from '../../utils/markdownComponents';

export type OpenQuestionGrade = 'correct' | 'partial' | 'incorrect' | null;

interface QuestionReviewCardProps {
  question: Question;
  questionIndex: number;
  answer: string | number | undefined;
  aiExplanation?: string;
  isLoadingExplanation: boolean;
  onRequestExplanation: () => void;
  openQuestionGrade?: OpenQuestionGrade;
  isGradingOpen?: boolean;
  isSkipped?: boolean;
  isDifficult?: boolean;
}

export const QuestionReviewCard: React.FC<QuestionReviewCardProps> = ({
  question,
  questionIndex,
  answer,
  aiExplanation,
  isLoadingExplanation,
  onRequestExplanation,
  openQuestionGrade,
  isGradingOpen,
  isSkipped = false,
  isDifficult = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isMC = question.type === 'MULTIPLE_CHOICE';
  const isCorrectMC = isMC && answer === question.correctIndex;

  // Determine status for open questions
  const getOpenStatus = () => {
    if (isGradingOpen) return 'grading';
    if (openQuestionGrade === 'correct') return 'correct';
    if (openQuestionGrade === 'partial') return 'partial';
    if (openQuestionGrade === 'incorrect') return 'incorrect';
    return 'pending';
  };

  const openStatus = !isMC ? getOpenStatus() : null;

  // Status indicator
  const getStatusIcon = () => {
    if (isSkipped) {
      return <MinusCircle className="w-5 h-5 text-amber-500" />;
    }
    
    if (isMC) {
      return isCorrectMC
        ? <CheckCircle className="w-5 h-5 text-green-500" />
        : <XCircle className="w-5 h-5 text-red-500" />;
    }

    switch (openStatus) {
      case 'grading':
        return <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />;
      case 'correct':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <MinusCircle className="w-5 h-5 text-amber-500" />;
      case 'incorrect':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <MinusCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = () => {
    if (isSkipped) return 'Overgeslagen';
    
    if (isMC) return isCorrectMC ? 'Correct' : 'Fout';

    switch (openStatus) {
      case 'grading': return 'Nakijken...';
      case 'correct': return 'Correct';
      case 'partial': return 'Deels correct';
      case 'incorrect': return 'Incorrect';
      default: return 'Open vraag';
    }
  };

  const getStatusColor = () => {
    if (isSkipped) return 'text-amber-600';
    
    if (isMC) return isCorrectMC ? 'text-green-600' : 'text-red-600';

    switch (openStatus) {
      case 'grading': return 'text-indigo-600';
      case 'correct': return 'text-green-600';
      case 'partial': return 'text-amber-600';
      case 'incorrect': return 'text-red-600';
      default: return 'text-slate-500';
    }
  };

  const getBorderColor = () => {
    if (isSkipped) return 'border-l-amber-500';
    
    if (isMC) return isCorrectMC ? 'border-l-green-500' : 'border-l-red-500';

    switch (openStatus) {
      case 'correct': return 'border-l-green-500';
      case 'partial': return 'border-l-amber-500';
      case 'incorrect': return 'border-l-red-500';
      default: return 'border-l-slate-300';
    }
  };

  // Get the selected answer text for MC
  const getSelectedAnswerText = () => {
    if (!isMC || answer === undefined) return null;
    return question.options?.[answer as number];
  };

  // Get correct answer text for MC
  const getCorrectAnswerText = () => {
    if (!isMC || question.correctIndex === undefined) return null;
    return question.options?.[question.correctIndex];
  };

  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 ${getBorderColor()} overflow-hidden`}>
      {/* Collapsed Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
      >
        {/* Question number badge */}
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0">
          {questionIndex + 1}
        </span>

        {/* Status icon */}
        {getStatusIcon()}

        {/* Question text (truncated) */}
        <span className="flex-1 text-sm text-slate-700 truncate">
          {question.text}
        </span>

        {/* Difficult flag */}
        {isDifficult && (
          <Flag className="w-4 h-4 text-orange-500 fill-orange-500 flex-shrink-0" />
        )}

        {/* Status text */}
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>

        {/* Expand icon */}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100">
          {/* Question number + full question text */}
          <div className="flex items-start gap-3 mt-3 mb-4">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0 mt-0.5">
              {questionIndex + 1}
            </span>
            <p className="text-slate-900 font-medium">{question.text}</p>
          </div>

          {isSkipped ? (
            // Skipped question display
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
              <MinusCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <p className="text-amber-700 font-medium">Deze vraag is overgeslagen</p>
            </div>
          ) : isMC ? (
            // Multiple choice answer display
            <div className="space-y-2 text-sm">
              {!isCorrectMC && (
                <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-red-700 font-medium">Jouw antwoord: </span>
                    <span className="text-red-600">{getSelectedAnswerText()}</span>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-green-700 font-medium">
                    {isCorrectMC ? 'Jouw antwoord: ' : 'Correct antwoord: '}
                  </span>
                  <span className="text-green-600">{getCorrectAnswerText()}</span>
                </div>
              </div>
            </div>
          ) : (
            // Open question answer display
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">Jouw antwoord</span>
                <p className="text-slate-700 mt-1">{answer as string || 'Geen antwoord gegeven'}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <span className="text-green-700 text-xs font-medium uppercase tracking-wide">Modelantwoord</span>
                <p className="text-green-800 mt-1">{question.modelAnswer}</p>
              </div>
            </div>
          )}

          {/* AI Explanation */}
          {aiExplanation ? (
            <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-medium text-indigo-700 uppercase tracking-wide">AI Feedback</span>
              </div>
              <div className="text-sm text-slate-700 prose prose-sm max-w-none">
                <ReactMarkdown components={compactMarkdownComponents}>{aiExplanation}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRequestExplanation();
              }}
              disabled={isLoadingExplanation}
              className="mt-4 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
            >
              {isLoadingExplanation ? (
                <>
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  AI analyseert...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Vraag AI uitleg
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
