import React, { useEffect, useState, useRef } from 'react';
import { Button } from './Button';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { checkPaymentStatus } from '../services/subscriptionService';

interface PaymentCallbackProps {
  onLogin: () => void;
  onRetry: () => void;
}

type PaymentState = 'checking' | 'paid' | 'pending' | 'failed' | 'no_payment';

export const PaymentCallback: React.FC<PaymentCallbackProps> = ({ onLogin, onRetry }) => {
  const [state, setState] = useState<PaymentState>('checking');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState<string | null>(null);
  const [accountReady, setAccountReady] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const [countdown, setCountdown] = useState(5);
  // Bewaar payment ID in ref zodat we het kunnen gebruiken na localStorage cleanup
  const paymentIdRef = useRef<string | null>(null);

  // Check betaalstatus bij laden
  useEffect(() => {
    // Gebruik ref als we al een payment ID hebben opgeslagen, anders haal uit localStorage
    const paymentId = paymentIdRef.current || localStorage.getItem('pending_payment_id');

    if (!paymentId) {
      setState('no_payment');
      setMessage('Geen betaling gevonden. Probeer opnieuw te registreren.');
      return;
    }

    // Bewaar payment ID in ref voor latere checks
    paymentIdRef.current = paymentId;

    const checkStatus = async () => {
      const result = await checkPaymentStatus(paymentId);

      if (result.success) {
        setEmail(result.email);
        setAccountReady(result.accountReady);

        switch (result.status) {
          case 'paid':
            setState('paid');
            setMessage(result.message);
            // Verwijder payment ID uit localStorage (ref blijft beschikbaar)
            localStorage.removeItem('pending_payment_id');
            break;
          case 'pending':
          case 'open':
            setState('pending');
            setMessage(result.message);
            // Blijf checken voor pending payments
            if (checkCount < 30) { // Max 30 checks (2.5 minuten)
              setTimeout(() => setCheckCount(c => c + 1), 5000);
            }
            break;
          case 'failed':
          case 'canceled':
          case 'expired':
            setState('failed');
            setMessage(result.message);
            // Verwijder payment ID uit localStorage
            localStorage.removeItem('pending_payment_id');
            break;
        }
      } else {
        setState('failed');
        setMessage(result.message || 'Er ging iets mis bij het ophalen van de betaalstatus.');
        localStorage.removeItem('pending_payment_id');
      }
    };

    checkStatus();
  }, [checkCount]);

  // Bij success: check of account klaar is
  useEffect(() => {
    if (state === 'paid' && !accountReady && checkCount < 30) {
      // Gebruik de ref in plaats van localStorage (die is al verwijderd na paid status)
      const paymentId = paymentIdRef.current;
      if (paymentId) {
        const timer = setTimeout(async () => {
          const result = await checkPaymentStatus(paymentId);
          if (result.accountReady) {
            setAccountReady(true);
          } else {
            setCheckCount(c => c + 1);
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [state, accountReady, checkCount]);

  // Countdown voor auto-redirect bij success
  useEffect(() => {
    if (state === 'paid' && accountReady && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (state === 'paid' && accountReady && countdown === 0) {
      onLogin();
    }
  }, [state, accountReady, countdown, username, onLogin]);

  const renderContent = () => {
    switch (state) {
      case 'checking':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Betaling verwerken...
            </h1>
            <p className="text-gray-600">
              We controleren je betaling bij Mollie
            </p>
          </div>
        );

      case 'paid':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30 animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Betaling geslaagd!
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Welkom bij AI Examentrainer!
            </p>

            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-6">
              {!accountReady ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Je account wordt aangemaakt...</p>
                  <p className="text-gray-400 text-sm mt-2">Dit duurt een paar seconden</p>
                </div>
              ) : (
                <>
                  {/* Trial Info */}
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">3 dagen gratis</p>
                      <p className="text-sm text-gray-500">Je proefperiode is gestart</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-100">
                    <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                      <Sparkles className="w-4 h-4" />
                      Je hebt nu toegang tot:
                    </div>
                    <ul className="space-y-1 text-sm text-green-700">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Onbeperkt AI-oefenvragen
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Alle 16 vakken
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Persoonlijke AI-tutor
                      </li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => onLogin()}
                    className="w-full justify-center h-14 text-lg font-semibold shadow-lg shadow-blue-600/20"
                    size="lg"
                  >
                    Inloggen en starten
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>

                  <p className="text-sm text-gray-400 mt-4">
                    Automatisch doorsturen in {countdown} seconden...
                  </p>
                </>
              )}
            </div>

            {/* Login Credentials Reminder */}
            {accountReady && email && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-left">
                <p className="font-medium text-blue-800 mb-2">Je inloggegevens:</p>
                <div className="space-y-1 text-sm text-blue-700">
                  <p><span className="font-medium">E-mail:</span> {email}</p>
                  <p><span className="font-medium">Wachtwoord:</span> Het wachtwoord dat je hebt gekozen</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'pending':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-xl">
                <Clock className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Betaling wordt verwerkt
            </h1>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
              <p className="text-yellow-800 text-sm">
                Dit kan enkele minuten duren. Deze pagina wordt automatisch bijgewerkt.
              </p>
            </div>
            <div className="mt-6">
              <Loader2 className="w-6 h-6 text-yellow-600 animate-spin mx-auto" />
            </div>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-xl shadow-red-500/30">
                <XCircle className="w-10 h-10 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Betaling niet gelukt
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              {message}
            </p>

            <div className="bg-red-50 rounded-xl p-4 border border-red-100 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-red-800 font-medium">Wat kun je doen?</p>
                  <ul className="text-sm text-red-700 mt-2 space-y-1">
                    <li>Controleer of je voldoende saldo hebt</li>
                    <li>Probeer een andere betaalmethode</li>
                    <li>Neem contact op als het probleem aanhoudt</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={onRetry}
              className="w-full justify-center h-14 text-lg font-semibold"
              size="lg"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Opnieuw proberen
            </Button>
          </div>
        );

      case 'no_payment':
        return (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center shadow-xl">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Geen betaling gevonden
            </h1>
            <p className="text-gray-600 mb-6">
              {message}
            </p>
            <Button
              onClick={onRetry}
              className="w-full justify-center h-14 text-lg font-semibold"
              size="lg"
            >
              Naar registratie
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl opacity-60 ${
          state === 'paid' ? 'bg-gradient-to-br from-green-50 to-emerald-50' :
          state === 'failed' ? 'bg-gradient-to-br from-red-50 to-rose-50' :
          state === 'pending' ? 'bg-gradient-to-br from-yellow-50 to-orange-50' :
          'bg-gradient-to-br from-blue-50 to-indigo-50'
        }`}></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="w-full max-w-[480px] relative z-10">
        {renderContent()}
      </div>
    </div>
  );
};
