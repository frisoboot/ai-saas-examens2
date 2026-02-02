import React, { useEffect, useState } from 'react';
import { StudentProgress } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getStudentProgress } from '../services/progressService';
import { dbResults } from '../services/supabaseService';
import { getSubjectIcon, getSubjectColor } from '../utils/subjectIcons';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Lightbulb,
  Loader2,
  BookOpen
} from 'lucide-react';

interface SubjectAnalysis {
  subject: string;
  averageScore: number;
  totalExams: number;
  improvementRate: number;
  recentTrend: 'improving' | 'declining' | 'stable' | 'new';
  recentScores: number[];
}

interface StudyAdvice {
  type: 'warning' | 'tip' | 'encouragement';
  text: string;
  subject?: string;
}

const generateStudyAdvice = (analyses: SubjectAnalysis[]): StudyAdvice[] => {
  const advice: StudyAdvice[] = [];
  if (analyses.length === 0) return advice;

  // Sort by average score to find weakest and strongest
  const sorted = [...analyses].sort((a, b) => a.averageScore - b.averageScore);

  // Warn about weak subjects (< 55%)
  const weakSubjects = sorted.filter(a => a.averageScore < 55);
  for (const weak of weakSubjects.slice(0, 2)) {
    advice.push({
      type: 'warning',
      text: `Je scoort gemiddeld ${Math.round(weak.averageScore)}% voor ${weak.subject}. Oefen hier extra mee.`,
      subject: weak.subject
    });
  }

  // Tip for subjects with few exams
  const fewExams = sorted.filter(a => a.totalExams < 3 && a.totalExams > 0);
  for (const few of fewExams.slice(0, 1)) {
    advice.push({
      type: 'tip',
      text: `Je hebt pas ${few.totalExams} ${few.totalExams === 1 ? 'toets' : 'toetsen'} gemaakt voor ${few.subject}. Maak er meer om beter te weten waar je staat.`,
      subject: few.subject
    });
  }

  // Encouragement for strong or improving subjects
  const strong = sorted.filter(a => a.averageScore >= 75);
  if (strong.length > 0) {
    const best = strong[strong.length - 1];
    advice.push({
      type: 'encouragement',
      text: `Goed bezig met ${best.subject}! Je scoort gemiddeld ${Math.round(best.averageScore)}%.`,
      subject: best.subject
    });
  }

  // Tip for declining subjects
  const declining = analyses.filter(a => a.recentTrend === 'declining');
  for (const dec of declining.slice(0, 1)) {
    advice.push({
      type: 'warning',
      text: `Je scores voor ${dec.subject} gaan achteruit. Tijd om deze stof te herhalen.`,
      subject: dec.subject
    });
  }

  // Improvement encouragement
  const improving = analyses.filter(a => a.recentTrend === 'improving');
  for (const imp of improving.slice(0, 1)) {
    advice.push({
      type: 'encouragement',
      text: `Je wordt steeds beter in ${imp.subject}! Blijf zo doorgaan.`,
      subject: imp.subject
    });
  }

  // General tip if no specific advice
  if (advice.length === 0) {
    advice.push({
      type: 'tip',
      text: 'Maak regelmatig toetsen om je voortgang bij te houden.'
    });
  }

  return advice;
};

const getScoreColor = (score: number): string => {
  if (score >= 75) return 'text-green-600';
  if (score >= 55) return 'text-amber-600';
  return 'text-red-600';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 75) return 'bg-green-50 border-green-100';
  if (score >= 55) return 'bg-amber-50 border-amber-100';
  return 'bg-red-50 border-red-100';
};

const getScoreBarColor = (score: number): string => {
  if (score >= 75) return 'bg-green-500';
  if (score >= 55) return 'bg-amber-500';
  return 'bg-red-500';
};

