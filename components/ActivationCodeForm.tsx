import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { activateWithCode, registerWithCode } from '../services/subscriptionService';
import { KeyRound, CheckCircle, ArrowLeft, Loader2, AlertCircle, Mail, Lock, GraduationCap, Eye, EyeOff } from 'lucide-react';

interface ActivationCodeFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

type StudentLevel = 'VMBO-TL' | 'HAVO' | 'VWO';

export const ActivationCodeForm: React.FC<ActivationCodeFormProps> = ({ onBack, onSuccess }) => {
  const { session, isAuthenticated, refreshSubscription, signIn } = useAuth();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [level, setLevel] = useState<StudentLevel>('HAVO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    message: string;
    periodEnd: string;
    durationDays: number;
  } | null>(null);

  const formatCode = (value: string): string => {
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const parts = clean.match(/.{1,4}/g) || [];
    return parts.join('-');
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
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

    setIsSubmitting(true);

    try {
      if (isAuthenticated && session?.access_token) {
        // Ingelogde gebruiker: bestaande flow
        const result = await activateWithCode(session.access_token, code);

        if (result.success && result.subscription) {
          setSuccess({
            message: result.message,
            periodEnd: result.subscription.periodEnd,
            durationDays: result.subscription.durationDays
          });
          await refreshSubscription();
        } else {
          setError(result.message || 'Er ging iets mis');
        }
      } else {
        // Niet ingelogd: registreer + activeer
        if (!email || !password) {
          setError('Vul alle velden in');
          setIsSubmitting(false);
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setError('Vul een geldig e-mailadres in');
          setIsSubmitting(false);
          return;
        }

        if (password.length < 8) {
          setError('Wachtwoord moet minimaal 8 tekens zijn');
          setIsSubmitting(false);
          return;
        }

        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
          setError('Wachtwoord moet minimaal 1 hoofdletter, 1 kleine letter en 1 cijfer bevatten');
          setIsSubmitting(false);
          return;
        }

        const result = await registerWithCode(email, password, level, code);

        if (result.success && result.subscription) {
          // Direct inloggen na registratie
          const signInResult = await signIn(email, password);
          if (!signInResult.error) {
            setSuccess({
              message: result.message,
              periodEnd: result.subscription.periodEnd,
              durationDays: result.subscription.durationDays
            });
          } else {
            // Account is aangemaakt maar inloggen mislukt - laat success zien met login hint
            setSuccess({
              message: 'Account aangemaakt! Log in met je e-mailadres en wachtwoord.',
              periodEnd: result.subscription.periodEnd,
              durationDays: result.subscription.durationDays
            });
          }
        } else {
          setError(result.message || 'Er ging iets mis');
        }
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
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {isAuthenticated ? 'Activatiecode invoeren' : 'Registreren met activatiecode'}
          </h1>
          <p className="text-sm text-slate-500">
            {isAuthenticated
              ? 'Voer je activatiecode in om je abonnement te activeren.'
              : 'Maak een account aan en activeer direct je abonnement met een code.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Registratievelden voor niet-ingelogde gebruikers */}
          {!isAuthenticated && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  E-mailadres
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    placeholder="jouw@email.nl"
                    className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Wachtwoord
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null); }}
                    placeholder="Minimaal 8 tekens, hoofdletter + cijfer"
                    className="w-full pl-11 pr-11 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Je niveau
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['VMBO-TL', 'HAVO', 'VWO'] as const).map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                        level === l
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4" />
            </>
          )}

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
              autoFocus={isAuthenticated}
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
                {isAuthenticated ? 'Activeren...' : 'Account aanmaken...'}
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5" />
                {isAuthenticated ? 'Code activeren' : 'Registreren & activeren'}
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          {isAuthenticated ? (
            <>Heb je geen code? <button onClick={onBack} className="text-indigo-600 hover:underline">Ga terug</button> en kies een abonnement.</>
          ) : (
            <>
              Heb je al een account? <a href="/login" className="text-indigo-600 hover:underline">Log in</a> en voer je code in via Instellingen.
              <br />
              Geen code? <a href="/checkout" className="text-indigo-600 hover:underline">Kies een abonnement</a>.
            </>
          )}
        </p>
      </div>
    </div>
  );
};
