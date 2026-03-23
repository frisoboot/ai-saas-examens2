import React, { useState } from 'react';
import { GraduationCap, Mail, ArrowRight, AlertCircle, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { SEO } from './SEO';
import { Button } from './Button';

interface ForgotPasswordPageProps {
  onBack: () => void;
  onLanding: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onBack,
  onLanding
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Vul je email adres in');
      return;
    }

    // Basis email validatie
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Vul een geldig email adres in');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(translateError(data.error || 'Er ging iets mis'));
      } else {
        setIsSuccess(true);
      }
    } catch {
      setError('Er ging iets mis. Probeer het opnieuw.');
    }

    setIsSubmitting(false);
  };

  const translateError = (error: string): string => {
    if (error.includes('rate limit') || error.includes('Too many requests')) {
      return 'Te veel verzoeken. Wacht even en probeer het opnieuw.';
    }
    if (error.includes('not found') || error.includes('User not found')) {
      // Voor veiligheid geven we niet aan of de email bestaat
      return 'Als dit email adres bij ons bekend is, ontvang je een reset link.';
    }
    return error;
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <SEO
          title="Email verzonden"
          description="Controleer je inbox voor de wachtwoord reset link."
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
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Email verzonden!</h1>
              <p className="text-gray-600 mb-6">
                Als het email adres <strong>{email}</strong> bij ons bekend is, ontvang je binnen enkele minuten een email met een link om je wachtwoord te resetten.
              </p>
              <p className="text-gray-500 text-sm mb-8">
                Check ook je spam folder als je de email niet ziet.
              </p>
              <Button
                onClick={onBack}
                className="w-full justify-center"
                size="lg"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Terug naar inloggen
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
        title="Wachtwoord vergeten"
        description="Reset je wachtwoord voor AI Examentrainer."
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
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Terug naar inloggen
            </button>
          </div>
        </div>
      </nav>

      {/* Forgot Password Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Wachtwoord vergeten?</h1>
              <p className="text-gray-600">
                Vul je email adres in en we sturen je een link om je wachtwoord te resetten.
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
                    Verzenden...
                  </>
                ) : (
                  <>
                    Stuur reset link
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Footer Text */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Weet je je wachtwoord weer?{' '}
            <button onClick={onBack} className="text-blue-600 hover:underline">
              Ga terug naar inloggen
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
