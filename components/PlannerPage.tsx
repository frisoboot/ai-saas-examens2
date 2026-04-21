import React, { useEffect, useState, useCallback } from 'react';
import { SEO } from './SEO';
import { StudyPlan, StudyPlanTask, StudyPlanDay, PlanTaskActivity } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getStudentProgress, getTopicAnalysis } from '../services/progressService';
import { generateStudyPlan } from '../services/geminiService';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Calendar,
  CheckCircle2,
  Circle,
  RefreshCw,
  BookOpen,
  Zap,
  MessageCircle,
  RotateCcw,
  GraduationCap,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PlannerPageProps {
  onBack: () => void;
}

const STORAGE_KEY = 'ai_study_plan';

const activityIcons: Record<PlanTaskActivity, React.ReactNode> = {
  oefentoets: <Zap className="w-4 h-4" />,
  flashcards: <BookOpen className="w-4 h-4" />,
  chat: <MessageCircle className="w-4 h-4" />,
  herhaling: <RotateCcw className="w-4 h-4" />,
  theorie: <GraduationCap className="w-4 h-4" />,
};

const activityColors: Record<PlanTaskActivity, string> = {
  oefentoets: 'bg-indigo-100 text-indigo-700',
  flashcards: 'bg-purple-100 text-purple-700',
  chat: 'bg-blue-100 text-blue-700',
  herhaling: 'bg-amber-100 text-amber-700',
  theorie: 'bg-green-100 text-green-700',
};

const priorityColors: Record<string, string> = {
  hoog: 'border-red-200 bg-red-50',
  middel: 'border-amber-200 bg-amber-50',
  laag: 'border-green-200 bg-green-50',
};

function getWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

function isCurrentWeek(plan: StudyPlan): boolean {
  return plan.weekStart === getWeekStart();
}

function getTodayIso(): string {
  return new Date().toISOString().split('T')[0];
}

function getDayProgress(day: StudyPlanDay): { done: number; total: number } {
  const total = day.tasks.length;
  const done = day.tasks.filter(t => t.completed).length;
  return { done, total };
}

function getWeekProgress(plan: StudyPlan): { done: number; total: number } {
  const allTasks = plan.days.flatMap(d => d.tasks);
  return {
    done: allTasks.filter(t => t.completed).length,
    total: allTasks.length,
  };
}

