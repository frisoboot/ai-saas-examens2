import React, { useEffect, useState } from 'react';

interface PaymentSuccessProps {
  onContinue?: () => void;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ onContinue }) => {
  const [status, setStatus] = useState<'loading' | 'success'>('loading');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Wait a moment for webhook to process
    const timer = setTimeout(() => {
      setStatus('success');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Auto-redirect to login
      window.location.href = '/';
    }
  }, [status, countdown]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Betaling verwerken...</h2>
          <p className="text-gray-600">
            Even geduld terwijl we je betaling controleren.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4 animate-bounce">✅</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Gelukt!</h2>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 font-semibold mb-2">
            Je gratis trial is gestart
          </p>
          <p className="text-green-700 text-sm">
            Je kunt nu 7 dagen gratis alle features gebruiken
          </p>
        </div>

        <div className="space-y-4 text-left mb-6">
          <div className="flex items-start">
            <span className="text-green-600 mr-2 mt-1">✓</span>
            <div>
              <p className="font-medium text-gray-800">Onbeperkt oefenen</p>
              <p className="text-sm text-gray-600">Maak zoveel examens als je wilt</p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-green-600 mr-2 mt-1">✓</span>
            <div>
              <p className="font-medium text-gray-800">AI-gegenereerde vragen</p>
              <p className="text-sm text-gray-600">Krijg vragen op maat van jouw niveau</p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-green-600 mr-2 mt-1">✓</span>
            <div>
              <p className="font-medium text-gray-800">Chat met AI</p>
              <p className="text-sm text-gray-600">Stel vragen over elk onderwerp</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Na 7 dagen:</strong> €12,50/maand via automatische incasso
          </p>
          <p className="text-xs text-gray-500">
            Je kunt op elk moment opzeggen via je account instellingen
          </p>
        </div>

        {onContinue ? (
          <button
            onClick={onContinue}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Naar Login →
          </button>
        ) : (
          <div className="space-y-3">
            <a
              href="/"
              className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition text-center"
            >
              Ga naar Login
            </a>
            <p className="text-sm text-gray-500">
              Je wordt over {countdown} seconden automatisch doorgestuurd...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
