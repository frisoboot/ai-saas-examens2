import React from 'react';
import { Sparkles, TrendingUp, Target, Lightbulb } from 'lucide-react';

interface ExamSummary {
  overall: string;
  strengths: string[];
  improvements: string[];
  studyTips: string[];
}

interface ExamSummaryCardProps {
  summary: ExamSummary;
  isLoading: boolean;
}

export const ExamSummaryCard: React.FC<ExamSummaryCardProps> = ({ summary, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="h-4 bg-slate-100 rounded animate-pulse w-48 mb-2" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">AI Feedback</h3>
          <p className="text-xs text-slate-500">Persoonlijke analyse van je resultaten</p>
        </div>
      </div>

      {/* Overall */}
      <p className="text-sm text-slate-700 mb-4 leading-relaxed">{summary.overall}</p>

      {/* Compact grid for strengths, improvements, tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Strengths */}
        {summary.strengths.length > 0 && (
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Sterk</span>
            </div>
            <ul className="space-y-1">
              {summary.strengths.slice(0, 2).map((s, i) => (
                <li key={i} className="text-xs text-green-800 flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">+</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {summary.improvements.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Verbeter</span>
            </div>
            <ul className="space-y-1">
              {summary.improvements.slice(0, 2).map((s, i) => (
                <li key={i} className="text-xs text-amber-800 flex items-start gap-1">
                  <span className="text-amber-500 mt-0.5">→</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Study Tips */}
        {summary.studyTips.length > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Tips</span>
            </div>
            <ul className="space-y-1">
              {summary.studyTips.slice(0, 2).map((s, i) => (
                <li key={i} className="text-xs text-blue-800 flex items-start gap-1">
                  <span className="text-blue-500 mt-0.5">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
