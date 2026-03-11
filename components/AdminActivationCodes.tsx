import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getActivationCodes,
  createActivationCodes,
  updateActivationCode,
  deleteActivationCode
} from '../services/subscriptionService';
import {
  Plus, Trash2, Copy, Check, Loader2, KeyRound,
  ToggleLeft, ToggleRight, Users, Calendar, Tag
} from 'lucide-react';

interface ActivationCode {
  id: string;
  code: string;
  plan_type: string;
  duration_days: number;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  label: string | null;
  created_by: string | null;
  expires_at: string | null;
  created_at: string;
  activation_code_usages?: Array<{
    id: string;
    user_email: string;
    activated_at: string;
  }>;
}

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Maandelijks',
  quarterly: 'Per kwartaal',
  yearly: 'Jaarlijks'
};

export const AdminActivationCodes: React.FC = () => {
  const { session } = useAuth();
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  // Create form state
  const [formCount, setFormCount] = useState(1);
  const [formPlanType, setFormPlanType] = useState('monthly');
  const [formDuration, setFormDuration] = useState(30);
  const [formMaxUses, setFormMaxUses] = useState(1);
  const [formLabel, setFormLabel] = useState('');
  const [formCustomCode, setFormCustomCode] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');

  const token = session?.access_token;

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    if (!token) return;
    setLoading(true);
    const result = await getActivationCodes(token);
    if (result.success && result.codes) {
      setCodes(result.codes);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setCreating(true);
    const result = await createActivationCodes(token, {
      count: formCustomCode ? 1 : formCount,
      plan_type: formPlanType,
      duration_days: formDuration,
      max_uses: formMaxUses,
      label: formLabel || undefined,
      custom_code: formCustomCode || undefined,
      expires_at: formExpiresAt || undefined
    });

    if (result.success) {
      setShowCreateForm(false);
      resetForm();
      await loadCodes();
    } else {
      alert(result.message || 'Kon codes niet aanmaken');
    }
    setCreating(false);
  };

  const resetForm = () => {
    setFormCount(1);
    setFormPlanType('monthly');
    setFormDuration(30);
    setFormMaxUses(1);
    setFormLabel('');
    setFormCustomCode('');
    setFormExpiresAt('');
  };

  const handleToggleActive = async (code: ActivationCode) => {
    if (!token) return;
    const result = await updateActivationCode(token, code.id, { is_active: !code.is_active });
    if (result.success) {
      setCodes(prev => prev.map(c =>
        c.id === code.id ? { ...c, is_active: !c.is_active } : c
      ));
    }
  };

  const handleDelete = async (code: ActivationCode) => {
    if (!token) return;
    if (!confirm(`Weet je zeker dat je code "${code.code}" wilt verwijderen?`)) return;

    const result = await deleteActivationCode(token, code.id);
    if (result.success) {
      setCodes(prev => prev.filter(c => c.id !== code.id));
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const activeCodesCount = codes.filter(c => c.is_active).length;
  const totalUsages = codes.reduce((sum, c) => sum + c.times_used, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-slate-600">Codes laden...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header met stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Activatiecodes</h2>
          <p className="text-sm text-slate-500 mt-1">
            {codes.length} codes totaal &middot; {activeCodesCount} actief &middot; {totalUsages}x gebruikt
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nieuwe codes
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Nieuwe activatiecodes aanmaken</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Plan type</label>
              <select
                value={formPlanType}
                onChange={e => setFormPlanType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="monthly">Maandelijks</option>
                <option value="quarterly">Per kwartaal</option>
                <option value="yearly">Jaarlijks</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Duur (dagen)</label>
              <input
                type="number"
                value={formDuration}
                onChange={e => setFormDuration(Number(e.target.value))}
                min={1}
                max={730}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Aantal codes {formCustomCode && '(1 bij custom code)'}
              </label>
              <input
                type="number"
                value={formCustomCode ? 1 : formCount}
                onChange={e => setFormCount(Number(e.target.value))}
                min={1}
                max={100}
                disabled={!!formCustomCode}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Max gebruik per code (0 = onbeperkt)
              </label>
              <input
                type="number"
                value={formMaxUses}
                onChange={e => setFormMaxUses(Number(e.target.value))}
                min={0}
                max={10000}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Custom code (optioneel)
              </label>
              <input
                type="text"
                value={formCustomCode}
                onChange={e => setFormCustomCode(e.target.value.toUpperCase())}
                placeholder="Bijv. SCHOOL2026"
                maxLength={50}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Geldig tot (optioneel)
              </label>
              <input
                type="date"
                value={formExpiresAt}
                onChange={e => setFormExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Label / notitie (optioneel)
            </label>
            <input
              type="text"
              value={formLabel}
              onChange={e => setFormLabel(e.target.value)}
              placeholder="Bijv. School X - 30 leerlingen"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {creating ? 'Aanmaken...' : 'Aanmaken'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreateForm(false); resetForm(); }}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium transition-colors"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}

      {/* Codes lijst */}
      {codes.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <KeyRound className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nog geen activatiecodes aangemaakt</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map(code => {
            const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
            const isFullyUsed = code.max_uses !== null && code.times_used >= code.max_uses;
            const isUsable = code.is_active && !isExpired && !isFullyUsed;
            const isExpanded = expandedCode === code.id;

            return (
              <div
                key={code.id}
                className={`bg-white rounded-xl border ${isUsable ? 'border-slate-200' : 'border-slate-100 opacity-70'} overflow-hidden`}
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Code */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <code className="text-sm font-mono font-semibold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {code.code}
                    </code>
                    <button
                      onClick={() => handleCopy(code.code)}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Kopieer code"
                    >
                      {copiedCode === code.code ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Info badges */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                      <Tag className="w-3 h-3" />
                      {PLAN_LABELS[code.plan_type] || code.plan_type}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                      <Calendar className="w-3 h-3" />
                      {code.duration_days}d
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
                      isFullyUsed ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Users className="w-3 h-3" />
                      {code.times_used}/{code.max_uses ?? '∞'}
                    </span>
                    {code.label && (
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full truncate max-w-[150px]">
                        {code.label}
                      </span>
                    )}
                    {isExpired && (
                      <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full">Verlopen</span>
                    )}
                  </div>

                  {/* Acties */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(code)}
                      className={`p-2 rounded-lg transition-colors ${
                        code.is_active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-slate-400 hover:bg-slate-50'
                      }`}
                      title={code.is_active ? 'Deactiveren' : 'Activeren'}
                    >
                      {code.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    {code.times_used > 0 && (
                      <button
                        onClick={() => setExpandedCode(isExpanded ? null : code.id)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Gebruik bekijken"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(code)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded: usage details */}
                {isExpanded && code.activation_code_usages && code.activation_code_usages.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500 mb-2">Gebruikshistorie:</p>
                    <div className="space-y-1">
                      {code.activation_code_usages.map(usage => (
                        <div key={usage.id} className="flex items-center justify-between text-xs text-slate-600">
                          <span>{usage.user_email}</span>
                          <span className="text-slate-400">
                            {new Date(usage.activated_at).toLocaleDateString('nl-NL', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
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
