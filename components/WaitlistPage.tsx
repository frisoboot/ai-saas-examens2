import React, { useState } from 'react';
import { GraduationCap, Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Users, Clock, Ticket } from 'lucide-react';
import { SEO } from './SEO';
import { Button } from './Button';
import type { StudentLevel } from '../types';

interface WaitlistPageProps {
  onBack: () => void;
  onLogin: () => void;
  onActivate: () => void;
}

const LEVELS: StudentLevel[] = ['VMBO-TL', 'HAVO', 'VWO'];

export const WaitlistPage: React.FC<WaitlistPageProps> = ({ onBack, onLogin, onActivate }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<StudentLevel | ''>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Vul je e-mailadres in.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || null,
          level: level || null,
          note: note.trim() || null,
          source: 'waitlist-page',
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || 'Er ging iets mis. Probeer het later opnieuw.');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Kan geen verbinding maken met de server. Probeer het later opnieuw.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEO
        title="Wachtlijst | AI Examentrainer"
        description="Registratie is tijdelijk gesloten. Schrijf je in voor de wachtlijst en we laten het weten zodra er weer plek is."
        noindex={true}
      />

      <nav className="bg-white border-b border-gray-100" role="navigation" aria-label="Hoofdnavigatie">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={onBack}
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
              Terug naar home
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {success ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Je staat op de wachtlijst</h1>
                <p className="text-gray-600 mb-6">
                  Bedankt! We sturen je een e-mail zodra er weer plek is en je kunt starten met AI Examentrainer.
                </p>
                <Button onClick={onBack} variant="outline" className="w-full justify-center" size="lg">
                  Terug naar home
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-7 h-7 text-blue-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Schrijf je in voor de wachtlijst</h1>
                  <p className="text-gray-600">
                    Registratie is op dit moment gesloten. Laat je gegevens achter en we laten het direct weten zodra er weer plek is.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-900">
                    Heb je al een account? <button type="button" onClick={onLogin} className="font-semibold underline hover:no-underline">Log hier in</button> — bestaande gebruikers blijven gewoon toegang houden.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                  <Ticket className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                  <p className="text-sm text-emerald-900">
                    Heb je een activatiecode? <button type="button" onClick={onActivate} className="font-semibold underline hover:no-underline">Wissel 'm hier in</button> om direct te starten.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3" role="alert">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-800 font-medium text-sm">Niet gelukt</p>
                        <p className="text-red-700 text-sm mt-1">{error}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      E-mailadres <span className="text-red-500">*</span>
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
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Naam <span className="text-gray-400 font-normal">(optioneel)</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Je naam"
                      autoComplete="name"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                      Niveau <span className="text-gray-400 font-normal">(optioneel)</span>
                    </label>
                    <select
                      id="level"
                      value={level}
                      onChange={(e) => setLevel(e.target.value as StudentLevel | '')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      disabled={isSubmitting}
                    >
                      <option value="">Kies je niveau</option>
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
                      Bericht <span className="text-gray-400 font-normal">(optioneel)</span>
                    </label>
                    <textarea
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      placeholder="Welke vakken zijn voor jou belangrijk? Wanneer is je examen?"
                      rows={3}
                      maxLength={1000}
                      disabled={isSubmitting}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full justify-center"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Bezig met aanmelden...
                      </>
                    ) : (
                      'Zet me op de wachtlijst'
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    We gebruiken je e-mailadres alleen om je te laten weten wanneer je kunt starten.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
