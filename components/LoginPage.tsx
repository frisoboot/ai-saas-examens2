import React, { useState } from 'react';
import { GraduationCap, Mail, Lock, ArrowRight, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { SEO } from './SEO';
import { Button } from './Button';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<{ error: string | null }>;
  onCheckout: () => void;
  onLanding: () => void;
  onForgotPassword: () => void;
  isLoading?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onCheckout,
  onLanding,
  onForgotPassword,
  isLoading = false
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Vul je email en wachtwoord in');
      return;
    }

    setIsSubmitting(true);

    const result = await onLogin(email, password);

    if (result.error) {
      setError(translateError(result.error));
    }

    setIsSubmitting(false);
  };

  // Vertaal Supabase errors naar Nederlandse tekst
  const translateError = (error: string): string => {
    if (error.includes('Invalid login credentials')) {
      return 'Het ingevoerde e-mailadres of wachtwoord is onjuist. Heb je net een account aangemaakt? Het kan even duren voordat je account actief is. Probeer het anders opnieuw of gebruik "Wachtwoord vergeten".';
    }
    if (error.includes('Email not confirmed')) {
      return 'Je email is nog niet bevestigd. Check je inbox.';
    }
    if (error.includes('Too many requests')) {
      return 'Te veel inlogpogingen. Probeer het later opnieuw.';
    }
    if (error.includes('Supabase niet geconfigureerd')) {
      return 'Er is een probleem met de server. Probeer het later opnieuw.';
    }
    return error;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Even geduld...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEO
        title="Inloggen"
        description="Log in bij AI Examentrainer om te oefenen voor je eindexamen met AI-gegenereerde vragen en flashcards."
        noindex={true}
      />
      {/* Header */}
      <nav className="bg-white border-b border-gray-100" role="navigation" aria-label="Hoofdnavigatie">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={onLanding}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">AI Examentrainer</span>
            </button>
            <button
              onClick={onLanding}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug naar home
            </button>
          </div>
        </div>
      </nav>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Welkom terug</h1>
              <p className="text-gray-600">Log in om verder te gaan met oefenen</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3" role="alert">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-medium text-sm">Inloggen niet gelukt</p>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="jouw@email.nl"
                    autoComplete="email"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Wachtwoord
                  </label>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Wachtwoord vergeten?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Je wachtwoord"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />
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
                    Inloggen...
                  </>
                ) : (
                  <>
                    Inloggen
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Nog geen account?</span>
              </div>
            </div>

            {/* Checkout Link */}
            <Button
              variant="outline"
              className="w-full justify-center"
              size="lg"
              onClick={onCheckout}
            >
              Start 3 dagen gratis
            </Button>
          </div>

          {/* Footer Text */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Problemen met inloggen?{' '}
            <a href="mailto:info@ai-examentrainer.nl" className="text-blue-600 hover:underline">
              Neem contact op
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
