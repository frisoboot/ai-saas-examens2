import React, { useState, useEffect } from 'react';
import { GraduationCap, Lock, ArrowRight, AlertCircle, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { SEO } from './SEO';
import { Button } from './Button';
import { auth, supabase } from '../services/supabaseService';

interface ResetPasswordPageProps {
  onSuccess: () => void;
  onLogin: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onSuccess,
  onLogin
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  // Verwerk de recovery tokens uit de URL en wacht op geldige sessie
  useEffect(() => {
    let mounted = true;

    const handleRecovery = async () => {
      if (!supabase) {
        if (mounted) setIsValidSession(false);
        return;
      }

      // Check of er hash parameters zijn (tokens van Supabase)
      // Supabase kan tokens sturen via hash (#) of query parameters (?)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);

      // Probeer eerst hash, dan query parameters
      const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const type = hashParams.get('type') || queryParams.get('type');
      const errorCode = hashParams.get('error_code') || queryParams.get('error_code');
      const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');

      // Check voor errors van Supabase
      if (errorCode || errorDescription) {
        console.error('Supabase error:', errorCode, errorDescription);
        if (mounted) setIsValidSession(false);
        return;
      }

      // Als er recovery tokens in de URL zijn, verwerk ze
      if (accessToken && (type === 'recovery' || type === 'magiclink')) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (error) {
            console.error('Sessie instellen mislukt:', error);
            if (mounted) setIsValidSession(false);
            return;
          }

          if (data.session && mounted) {
            // Verwijder de hash uit de URL voor een schonere URL
            window.history.replaceState(null, '', window.location.pathname);
            setIsValidSession(true);
          }
        } catch (err) {
          console.error('Recovery fout:', err);
          if (mounted) setIsValidSession(false);
        }
      } else {
        // Geen tokens in URL, check bestaande sessie
        const { session } = await auth.getSession();
        if (mounted) setIsValidSession(!!session);
      }
    };

    handleRecovery();

    return () => {
      mounted = false;
    };
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Wachtwoord moet minimaal 8 tekens bevatten';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Wachtwoord moet minimaal 1 hoofdletter bevatten';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Wachtwoord moet minimaal 1 kleine letter bevatten';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Wachtwoord moet minimaal 1 cijfer bevatten';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError('Vul beide velden in');
      return;
    }

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsSubmitting(true);

    const result = await auth.updatePassword(password);

    if (result.error) {
      setError(translateError(result.error));
    } else {
      setIsSuccess(true);
    }

    setIsSubmitting(false);
  };

  const translateError = (error: string): string => {
    if (error.includes('same password') || error.includes('different password')) {
      return 'Je nieuwe wachtwoord moet anders zijn dan je huidige wachtwoord.';
    }
    if (error.includes('weak password')) {
      return 'Je wachtwoord is te zwak. Gebruik minimaal 8 tekens met letters en cijfers.';
    }
    if (error.includes('session') || error.includes('expired')) {
      return 'Je reset link is verlopen. Vraag een nieuwe aan.';
    }
    return error;
  };

  // Loading state
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Even geduld...</p>
        </div>
      </div>
    );
  }

  // Invalid session - no valid reset link
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SEO
          title="Ongeldige link"
          description="De wachtwoord reset link is ongeldig of verlopen."
          noindex={true}
        />
        {/* Header */}
        <nav className="bg-white border-b border-gray-100" role="navigation" aria-label="Hoofdnavigatie">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl text-gray-900">AI Examentrainer</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Error Message */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Ongeldige of verlopen link</h1>
              <p className="text-gray-600 mb-8">
                Deze wachtwoord reset link is ongeldig of verlopen. Vraag een nieuwe reset link aan.
              </p>
              <Button
                onClick={onLogin}
                className="w-full justify-center"
                size="lg"
              >
                Ga naar inloggen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SEO
          title="Wachtwoord gewijzigd"
          description="Je wachtwoord is succesvol gewijzigd."
          noindex={true}
        />
        {/* Header */}
        <nav className="bg-white border-b border-gray-100" role="navigation" aria-label="Hoofdnavigatie">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="font-bold text-xl text-gray-900">AI Examentrainer</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Success Message */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Wachtwoord gewijzigd!</h1>
              <p className="text-gray-600 mb-8">
                Je wachtwoord is succesvol gewijzigd. Je kunt nu inloggen met je nieuwe wachtwoord.
              </p>
              <Button
                onClick={onSuccess}
                className="w-full justify-center"
                size="lg"
              >
                Ga naar dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEO
        title="Nieuw wachtwoord instellen"
        description="Stel een nieuw wachtwoord in voor je AI Examentrainer account."
        noindex={true}
      />
      {/* Header */}
      <nav className="bg-white border-b border-gray-100" role="navigation" aria-label="Hoofdnavigatie">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">AI Examentrainer</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Reset Password Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Nieuw wachtwoord instellen</h1>
              <p className="text-gray-600">
                Kies een sterk wachtwoord voor je account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3" role="alert">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-medium text-sm">Er ging iets mis</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Nieuw wachtwoord
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Minimaal 8 tekens"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Minimaal 8 tekens, met hoofdletter, kleine letter en cijfer
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Bevestig wachtwoord
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Herhaal je wachtwoord"
                    autoComplete="new-password"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full justify-center"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Wachtwoord wijzigen...
                  </>
                ) : (
                  <>
                    Wachtwoord wijzigen
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
