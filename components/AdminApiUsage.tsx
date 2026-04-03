import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart2, Users, Zap, Clock, RefreshCw, AlertCircle } from 'lucide-react';

interface UsageStats {
  period_days: number;
  total_calls: number;
  unique_users: number;
  avg_duration_ms: number;
  by_action: Record<string, number>;
  by_model: Record<string, number>;
  by_day: Record<string, number>;
  by_subject: Record<string, number>;
}

const ACTION_LABELS: Record<string, string> = {
  gradeOpenQuestion: 'Nakijken open vraag',
  getExplanation: 'Uitleg opvragen',
  generateFlashcards: 'Flashcards genereren',
  generateLookalikeQuestions: 'Oefenvragen genereren',
  generateExamSummary: 'Examen samenvatting',
  generateStudyFeedback: 'Studiefeedback',
  chat: 'AI Chat',
};

export const AdminApiUsage: React.FC = () => {
  const { session } = useAuth();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchStats = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usage?days=${days}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ophalen mislukt');
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [session, days]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
        <span className="text-slate-500">Laden...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!stats) return null;

  const sortedActions = Object.entries(stats.by_action).sort((a, b) => b[1] - a[1]);
  const sortedSubjects = Object.entries(stats.by_subject).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const sortedDays = Object.entries(stats.by_day).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
  const maxDayCount = Math.max(...sortedDays.map(([, v]) => v), 1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-800">API Verbruik</h2>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700"
          >
            <option value={7}>Afgelopen 7 dagen</option>
            <option value={30}>Afgelopen 30 dagen</option>
            <option value={90}>Afgelopen 90 dagen</option>
          </select>
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Vernieuwen
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Zap className="w-5 h-5 text-indigo-500" />} label="Totaal calls" value={stats.total_calls.toLocaleString('nl-NL')} />
        <StatCard icon={<Users className="w-5 h-5 text-emerald-500" />} label="Unieke gebruikers" value={stats.unique_users.toString()} />
        <StatCard icon={<Clock className="w-5 h-5 text-amber-500" />} label="Gem. responstijd" value={`${(stats.avg_duration_ms / 1000).toFixed(1)}s`} />
        <StatCard
          icon={<BarChart2 className="w-5 h-5 text-purple-500" />}
          label="Calls per dag"
          value={(stats.total_calls / stats.period_days).toFixed(1)}
        />
      </div>

      {/* Activiteit per dag */}
      {sortedDays.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-3">Calls per dag (laatste 14 dagen)</h3>
          <div className="flex items-end gap-1 h-24">
            {sortedDays.map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-indigo-400 rounded-sm min-h-[2px]"
                  style={{ height: `${Math.max(4, (count / maxDayCount) * 88)}px` }}
                  title={`${day}: ${count} calls`}
                />
                <span className="text-[9px] text-slate-400 rotate-45 origin-left hidden sm:block">
                  {day.substring(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Per actie */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-3">Calls per functie</h3>
          <div className="space-y-2">
            {sortedActions.map(([action, count]) => (
              <div key={action} className="flex items-center gap-2">
                <span className="text-sm text-slate-700 flex-1 truncate">
                  {ACTION_LABELS[action] || action}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${(count / stats.total_calls) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-800 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per model */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-600 mb-3">Calls per model</h3>
          <div className="space-y-2">
            {Object.entries(stats.by_model).sort((a, b) => b[1] - a[1]).map(([model, count]) => (
              <div key={model} className="flex items-center gap-2">
                <span className="text-sm text-slate-700 flex-1 truncate">{model}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${(count / stats.total_calls) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-800 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Top vakken */}
          {sortedSubjects.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-medium text-slate-600 mb-3">Top vakken</h3>
              <div className="space-y-1.5">
                {sortedSubjects.map(([subject, count]) => (
                  <div key={subject} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate flex-1">{subject}</span>
                    <span className="text-slate-500 ml-2">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {stats.total_calls === 0 && (
        <p className="text-center text-slate-400 py-8 text-sm">
          Nog geen API calls geregistreerd in deze periode.
        </p>
      )}
    </div>
  );
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
