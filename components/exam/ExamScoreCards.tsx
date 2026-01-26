import React from 'react';
import { CheckCircle, FileText, Hash } from 'lucide-react';

interface ExamScoreCardsProps {
  mcScore: number;
  totalMc: number;
  openCount: number;
  openScore?: { correct: number; partial: number; incorrect: number };
  totalQuestions: number;
}

export const ExamScoreCards: React.FC<ExamScoreCardsProps> = ({
  mcScore,
  totalMc,
  openCount,
  openScore,
  totalQuestions
}) => {
  const mcPercentage = totalMc > 0 ? Math.round((mcScore / totalMc) * 100) : 0;

  // Calculate overall score including open questions if graded
  const openCorrect = openScore ? openScore.correct + (openScore.partial * 0.5) : 0;
  const totalScore = mcScore + openCorrect;
  const totalMax = totalMc + openCount;
  const overallPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  const getScoreColor = (pct: number) => {
    if (pct >= 75) return 'text-green-600';
    if (pct >= 55) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (pct: number) => {
    if (pct >= 75) return 'bg-green-50 border-green-200';
    if (pct >= 55) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className={`rounded-xl border-2 p-4 mb-6 ${getScoreBg(overallPercentage)}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Main Score */}
        <div className="flex items-baseline gap-3">
          <span className={`text-4xl font-bold tabular-nums ${getScoreColor(overallPercentage)}`}>
            {overallPercentage}%
          </span>
          <span className="text-slate-500 text-sm">
            totaalscore
          </span>
        </div>

        {/* Score Breakdown */}
        <div className="flex items-center gap-6 text-sm">
          {totalMc > 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">
                <span className="font-semibold text-slate-900">{mcScore}/{totalMc}</span> meerkeuze
              </span>
            </div>
          )}

          {openCount > 0 && (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600">
                {openScore ? (
                  <>
                    <span className="font-semibold text-green-600">{openScore.correct}</span>
                    {openScore.partial > 0 && (
                      <span className="font-semibold text-amber-600">/{openScore.partial}</span>
                    )}
                    <span className="font-semibold text-red-600">/{openScore.incorrect}</span>
                    <span className="ml-1">open</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-900">{openCount}</span> open
                  </>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pl-4 border-l border-slate-300">
            <Hash className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">
              <span className="font-semibold text-slate-900">{totalQuestions}</span> vragen
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
