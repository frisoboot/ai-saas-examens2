import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { activateWithCode } from '../services/subscriptionService';
import { KeyRound, CheckCircle, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface ActivationCodeFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const ActivationCodeForm: React.FC<ActivationCodeFormProps> = ({ onBack, onSuccess }) => {
  const { session, refreshSubscription } = useAuth();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    message: string;
    periodEnd: string;
    durationDays: number;
  } | null>(null);

  const formatCode = (value: string): string => {
    // Verwijder alles behalve letters en cijfers
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Voeg streepjes toe per 4 karakters
    const parts = clean.match(/.{1,4}/g) || [];
    return parts.join('-');
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    // Max 14 karakters (XXXX-XXXX-XXXX)
    if (formatted.length <= 14) {
      setCode(formatted);
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.replace(/-/g, '');
    if (cleanCode.length < 4) {
      setError('Voer een geldige activatiecode in');
      return;
    }

    if (!session?.access_token) {
      setError('Je bent niet ingelogd. Log eerst in en probeer het opnieuw.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await activateWithCode(session.access_token, code);

      if (result.success && result.subscription) {
        setSuccess({
          message: result.message,
          periodEnd: result.subscription.periodEnd,
          durationDays: result.subscription.durationDays
        });
        // Ververs subscription status in context
        await refreshSubscription();
      } else {
        setError(result.message || 'Er ging iets mis');
      }
    } catch {
      setError('Er ging iets mis bij het activeren');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    const endDate = new Date(success.periodEnd);
    const formattedDate = endDate.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Geactiveerd!</h1>
          <p className="text-slate-600 mb-2">{success.message}</p>
          <p className="text-sm text-slate-500 mb-6">
            Je abonnement is actief tot <strong>{formattedDate}</strong>
          </p>
          <button
            onClick={onSuccess}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Ga naar dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-7 h-7 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Activatiecode invoeren</h1>
          <p className="text-sm text-slate-500">
            Heb je een activatiecode ontvangen? Voer deze hieronder in om je abonnement te activeren.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="activation-code" className="block text-sm font-medium text-slate-700 mb-1.5">
              Activatiecode
            </label>
            <input
              id="activation-code"
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="XXXX-XXXX-XXXX"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
              disabled={isSubmitting}
              autoFocus
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || code.replace(/-/g, '').length < 4}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Activeren...
              </>
            ) : (
              'Code activeren'
            )}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          Heb je geen code? <button onClick={onBack} className="text-indigo-600 hover:underline">Ga terug</button> en kies een abonnement.
        </p>
      </div>
    </div>
  );
};
