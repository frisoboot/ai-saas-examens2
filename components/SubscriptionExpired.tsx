import React from 'react';

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
          onClick={onRenew}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition mb-3"
        >
          Verlengen voor €12,50/maand →
        </button>

        <button
          onClick={onLogout}
          className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
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
