import React, { useState } from 'react';
import { SEO } from './SEO';
import { Button } from './Button';
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  GraduationCap,
  Lock,
  Sparkles,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { createCheckout } from '../services/subscriptionService';

interface CheckoutFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

type StudentLevel = 'VMBO-TL' | 'HAVO' | 'VWO';

export const CheckoutForm: React.FC<CheckoutFormProps> = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState<'form' | 'processing' | 'redirect'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [level, setLevel] = useState<StudentLevel>('HAVO');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validatie
    if (!email || !password) {
      setError('Vul alle velden in');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Vul een geldig e-mailadres in');
      return;
    }

    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens zijn');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Wachtwoord moet minimaal 1 hoofdletter bevatten');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError('Wachtwoord moet minimaal 1 kleine letter bevatten');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError('Wachtwoord moet minimaal 1 cijfer bevatten');
      return;
    }

    setIsLoading(true);
    setStep('processing');

    // Track Facebook Pixel InitiateCheckout event
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'InitiateCheckout', {
        value: 12.50,
        currency: 'EUR'
      });
    }

    try {
      const result = await createCheckout(email, password, level);

      console.log('Checkout result status:', result.success);

      if (!result.success) {
        setError(result.message || 'Er ging iets mis');
        setStep('form');
        setIsLoading(false);
        return;
      }

      // Als er al een actieve subscription is
      if (result.subscription) {
        onSuccess();
        return;
      }

      // Redirect naar Mollie checkout of direct success
      if (result.checkoutUrl) {
        setStep('redirect');
        // Sla payment ID op in localStorage voor status check na redirect
        if (result.paymentId) {
          localStorage.setItem('pending_payment_id', result.paymentId);
        }
        window.location.href = result.checkoutUrl;
      } else {
        // Trial direct geactiveerd (geen betaling nodig voor trial start)
        onSuccess();
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Er ging iets mis. Probeer het opnieuw.');
      setStep('form');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 relative overflow-hidden">
      <SEO
        title="Registreren | Start je gratis proefperiode"
        description="Start vandaag nog je gratis 7-dagen proefperiode van AI Examentrainer. Toegang tot alle AI-gegenereerde oefenvragen en flashcards voor VMBO, HAVO en VWO."
        canonical="https://ai-examentrainer.nl/checkout"
      />
      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Terug</span>
      </button>

      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="w-full max-w-[480px] relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Start je gratis proefperiode
          </h2>
          <p className="text-gray-500 mt-3 text-lg">
            3 dagen gratis proberen, daarna €12,50/maand
          </p>
          <p className="text-gray-400 mt-1 text-sm">
            Eenmalig €1,00 voor betaalverificatie
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-100">
          <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
            <Sparkles className="w-4 h-4" />
            Dit krijg je:
          </div>
          <ul className="space-y-1 text-sm text-green-700">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Onbeperkt AI-oefenvragen
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Alle 16 vakken beschikbaar
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Maandelijks opzegbaar
            </li>
          </ul>
        </div>

        {/* Form Card */}
        <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-100">
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2 ml-1">
                  E-mailadres
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 pl-12 pr-4 py-3.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-sm transition-all outline-none border hover:bg-gray-50/80"
                    placeholder="jouw@email.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2 ml-1">
                  Wachtwoord
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 pl-12 pr-12 py-3.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-sm transition-all outline-none border hover:bg-gray-50/80"
                    placeholder="Minimaal 8 tekens, met hoofdletter en cijfer"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2 ml-1">
                  Je niveau
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['VMBO-TL', 'HAVO', 'VWO'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLevel(l)}
                      className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                        level === l
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3">
                  <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full justify-center h-14 text-lg font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Ga naar betalen (€1,00)
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-gray-500">
                Door te registreren ga je akkoord met onze{' '}
                <a href="/voorwaarden" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">algemene voorwaarden</a>
                {' '}en{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">privacybeleid</a>.
                <br />
                Na je proefperiode wordt €12,50/maand automatisch afgeschreven.
              </p>
            </form>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Account wordt aangemaakt...</p>
            </div>
          )}

          {step === 'redirect' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-900 font-medium mb-2">Doorsturen naar betaalpagina...</p>
              <p className="text-gray-500 text-sm">Je wordt automatisch doorgestuurd naar Mollie.</p>
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="mt-6 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
          <Lock className="w-4 h-4" />
          Veilig betalen via Mollie
        </div>
      </div>
    </div>
  );
};
