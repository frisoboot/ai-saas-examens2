import React from 'react';
import { BrainCircuit, CheckCircle, Target, Lightbulb } from 'lucide-react';

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
    );
  }

  return (
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
          <span className="text-sm font-bold text-indigo-600">AI Gegenereerd</span>
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
        <p className="text-slate-700 text-lg leading-relaxed pl-13">{summary.overall}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Strengths */}
        {summary.strengths.length > 0 && (
          <div className="bg-gradient-to-br from-green-50/90 to-emerald-50/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-100 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shadow-md">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-slate-900 text-lg">Sterke Punten</h4>
            </div>
            <ul className="space-y-3">
              {summary.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-3 bg-white/80 rounded-xl p-3 border border-green-100">
                  <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                  <span className="text-slate-700 leading-relaxed">{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {summary.improvements.length > 0 && (
          <div className="bg-gradient-to-br from-orange-50/90 to-amber-50/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-100 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-md">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-bold text-slate-900 text-lg">Verbeterpunten</h4>
            </div>
            <ul className="space-y-3">
              {summary.improvements.map((improvement, idx) => (
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
      {summary.studyTips.length > 0 && (
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
            {summary.studyTips.map((tip, idx) => (
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
  );
};
