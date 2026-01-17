import React, { useEffect, useState } from 'react';
import { Button } from './Button';
import {
  CheckCircle2,
  GraduationCap,
  ArrowRight,
  Loader2,
  Clock,
  Sparkles
} from 'lucide-react';

interface PaymentSuccessProps {
  username: string;
  onLogin: () => void;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ username, onLogin }) => {
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Wacht even voordat de login knop actief wordt (webhook moet account aanmaken)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Countdown voor auto-redirect
  useEffect(() => {
    if (isReady && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isReady && countdown === 0) {
      onLogin();
    }
  }, [isReady, countdown, username, onLogin]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-green-50 to-emerald-50 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="w-full max-w-[480px] relative z-10 text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30 animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Header */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
          Betaling geslaagd!
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Welkom bij AI Examentrainer, <span className="font-semibold text-gray-900">{username}</span>!
        </p>

        {/* Info Card */}
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 mb-8">
          {!isReady ? (
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

              {/* Dashboard Button */}
              <Button
                onClick={() => onLogin()}
                className="w-full justify-center h-14 text-lg font-semibold shadow-lg shadow-blue-600/20"
                size="lg"
              >
                Ga naar dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <p className="text-sm text-gray-400 mt-4">
                Automatisch doorsturen in {countdown} seconden...
              </p>
            </>
          )}
        </div>

        {/* Login Credentials Reminder */}
        {isReady && (
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-left">
            <p className="font-medium text-blue-800 mb-2">Je inloggegevens:</p>
            <div className="space-y-1 text-sm text-blue-700">
              <p><span className="font-medium">Gebruikersnaam:</span> {username}</p>
              <p><span className="font-medium">Wachtwoord:</span> Het wachtwoord dat je zojuist hebt gekozen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
