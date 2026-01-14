import React, { useState } from 'react';
import { StudentLevel } from '../types';
import { Button } from './Button';
import { ArrowLeft, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';

interface StudentRegistrationProps {
  onBack: () => void;
}

export const StudentRegistration: React.FC<StudentRegistrationProps> = ({ onBack }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    level: 'HAVO' as StudentLevel,
    acceptTerms: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('Vul alle velden in');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }

    if (formData.password.length < 8) {
      setError('Wachtwoord moet minimaal 8 karakters lang zijn');
      return;
    }

    if (!formData.acceptTerms) {
      setError('Je moet akkoord gaan met de voorwaarden');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          level: formData.level,
          returnUrl: `${window.location.origin}/payment-success`
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registratie mislukt');
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
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-[480px]">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg"></div>
          </div>
          <h2 className="text-[32px] font-bold tracking-tight text-gray-900 mb-2">
            Maak je account aan
          </h2>
          <p className="text-[17px] text-gray-500">
            Start je 7 dagen gratis trial vandaag.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white px-6 py-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:rounded-[24px] sm:px-10 border border-gray-100">
          
          <button 
            onClick={onBack} 
            className="group flex items-center text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-1 transition-transform" />
            Terug
          </button>

          {/* Trial Info */}
          <div className="bg-blue-50/50 rounded-2xl p-5 mb-8 border border-blue-100/50">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">7 dagen volledig gratis</h3>
                <p className="text-[14px] text-gray-500 mt-1 leading-relaxed">
                  Je zit nergens aan vast. Na de trial €12,50/maand. Opzeggen kan op elk moment met één klik.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-[14px] mb-6 border border-red-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[13px] font-medium text-gray-900 mb-1.5 ml-1">
                Gebruikersnaam
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full rounded-[14px] border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm transition-all outline-none border focus:ring-1"
                placeholder="jandevries"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-900 mb-1.5 ml-1">
                Email
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full rounded-[14px] border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm transition-all outline-none border focus:ring-1"
                placeholder="naam@school.nl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-900 mb-1.5 ml-1">
                  Wachtwoord
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full rounded-[14px] border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm transition-all outline-none border focus:ring-1"
                  placeholder="8+ tekens"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-900 mb-1.5 ml-1">
                  Bevestig
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="block w-full rounded-[14px] border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm transition-all outline-none border focus:ring-1"
                  placeholder="Herhaal"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-900 mb-1.5 ml-1">
                Niveau
              </label>
              <div className="relative">
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as StudentLevel })}
                  className="block w-full appearance-none rounded-[14px] border-gray-200 bg-gray-50 px-4 py-3.5 text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500 sm:text-sm transition-all outline-none border focus:ring-1"
                >
                  <option value="VMBO-TL">VMBO-TL</option>
                  <option value="HAVO">HAVO</option>
                  <option value="VWO">VWO</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-start pt-2">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                checked={formData.acceptTerms}
                onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                className="h-4 w-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="terms" className="ml-3 block text-[13px] text-gray-500 leading-relaxed">
                Ik ga akkoord met de <a href="#" className="text-blue-600 hover:text-blue-500">voorwaarden</a>. 
                Ik begrijp dat na de gratis periode het abonnement automatisch doorloopt (€12,50/mnd).
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full justify-center text-[16px] font-semibold py-4"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Momentje...
                </>
              ) : (
                'Start Gratis Trial'
              )}
            </Button>
          </form>
        </div>
        
        <p className="text-center text-[13px] text-gray-400 mt-8">
          Veilig betalen via Mollie. Gegevens worden versleuteld opgeslagen.
        </p>
      </div>
    </div>
  );
};
