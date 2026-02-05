import React, { useEffect, useState } from 'react';
import { SEO } from './SEO';
import { TopicAnalysis, AIStudyFeedback, StudentProgress } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getStudentProgress, getOverallProgress, getTopicAnalysis } from '../services/progressService';
import { generateStudyFeedback } from '../services/geminiService';
import { dbResults } from '../services/supabaseService';
import { getSubjectIcon, getSubjectColor } from '../utils/subjectIcons';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
  BookOpen,
  Target,
  Award,
  AlertTriangle,
  Calendar
} from 'lucide-react';

interface FeedbackPageProps {
  onBack: () => void;
}

const getScoreColor = (score: number): string => {
  if (score >= 75) return 'text-green-600';
  if (score >= 55) return 'text-amber-600';
  return 'text-red-600';
};

const getScoreBarColor = (score: number): string => {
  if (score >= 75) return 'bg-green-500';
  if (score >= 55) return 'bg-amber-500';
  return 'bg-red-500';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 75) return 'bg-green-50 border-green-200';
  if (score >= 55) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
};

interface SubjectWithTopics {
  subject: string;
  averageScore: number;
  totalExams: number;
  improvementRate: number;
  topics: TopicAnalysis[];
}

export const FeedbackPage: React.FC<FeedbackPageProps> = ({ onBack }) => {
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [subjectsWithTopics, setSubjectsWithTopics] = useState<SubjectWithTopics[]>([]);
  const [overallStats, setOverallStats] = useState<{ totalExams: number; averageScore: number; improvementRate: number; lastExamDate?: string } | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  // AI feedback state
  const [aiFeedback, setAiFeedback] = useState<AIStudyFeedback | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user?.id, profile]);

  // Load cached AI feedback from localStorage
  useEffect(() => {
    if (!user?.id) return;
    try {
      const cached = localStorage.getItem(`ai-feedback-${user.id}`);
      if (cached) {
        const parsed: AIStudyFeedback = JSON.parse(cached);
        // Check if cache is still valid (24 hours)
        const cacheAge = Date.now() - new Date(parsed.generatedAt).getTime();
        if (cacheAge < 24 * 60 * 60 * 1000) {
          setAiFeedback(parsed);
        }
      }
    } catch {
      // Invalid cache, ignore
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id || !profile) return;

    try {
      setLoading(true);

      const [progress, overall, topicData] = await Promise.all([
        getStudentProgress(profile.name, user.id),
        getOverallProgress(profile.name, user.id),
        getTopicAnalysis(user.id)
      ]);

      setOverallStats(overall);

      // Group topics by subject and merge with progress data
      const topicsBySubject = new Map<string, TopicAnalysis[]>();
      for (const t of topicData) {
        if (!topicsBySubject.has(t.subject)) {
          topicsBySubject.set(t.subject, []);
        }
        topicsBySubject.get(t.subject)!.push(t);
      }

      const combined: SubjectWithTopics[] = progress
        .filter(p => p.totalExamsTaken > 0)
        .map(p => ({
          subject: p.subject,
          averageScore: p.averageScore,
          totalExams: p.totalExamsTaken,
          improvementRate: p.improvementRate || 0,
          topics: (topicsBySubject.get(p.subject) || []).sort((a, b) => a.scorePercent - b.scorePercent)
        }))
        .sort((a, b) => a.averageScore - b.averageScore); // Weakest first

      setSubjectsWithTopics(combined);

      // Auto-expand the weakest subject
      if (combined.length > 0) {
        setExpandedSubjects(new Set([combined[0].subject]));
      }
    } catch (error) {
      console.error('Fout bij laden feedback data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subject: string) => {
    setExpandedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subject)) {
        next.delete(subject);
      } else {
        next.add(subject);
      }
      return next;
    });
  };

  const handleGenerateAIFeedback = async () => {
    if (!user?.id || !profile || !overallStats) return;

    setAiLoading(true);
    setAiError(null);

    try {
      // Build subject analyses for the AI
      const subjectAnalyses = subjectsWithTopics.map(s => ({
        subject: s.subject,
        averageScore: s.averageScore,
        totalExams: s.totalExams,
        weakTopics: s.topics
          .filter(t => t.scorePercent < 55)
          .slice(0, 3)
          .map(t => t.topic)
      }));

      const feedback = await generateStudyFeedback(
        profile.name,
        profile.level,
        subjectAnalyses,
        overallStats
      );

      setAiFeedback(feedback);

      // Cache in localStorage
      localStorage.setItem(`ai-feedback-${user.id}`, JSON.stringify(feedback));
    } catch (error: any) {
      setAiError(error.message || 'Er ging iets mis bij het genereren van advies.');
    } finally {
      setAiLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Nog geen toetsen';
    const date = new Date(dateStr);
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Voortgang laden...</span>
        </div>
      </div>
    );
  }

  const hasData = subjectsWithTopics.length > 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <SEO
        title="Voortgang & Feedback"
        description="Bekijk je voortgang, moeilijke onderwerpen en ontvang persoonlijk AI studieadvies."
        noindex={true}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Terug naar dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Voortgang & Feedback</h1>
            <p className="text-sm text-slate-500 hidden sm:block">Bekijk je scores, moeilijke onderwerpen en ontvang AI studieadvies</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {!hasData ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Nog geen resultaten</h2>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Maak je eerste toets om je voortgang te zien. Na een paar toetsen verschijnen hier je scores, moeilijke onderwerpen en persoonlijk AI studieadvies.
            </p>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Naar het dashboard
            </button>
          </div>
        ) : (
          <>
            {/* Section 1: Overview Stats */}
            {overallStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase mb-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    Toetsen
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{overallStats.totalExams}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase mb-1">
                    <Target className="w-3.5 h-3.5" />
                    Gem. Score
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(overallStats.averageScore)}`}>
                    {Math.round(overallStats.averageScore)}%
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Verbetering
                  </div>
                  <div className={`text-2xl font-bold ${overallStats.improvementRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {overallStats.improvementRate >= 0 ? '+' : ''}{Math.round(overallStats.improvementRate)}%
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Laatste
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {overallStats.lastExamDate
                      ? new Date(overallStats.lastExamDate).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
                      : '-'
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Subject scores with topic breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-400" />
                  Moeilijke Onderwerpen
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Per vak je scores en de onderwerpen waar je extra mee moet oefenen</p>
              </div>

              <div className="divide-y divide-slate-100">
                {subjectsWithTopics.map(subjectData => {
                  const Icon = getSubjectIcon(subjectData.subject);
                  const colorClass = getSubjectColor(subjectData.subject);
                  const isExpanded = expandedSubjects.has(subjectData.subject);

                  return (
                    <div key={subjectData.subject}>
                      {/* Subject header - clickable */}
                      <button
                        onClick={() => toggleSubject(subjectData.subject)}
                        className="w-full px-5 sm:px-6 py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass} flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900">{subjectData.subject}</div>
                          <div className="text-xs text-slate-500">
                            {subjectData.totalExams} {subjectData.totalExams === 1 ? 'toets' : 'toetsen'}
                            {subjectData.improvementRate !== 0 && (
                              <span className={`ml-2 inline-flex items-center gap-0.5 ${subjectData.improvementRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {subjectData.improvementRate > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {subjectData.improvementRate > 0 ? '+' : ''}{Math.round(subjectData.improvementRate)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-lg font-bold ${getScoreColor(subjectData.averageScore)}`}>
                            {Math.round(subjectData.averageScore)}%
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Topic breakdown - expandable */}
                      {isExpanded && (
                        <div className="px-5 sm:px-6 pb-4">
                          {subjectData.topics.length === 0 ? (
                            <div className="text-sm text-slate-500 italic pl-13 py-2">
                              Nog niet genoeg data voor onderwerpen. Maak meer toetsen om details te zien.
                            </div>
                          ) : (
                            <div className="space-y-2 ml-13">
                              {subjectData.topics.map((topic, idx) => (
                                <div
                                  key={`${topic.subject}-${topic.topic}-${idx}`}
                                  className={`flex items-center gap-3 p-3 rounded-xl border ${getScoreBgColor(topic.scorePercent)}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-800 truncate">{topic.topic}</div>
                                    <div className="text-xs text-slate-500">{topic.correctCount}/{topic.totalQuestions} goed</div>
                                  </div>
                                  <div className="w-24 flex-shrink-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`text-sm font-bold ${getScoreColor(topic.scorePercent)}`}>
                                        {topic.scorePercent}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-white/60 rounded-full h-1.5">
                                      <div
                                        className={`h-1.5 rounded-full ${getScoreBarColor(topic.scorePercent)}`}
                                        style={{ width: `${Math.min(topic.scorePercent, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: AI Study Advice */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  AI Studieadvies
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Persoonlijk advies op basis van jouw resultaten</p>
              </div>

              <div className="p-5 sm:p-6">
                {aiFeedback ? (
                  <div className="space-y-5">
                    {/* Personalized advice */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <p className="text-sm text-indigo-900 leading-relaxed">{aiFeedback.personalizedAdvice}</p>
                    </div>

                    {/* Priority subjects */}
                    {aiFeedback.prioritySubjects.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          Prioriteit
                        </h3>
                        <div className="space-y-2">
                          {aiFeedback.prioritySubjects.map((ps, i) => (
                            <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                              <div className="font-semibold text-sm text-amber-900 whitespace-nowrap">{ps.subject}</div>
                              <div className="text-sm text-amber-800">{ps.advice}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Weekly goal */}
                    <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                      <Award className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold text-green-900 mb-0.5">Weekdoel</div>
                        <p className="text-sm text-green-800">{aiFeedback.weeklyGoal}</p>
                      </div>
                    </div>

                    {/* Refresh button */}
                    <button
                      onClick={handleGenerateAIFeedback}
                      disabled={aiLoading}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {aiLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Vernieuw advies
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    {aiError && (
                      <p className="text-sm text-red-600 mb-4">{aiError}</p>
                    )}
                    <button
                      onClick={handleGenerateAIFeedback}
                      disabled={aiLoading}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Advies genereren...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Genereer persoonlijk advies
                        </>
                      )}
                    </button>
                    <p className="text-xs text-slate-400 mt-3">Op basis van je toetsresultaten genereert de AI persoonlijk studieadvies</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