export const PlannerPage: React.FC<PlannerPageProps> = ({ onBack }) => {
  const { user, profile } = useAuth();

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const loadPlan = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StudyPlan = JSON.parse(stored);
        setPlan(parsed);
        // Auto-expand today or the first non-rest day with tasks
        const today = getTodayIso();
        const todayDay = parsed.days.find(d => d.date === today && !d.restDay);
        if (todayDay) {
          setExpandedDays(new Set([today]));
        } else {
          const firstActive = parsed.days.find(d => !d.restDay && d.tasks.length > 0);
          if (firstActive) setExpandedDays(new Set([firstActive.date]));
        }
      }
    } catch {
      // Corrupted storage - ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const savePlan = (newPlan: StudyPlan) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPlan));
    setPlan(newPlan);
  };

  const handleGenerate = async () => {
    if (!profile || !user?.id) return;

    setGenerating(true);
    setError(null);

    try {
      const [progress, topicData] = await Promise.all([
        getStudentProgress(profile.name, user.id),
        getTopicAnalysis(user.id),
      ]);

      const topicsBySubject = new Map<string, string[]>();
      for (const t of topicData) {
        if (t.scorePercent < 55) {
          if (!topicsBySubject.has(t.subject)) topicsBySubject.set(t.subject, []);
          topicsBySubject.get(t.subject)!.push(t.topic);
        }
      }

      // Include subjects with exams taken + selected subjects with no data yet
      const subjectsWithData = progress
        .filter(p => p.totalExamsTaken > 0)
        .map(p => ({
          subject: p.subject,
          averageScore: Math.round(p.averageScore),
          totalExams: p.totalExamsTaken,
          weakTopics: (topicsBySubject.get(p.subject) || []).slice(0, 3),
        }));

      // If student has selected subjects but no exam data yet, include them without stats
      const selectedSubjects = profile.selectedSubjects || [];
      const existingSubjectNames = new Set(subjectsWithData.map(s => s.subject));
      const extraSubjects = selectedSubjects
        .filter(s => !existingSubjectNames.has(s))
        .map(s => ({ subject: s }));

      const subjects = [...subjectsWithData, ...extraSubjects];

      if (subjects.length === 0) {
        setError('Selecteer eerst vakken in je dashboard om een planning te maken.');
        return;
      }

      const weekStart = getWeekStart();
      const newPlan = await generateStudyPlan(profile.name, profile.level, subjects, weekStart);
      savePlan(newPlan);

      const today = getTodayIso();
      const todayDay = newPlan.days.find((d: StudyPlanDay) => d.date === today && !d.restDay);
      if (todayDay) {
        setExpandedDays(new Set([today]));
      } else {
        const firstActive = newPlan.days.find((d: StudyPlanDay) => !d.restDay && d.tasks.length > 0);
        if (firstActive) setExpandedDays(new Set([firstActive.date]));
      }
    } catch (err: any) {
      setError(err.message || 'Er ging iets mis. Probeer het opnieuw.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleTask = (dayDate: string, taskId: string) => {
    if (!plan) return;
    const newPlan: StudyPlan = {
      ...plan,
      days: plan.days.map(day => {
        if (day.date !== dayDate) return day;
        return {
          ...day,
          tasks: day.tasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          ),
        };
      }),
    };
    savePlan(newPlan);
  };

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Planning laden...</span>
        </div>
      </div>
    );
  }

  const today = getTodayIso();
  const weekProgress = plan ? getWeekProgress(plan) : null;
  const isOldPlan = plan && !isCurrentWeek(plan);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <SEO
        title="AI Studyplanning"
        description="Laat AI een persoonlijk weekrooster maken op basis van jouw voortgang."
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
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">AI Studyplanning</h1>
            <p className="text-sm text-slate-500 hidden sm:block">Persoonlijk weekrooster op basis van jouw voortgang</p>
          </div>
          {plan && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Nieuw plan</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {!plan ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Nog geen studyplanning</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Laat de AI een persoonlijk weekrooster maken op basis van je vakken en voortgang. Je krijgt een dag-voor-dag plan met concrete studietaken.
            </p>

            {error && (
              <p className="text-sm text-red-600 mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Planning genereren...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Genereer mijn weekplanning
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 mt-4">
              De AI maakt een planning op basis van jouw vakken en resultaten
            </p>
          </div>
        ) : (
          <>
            {/* Old plan warning */}
            {isOldPlan && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-left hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-blue-600 flex-shrink-0 ${generating ? 'animate-spin' : ''}`} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-blue-900">Dit is een planning van vorige week</div>
                  <div className="text-xs text-blue-700">Klik om een nieuwe planning voor deze week te genereren</div>
                </div>
              </button>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
            )}

            {/* Week goal & motivation */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-0.5">Weekdoel</div>
                  <p className="text-slate-800 text-sm">{plan.studyGoal}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-slate-600 text-sm italic">{plan.motivation}</p>
              </div>
            </div>

            {/* Week progress */}
            {weekProgress && weekProgress.total > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">Weekvoortgang</span>
                  <span className="text-sm font-bold text-slate-900">
                    {weekProgress.done}/{weekProgress.total} taken
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${Math.round((weekProgress.done / weekProgress.total) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500 mt-1.5">
                  {Math.round((weekProgress.done / weekProgress.total) * 100)}% voltooid
                </div>
              </div>
            )}

            {/* Day cards */}
            <div className="space-y-3">
              {plan.days.map(day => {
                const isToday = day.date === today;
                const isExpanded = expandedDays.has(day.date);
                const dayProg = getDayProgress(day);

                return (
                  <div
                    key={day.date}
                    className={`bg-white rounded-2xl border overflow-hidden transition-colors ${
                      isToday ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'
                    }`}
                  >
                    {/* Day header */}
                    <button
                      onClick={() => !day.restDay && toggleDay(day.date)}
                      disabled={day.restDay}
                      className={`w-full px-5 py-4 flex items-center gap-3 text-left ${
                        day.restDay ? 'cursor-default' : 'hover:bg-slate-50 transition-colors'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isToday ? 'bg-indigo-600' : day.restDay ? 'bg-slate-100' : 'bg-slate-100'
                      }`}>
                        <Calendar className={`w-5 h-5 ${isToday ? 'text-white' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold ${isToday ? 'text-indigo-700' : 'text-slate-900'}`}>
                          {day.dayLabel}
                          {isToday && (
                            <span className="ml-2 text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                              Vandaag
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {day.restDay
                            ? 'Rustdag — geniet van je vrije tijd!'
                            : `${day.tasks.length} ${day.tasks.length === 1 ? 'taak' : 'taken'} · ${day.tasks.reduce((s, t) => s + t.durationMinutes, 0)} min`
                          }
                        </div>
                      </div>
                      {!day.restDay && day.tasks.length > 0 && (
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {dayProg.total > 0 && (
                            <span className={`text-sm font-medium ${
                              dayProg.done === dayProg.total ? 'text-green-600' : 'text-slate-500'
                            }`}>
                              {dayProg.done}/{dayProg.total}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      )}
                    </button>

                    {/* Tasks */}
                    {isExpanded && !day.restDay && (
                      <div className="px-5 pb-4 space-y-3">
                        {day.tasks.map(task => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onToggle={() => toggleTask(day.date, task.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

interface TaskCardProps {
  task: StudyPlanTask;
  onToggle: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle }) => {
  const activity = task.activity as PlanTaskActivity;
  const icon = activityIcons[activity] ?? <BookOpen className="w-4 h-4" />;
  const colorClass = activityColors[activity] ?? 'bg-slate-100 text-slate-700';
  const bgClass = priorityColors[task.priority] ?? 'border-slate-200 bg-white';

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${bgClass} ${task.completed ? 'opacity-60' : ''}`}>
      <button
        onClick={onToggle}
        className="flex-shrink-0 mt-0.5 transition-colors"
        aria-label={task.completed ? 'Markeer als niet voltooid' : 'Markeer als voltooid'}
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
            {icon}
            {task.activityLabel}
          </span>
          <span className="text-xs font-semibold text-slate-700">{task.subject}</span>
          {task.topic && (
            <span className="text-xs text-slate-500">· {task.topic}</span>
          )}
        </div>
        <p className={`text-sm text-slate-700 ${task.completed ? 'line-through text-slate-400' : ''}`}>
          {task.description}
        </p>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
          <Clock className="w-3 h-3" />
          {task.durationMinutes} min
        </div>
      </div>
    </div>
  );
};
