import React from 'react';
import { Target, FileText, TrendingUp } from 'lucide-react';

interface ExamScoreCardsProps {
  mcScore: number;
  totalMc: number;
  openCount: number;
  totalQuestions: number;
}

export const ExamScoreCards: React.FC<ExamScoreCardsProps> = ({
  mcScore,
  totalMc,
  openCount,
  totalQuestions
}) => {
  const percentage = totalMc > 0 ? Math.round((mcScore / totalMc) * 100) : 0;

  return (
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
          <div className="text-6xl font-bold bg-gradient-to-br from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">{totalQuestions}</div>
          <div className="text-base font-bold text-green-700">Gemaakt</div>
        </div>
      </div>
    </div>
  );
};
