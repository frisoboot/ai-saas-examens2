import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { renewSubscription } from '../services/subscriptionService';
import { auth } from '../services/supabaseService';
import { Button } from './Button';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Loader2,
  Lock,
  GraduationCap,
  AlertCircle,
} from 'lucide-react';

type PlanType = 'monthly' | 'exam_package' | 'yearly';

const PLAN_INFO: Record<PlanType, {
  label: string;
  price: string;
  priceDetail: string;
  badge?: string;
  badgeColor?: string;
  header: string;
  subtitle: string;
  buttonText: string;
  disclaimer: string;
  benefits: string[];
}> = {
  monthly: {
    label: 'Maandelijks',
    price: '\u20AC14,95',
    priceDetail: '/maand',
    header: 'Opnieuw abonneren',
    subtitle: '\u20AC14,95/maand, maandelijks opzegbaar',
    buttonText: 'Ga naar betalen (\u20AC14,95)',
    disclaimer: 'Er wordt \u20AC14,95/maand automatisch afgeschreven. Maandelijks opzegbaar.',
    benefits: [
      'Onbeperkt AI-oefenvragen',
      'Alle 16 vakken beschikbaar',
      'AI Examenhulp chat',
      'Flashcards generator',
    ],
  },
  exam_package: {
    label: 'Examenpakket',
    price: '\u20AC39',
    priceDetail: '4 maanden',
    badge: 'Populairst',
    badgeColor: 'bg-orange-100 text-orange-700',
    header: 'Opnieuw abonneren',
    subtitle: '\u20AC39 eenmalig \u2014 4 maanden toegang',
    buttonText: 'Ga naar betalen (\u20AC39)',
    disclaimer: 'Eenmalige betaling van \u20AC39. Geen automatische verlenging.',
    benefits: [
      'Onbeperkt AI-oefenvragen',
      'Alle 16 vakken beschikbaar',
      'AI Examenhulp chat',
      'Geen abonnement nodig',
    ],
  },
  yearly: {
    label: 'Jaarpakket',
    price: '\u20AC99',
    priceDetail: '12 maanden',
    badge: 'Beste deal',
    badgeColor: 'bg-green-100 text-green-700',
    header: 'Opnieuw abonneren',
    subtitle: '\u20AC99 eenmalig \u2014 12 maanden toegang',
    buttonText: 'Ga naar betalen (\u20AC99)',
    disclaimer: 'Eenmalige betaling van \u20AC99. Geen automatische verlenging.',
    benefits: [
      'Onbeperkt AI-oefenvragen',
      'Alle 16 vakken beschikbaar',
      'AI Examenhulp chat',
      'Geen abonnement nodig',
    ],
  },
};

interface RenewSubscriptionProps {
  onBack: () => void;
}

export const RenewSubscription: React.FC<RenewSubscriptionProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanType>('exam_package');
  const [step, setStep] = useState<'form' | 'processing' | 'redirect'>('form');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentPlan = PLAN_INFO[plan];

  const handleRenew = async () => {
    setError('');
    setIsLoading(true);
    setStep('processing');

    try {
      const { session } = await auth.getSession();
      if (!session?.access_token) {
        setError('Je sessie is verlopen. Log opnieuw in.');
        setStep('form');
        setIsLoading(false);
        return;
      }

      const result = await renewSubscription(session.access_token, plan);

      if (!result.success) {
        setError(result.message || 'Er ging iets mis');
        setStep('form');
        setIsLoading(false);
        return;
      }

      if (result.checkoutUrl) {
        setStep('redirect');
        if (result.paymentId) {
          localStorage.setItem('pending_payment_id', result.paymentId);
        }
        window.location.href = result.checkoutUrl;
      }
    } catch (err) {
      console.error('Renewal error:', err);
      setError('Er ging iets mis. Probeer het opnieuw.');
      setStep('form');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 relative overflow-hidden">
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

      <div className="w-full max-w-[560px] relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {currentPlan.header}
          </h2>
          <p className="text-gray-500 mt-3 text-lg">
            {currentPlan.subtitle}
          </p>
        </div>

        {/* Logged in as */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              Ingelogd als {user?.email}
            </p>
            <p className="text-xs text-blue-600">
              Je account en gegevens blijven behouden.
            </p>
          </div>
        </div>

        {/* Plan Selector */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {(Object.entries(PLAN_INFO) as [PlanType, typeof PLAN_INFO[PlanType]][]).map(([key, info]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPlan(key)}
              className={`relative rounded-xl p-3 text-center transition-all border-2 ${
                plan === key
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {info.badge && (
                <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${info.badgeColor}`}>
                  {info.badge}
                </span>
              )}
              <div className={`text-xs font-medium mb-1 ${plan === key ? 'text-blue-600' : 'text-gray-500'}`}>
                {info.label}
              </div>
              <div className={`text-lg font-bold ${plan === key ? 'text-blue-700' : 'text-gray-900'}`}>
                {info.price}
              </div>
              <div className={`text-[11px] ${plan === key ? 'text-blue-500' : 'text-gray-400'}`}>
                {info.priceDetail}
              </div>
            </button>
          ))}
        </div>

        {/* Benefits */}
        <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-100">
          <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
            <Sparkles className="w-4 h-4" />
            Dit krijg je:
          </div>
          <ul className="space-y-1 text-sm text-green-700">
            {currentPlan.benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Card */}
        <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-100">
          {step === 'form' && (
            <div className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                onClick={handleRenew}
                disabled={isLoading}
                className="w-full justify-center h-14 text-lg font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {currentPlan.buttonText}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-gray-500">
                Door te betalen ga je akkoord met onze{' '}
                <a href="/voorwaarden" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">algemene voorwaarden</a>.
                <br />
                {currentPlan.disclaimer}
              </p>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Betaling wordt voorbereid...</p>
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
