import React, { useState } from 'react';
import { MessageSquarePlus, X, Star, Send, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

type FeedbackCategory = 'bug' | 'feature_request' | 'content' | 'general';

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'general', label: 'Algemeen' },
  { value: 'bug', label: 'Fout melden' },
  { value: 'feature_request', label: 'Idee / verbetering' },
  { value: 'content', label: 'Inhoud / vragen' },
];

export const FeedbackWidget: React.FC = () => {
  const { user, session } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    setIsSuccess(false);
    setRating(null);
    setHoverRating(null);
    setCategory('general');
    setMessage('');
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/submit-feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: message.trim(),
          category,
          rating,
          page_context: window.location.pathname,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Onbekende fout');
      }

      setIsSuccess(true);
      setTimeout(() => setIsOpen(false), 2500);
    } catch (error: any) {
      showError(error.message || 'Kon feedback niet versturen. Probeer het opnieuw.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayRating = hoverRating ?? rating;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all text-sm font-medium"
          aria-label="Feedback geven"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="hidden sm:inline">Feedback</span>
        </button>
      )}

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-end justify-end pointer-events-none">
          <div
            className="pointer-events-auto w-full sm:w-96 m-4 sm:m-5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Feedback formulier"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Jouw feedback</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Sluiten"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isSuccess ? (
              /* Success state */
              <div className="flex flex-col items-center justify-center gap-3 py-10 px-5 text-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <div>
                  <p className="font-semibold text-slate-900">Bedankt voor je feedback!</p>
                  <p className="text-sm text-slate-500 mt-1">We doen ons best dit te verwerken.</p>
                </div>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Star rating */}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Hoe vind je het platform? <span className="text-slate-400 font-normal">(optioneel)</span></p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star === rating ? null : star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                        aria-label={`${star} ster${star === 1 ? '' : 'ren'}`}
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            displayRating !== null && star <= displayRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Categorie</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                          category === cat.value
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="feedback-message" className="text-sm font-medium text-slate-700 mb-2 block">
                    Jouw bericht <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      category === 'bug'
                        ? 'Wat ging er mis? Beschrijf wat je deed en wat er gebeurde...'
                        : category === 'feature_request'
                        ? 'Welke verbetering of nieuw onderdeel zou jij graag willen zien?'
                        : category === 'content'
                        ? 'Klopt er iets niet in de vragen of stof? Laat het ons weten...'
                        : 'Wat vind je goed of wat kan beter?'
                    }
                    rows={4}
                    maxLength={2000}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-400"
                  />
                  <p className="text-xs text-slate-400 mt-1 text-right">{message.length}/2000</p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!message.trim() || isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Versturen...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Feedback versturen
                    </>
                  )}
                </button>

                {user && (
                  <p className="text-xs text-slate-400 text-center">
                    Verstuurd als {user.email}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
