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
  Sparkles,
  Mail
} from 'lucide-react';
import { checkPaymentStatus } from '../services/subscriptionService';

interface PaymentCallbackProps {
  onLogin: () => void;
  onRetry: () => void;
  /** Payment ID uit URL parameter (fallback als localStorage niet beschikbaar is) */
  urlPaymentId?: string | null;
}

type PaymentState = 'checking' | 'paid' | 'pending' | 'failed' | 'no_payment';

export const PaymentCallback: React.FC<PaymentCallbackProps> = ({ onLogin, onRetry, urlPaymentId }) => {
  const [state, setState] = useState<PaymentState>('checking');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState<string | null>(null);
  const [accountReady, setAccountReady] = useState(false);
  const [countdown, setCountdown] = useState(5);
  // Bewaar payment ID in ref zodat we het kunnen gebruiken na localStorage cleanup
  const paymentIdRef = useRef<string | null>(null);
  // Track of we de initiële payment check al hebben gedaan
  const initialCheckDoneRef = useRef(false);
  // Aparte counters voor pending payment polling en account ready polling
  const [pendingCheckCount, setPendingCheckCount] = useState(0);

  // Check betaalstatus bij laden (eenmalig + pending polling)
  useEffect(() => {
    // Skip als we al een definitieve status hebben
    if (initialCheckDoneRef.current && state !== 'pending') return;

    // Payment ID ophalen: ref > localStorage > URL parameter (fallback)
    const paymentId = paymentIdRef.current
      || localStorage.getItem('pending_payment_id')
      || urlPaymentId
      || null;

    if (!paymentId) {
      setState('no_payment');
      setMessage('Geen betaling gevonden. Probeer opnieuw te registreren.');
      return;
    }

    // Bewaar payment ID in ref voor latere checks
    paymentIdRef.current = paymentId;

    const checkStatus = async () => {
      try {
        const result = await checkPaymentStatus(paymentId);

        if (result.success) {
          setEmail(result.email);
          setAccountReady(result.accountReady);

          switch (result.status) {
            case 'paid':
              initialCheckDoneRef.current = true;
              setState('paid');
              setMessage(result.message);
              // Facebook Pixel: track successful registration/purchase
              if (typeof fbq === 'function') {
                fbq('track', 'Purchase', { currency: 'EUR', value: 0 });
                fbq('track', 'CompleteRegistration');
                fbq('track', 'Subscribe', { currency: 'EUR', value: 0 });
              }
              // Verwijder payment ID uit localStorage (ref blijft beschikbaar)
              localStorage.removeItem('pending_payment_id');
              break;
            case 'pending':
            case 'open':
              setState('pending');
              setMessage(result.message);
              // Blijf checken voor pending payments
              if (pendingCheckCount < 60) { // Max 60 checks (5 minuten)
                setTimeout(() => setPendingCheckCount(c => c + 1), 5000);
              }
              break;
            case 'failed':
            case 'canceled':
            case 'expired':
              initialCheckDoneRef.current = true;
              setState('failed');
              setMessage(result.message);
              // Verwijder payment ID uit localStorage
              localStorage.removeItem('pending_payment_id');
              break;
          }
        } else {
          // API call mislukt - probeer opnieuw in plaats van direct "failed" te tonen
          if (pendingCheckCount < 5) {
            console.warn('Payment status check returned error, retrying...', result.message);
            setTimeout(() => setPendingCheckCount(c => c + 1), 3000);
          } else {
            initialCheckDoneRef.current = true;
            setState('failed');
            setMessage(result.message || 'Er ging iets mis bij het ophalen van de betaalstatus.');
            localStorage.removeItem('pending_payment_id');
          }
        }
      } catch (error) {
        console.error('Payment status check error:', error);
        // Bij netwerkfout: retry een paar keer
        if (pendingCheckCount < 5) {
          setTimeout(() => setPendingCheckCount(c => c + 1), 3000);
        } else {
          initialCheckDoneRef.current = true;
          setState('failed');
          setMessage('Er ging iets mis bij het controleren van je betaling. Probeer de pagina te vernieuwen.');
        }
      }
    };

    checkStatus();
  }, [pendingCheckCount, urlPaymentId, state]);

  // Bij success: check of account klaar is (max 60 seconden wachten)
  const [accountCheckCount, setAccountCheckCount] = useState(0);
  const [accountTimedOut, setAccountTimedOut] = useState(false);
  const maxAccountChecks = 30; // 30 checks x 2 sec = 60 seconden max
  useEffect(() => {
    if (state === 'paid' && !accountReady && accountCheckCount < maxAccountChecks) {
      // Gebruik de ref in plaats van localStorage (die is al verwijderd na paid status)
      const paymentId = paymentIdRef.current;
      if (paymentId) {
        const timer = setTimeout(async () => {
          try {
            const result = await checkPaymentStatus(paymentId);
            if (result.accountReady) {
              setAccountReady(true);
            } else {
              setAccountCheckCount(c => c + 1);
            }
          } catch (error) {
            console.error('Account ready check error:', error);
            // Bij error, blijf proberen
            setAccountCheckCount(c => c + 1);
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
    // Na max wachttijd: toon login knop met waarschuwing (account is mogelijk nog niet klaar)
    if (state === 'paid' && !accountReady && accountCheckCount >= maxAccountChecks) {
      setAccountTimedOut(true);
    }
  }, [state, accountReady, accountCheckCount]);

  // Google Ads conversie tracking bij succesvolle betaling
  useEffect(() => {
    if (state === 'paid') {
      // Track Google Ads conversion
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', {
          'send_to': 'AW-17872585813/GwTVCMSR0OobENWIqMpC'
        });
      }
    }
  }, [state]);

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
  }, [state, accountReady, countdown, onLogin]);

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
              {!accountReady && !accountTimedOut ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Je account wordt aangemaakt...</p>
                  <p className="text-gray-400 text-sm mt-2">Dit kan tot een minuut duren</p>
                </div>
              ) : accountTimedOut && !accountReady ? (
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium mb-2">Je account wordt nog aangemaakt</p>
                  <p className="text-gray-500 text-sm mb-4">
                    Dit duurt langer dan verwacht. Je betaling is geslaagd - je account wordt automatisch aangemaakt.
                    Probeer over een paar minuten in te loggen.
                  </p>
                  <Button
                    onClick={() => onLogin()}
                    className="w-full justify-center h-14 text-lg font-semibold shadow-lg shadow-blue-600/20"
                    size="lg"
                  >
                    Naar inlogpagina
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  {email && (
                    <p className="text-sm text-gray-400 mt-3">
                      Log in met: <span className="font-medium text-gray-600">{email}</span>
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Account Info */}
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Je account is klaar!</p>
                      <p className="text-sm text-gray-500">Je hebt nu volledige toegang</p>
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

            <div className="space-y-3">
              <Button
                onClick={onRetry}
                className="w-full justify-center h-14 text-lg font-semibold"
                size="lg"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Opnieuw proberen
              </Button>

              <a
                href="mailto:info@ai-examentrainer.nl"
                className="flex items-center justify-center gap-2 w-full h-12 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Hulp nodig? Neem contact op
              </a>
            </div>
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

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 mb-6 text-left">
              <p className="text-amber-800 font-medium mb-2">Heb je al betaald?</p>
              <p className="text-sm text-amber-700">
                Als je al hebt betaald, probeer dan in te loggen met het e-mailadres en wachtwoord dat je bij registratie hebt gekozen. Het kan even duren voordat je account is aangemaakt.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={onLogin}
                className="w-full justify-center h-14 text-lg font-semibold"
                size="lg"
              >
                Probeer in te loggen
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={onRetry}
                className="w-full justify-center"
                size="lg"
              >
                Opnieuw registreren
              </Button>
            </div>
          </div>
        );

      default:
        // Fallback voor onverwachte states
        return (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Even geduld...
            </h1>
            <p className="text-gray-600">
              We verwerken je verzoek
            </p>
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
