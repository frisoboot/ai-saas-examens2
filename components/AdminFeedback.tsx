import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Star, MessageSquare, Bug, Lightbulb, BookOpen, RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface UserFeedback {
  id: string;
  user_id: string | null;
  user_email: string | null;
  rating: number | null;
  category: 'bug' | 'feature_request' | 'content' | 'general';
  message: string;
  page_context: string | null;
  created_at: string;
}

const CATEGORY_META: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  bug: { label: 'Fout', icon: Bug, color: 'text-red-600 bg-red-100' },
  feature_request: { label: 'Idee', icon: Lightbulb, color: 'text-amber-600 bg-amber-100' },
  content: { label: 'Inhoud', icon: BookOpen, color: 'text-blue-600 bg-blue-100' },
  general: { label: 'Algemeen', icon: MessageSquare, color: 'text-slate-600 bg-slate-100' },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'bug', label: 'Fouten' },
  { value: 'feature_request', label: 'Ideeën' },
  { value: 'content', label: 'Inhoud' },
  { value: 'general', label: 'Algemeen' },
];

export const AdminFeedback: React.FC = () => {
  const { session } = useAuth();
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadFeedback = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const res = await fetch(`/api/admin/feedback?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Kon feedback niet laden');
      }

      const data = await res.json();
      setFeedback(data.feedback || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message || 'Onbekende fout');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, categoryFilter]);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const avgRating = feedback.filter(f => f.rating !== null).length > 0
    ? feedback.filter(f => f.rating !== null).reduce((sum, f) => sum + (f.rating ?? 0), 0) /
      feedback.filter(f => f.rating !== null).length
    : null;

  const countByCategory = (cat: string) => feedback.filter(f => f.category === cat).length;

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Totaal</div>
          <div className="text-2xl font-bold text-slate-900">{total}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Gem. score</div>
          <div className="text-2xl font-bold text-amber-500">
            {avgRating !== null ? avgRating.toFixed(1) : '—'}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Fouten</div>
          <div className="text-2xl font-bold text-red-600">{countByCategory('bug')}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase mb-1">Ideeën</div>
          <div className="text-2xl font-bold text-amber-600">{countByCategory('feature_request')}</div>
        </div>
      </div>

      {/* Filters + refresh */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setCategoryFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              categoryFilter === opt.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={loadFeedback}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Vernieuwen
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Laden...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      ) : feedback.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nog geen feedback ontvangen</p>
        </div>
      ) : (
        <div className="space-y-2">
          {feedback.map((item) => {
            const meta = CATEGORY_META[item.category] ?? CATEGORY_META.general;
            const Icon = meta.icon;
            const isExpanded = expandedId === item.id;
            const shortMessage = item.message.length > 120 ? item.message.slice(0, 120) + '…' : item.message;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
                >
                  {/* Category badge */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                        {meta.label}
                      </span>
                      {item.rating !== null && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-500 font-medium">
                          {Array.from({ length: item.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">
                        {new Date(item.created_at).toLocaleDateString('nl-NL', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-snug">
                      {isExpanded ? item.message : shortMessage}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-slate-400 mt-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 space-y-1">
                    {item.user_email && (
                      <div><span className="font-medium">Gebruiker:</span> {item.user_email}</div>
                    )}
                    {item.page_context && (
                      <div><span className="font-medium">Pagina:</span> {item.page_context}</div>
                    )}
                    {!item.user_email && !item.page_context && (
                      <div className="italic">Geen extra gegevens beschikbaar</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
