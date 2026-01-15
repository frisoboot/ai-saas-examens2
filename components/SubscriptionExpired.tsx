import React, { useState } from 'react';

interface SubscriptionExpiredProps {
  studentName: string;
  onRenew: () => void;
  onLogout: () => void;
}

export const SubscriptionExpired: React.FC<SubscriptionExpiredProps> = ({
  studentName,
  onRenew,
  onLogout
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRenew = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/renew-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName,
          returnUrl: `${window.location.origin}/payment-success`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verlenging mislukt');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('Geen checkout URL ontvangen');
      }
    } catch (err: any) {
      setError(err.message || 'Er ging iets mis. Probeer het opnieuw.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Je abonnement is verlopen
        </h2>
        <p className="text-gray-600 mb-6">
          Hallo {studentName}, je abonnement is niet meer actief.
          Verlengen kost €12,50 per maand via iDEAL.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-orange-800 font-semibold mb-2">
            Wat krijg je met een actief abonnement?
          </p>
          <ul className="space-y-2 text-sm text-orange-700">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Onbeperkt oefenen met alle vakken</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>AI-gegenereerde vragen op maat</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Chat met AI over elk onderwerp</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Voortgang tracking en statistieken</span>
            </li>
          </ul>
        </div>

        <button
          onClick={handleRenew}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Momentje...' : 'Verlengen voor €12,50/maand →'}
        </button>

        <button
          onClick={onLogout}
          disabled={loading}
          className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
        >
          Uitloggen
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Je gegevens en voortgang blijven bewaard als je later besluit om te verlengen
        </p>
      </div>
    </div>
  );
};