export const StudentDifficultyOverview: React.FC = () => {
  const { user, profile } = useAuth();
  const [analyses, setAnalyses] = useState<SubjectAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id || !profile) return;

      try {
        setLoading(true);

        // Fetch progress and recent results in parallel
        const [progress, results] = await Promise.all([
          getStudentProgress(profile.name, user.id),
          dbResults.getByUser(user.id)
        ]);

        if (progress.length === 0) {
          setHasData(false);
          setLoading(false);
          return;
        }

        // Build analysis per subject
        const subjectAnalyses: SubjectAnalysis[] = progress
          .filter(p => p.totalExamsTaken > 0)
          .map(p => {
            // Get recent scores for this subject from results
            const subjectResults = results
              .filter(r => r.subject === p.subject)
              .slice(0, 5);

            const recentScores = subjectResults.map(r =>
              Math.round((r.score / r.totalQuestions) * 100)
            );

            // Determine trend from recent scores
            let recentTrend: SubjectAnalysis['recentTrend'] = 'stable';
            if (recentScores.length < 2) {
              recentTrend = 'new';
            } else if (recentScores.length >= 3) {
              // Compare average of first half vs second half of recent scores
              // recentScores is newest-first, so first = recent, last = older
              const recentAvg = recentScores.slice(0, Math.floor(recentScores.length / 2))
                .reduce((s, v) => s + v, 0) / Math.floor(recentScores.length / 2);
              const olderAvg = recentScores.slice(Math.floor(recentScores.length / 2))
                .reduce((s, v) => s + v, 0) / (recentScores.length - Math.floor(recentScores.length / 2));

              if (recentAvg > olderAvg + 5) recentTrend = 'improving';
              else if (recentAvg < olderAvg - 5) recentTrend = 'declining';
            }

            return {
              subject: p.subject,
              averageScore: p.averageScore,
              totalExams: p.totalExamsTaken,
              improvementRate: p.improvementRate || 0,
              recentTrend,
              recentScores
            };
          })
          .sort((a, b) => a.averageScore - b.averageScore); // Weakest first

        setAnalyses(subjectAnalyses);
        setHasData(true);
      } catch (error) {
        console.error('Fout bij laden moeilijkheidsoverzicht:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id, profile]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Laden...</span>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 text-indigo-700">
        <BookOpen className="w-5 h-5 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-bold">Start met oefenen</div>
          <div className="text-xs opacity-70">Maak je eerste toets om je voortgang te zien</div>
        </div>
      </div>
    );
  }

  const advice = generateStudyAdvice(analyses);

  return (
    <div className="space-y-4">
      {/* Subject scores overview */}
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" /> Jouw Scores
        </div>
        <div className="space-y-2">
          {analyses.map(analysis => {
            const Icon = getSubjectIcon(analysis.subject);
            const colorClass = getSubjectColor(analysis.subject);
            return (
              <div
                key={analysis.subject}
                className={`p-3 rounded-xl border ${getScoreBgColor(analysis.averageScore)} transition-colors`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorClass} flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {analysis.subject}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-sm font-bold ${getScoreColor(analysis.averageScore)}`}>
                      {Math.round(analysis.averageScore)}%
                    </span>
                    {analysis.recentTrend === 'improving' && (
                      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    )}
                    {analysis.recentTrend === 'declining' && (
                      <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>
                </div>
                {/* Score bar */}
                <div className="w-full bg-white/60 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${getScoreBarColor(analysis.averageScore)}`}
                    style={{ width: `${Math.min(analysis.averageScore, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {analysis.totalExams} {analysis.totalExams === 1 ? 'toets' : 'toetsen'} gemaakt
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Study advice */}
      {advice.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-1.5">
            <Lightbulb className="w-3 h-3" /> Oefenadvies
          </div>
          <div className="space-y-2">
            {advice.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 p-2.5 rounded-lg text-xs leading-relaxed ${
                  item.type === 'warning'
                    ? 'bg-red-50 text-red-700 border border-red-100'
                    : item.type === 'encouragement'
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'bg-blue-50 text-blue-700 border border-blue-100'
                }`}
              >
                {item.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                {item.type === 'encouragement' && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                {item.type === 'tip' && <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
