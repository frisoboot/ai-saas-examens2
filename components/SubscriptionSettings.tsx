import React, { useState, useEffect } from 'react';
import { SEO } from './SEO';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Calendar, AlertCircle, CheckCircle, XCircle, Loader2, RefreshCw, KeyRound } from 'lucide-react';
import { checkSubscription, cancelSubscription, resubscribe, activateWithCode, SubscriptionStatus } from '../services/subscriptionService';
import { auth } from '../services/supabaseService';
import { SubjectPackageSettings } from './SubjectPackageSettings';

interface SubscriptionSettingsProps {
  userEmail: string;
  onBack: () => void;
}

export const SubscriptionSettings: React.FC<SubscriptionSettingsProps> = ({
  userEmail,
  onBack
}) => {
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ success: boolean; message: string; accessUntil?: string } | null>(null);
  const [resubscribePlan, setResubscribePlan] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [resubscribing, setResubscribing] = useState(false);
  const [resubscribeResult, setResubscribeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activationCode, setActivationCode] = useState('');
  const [activating, setActivating] = useState(false);
  const [activationResult, setActivationResult] = useState<{ success: boolean; message: string } | null>(null);
  const justResubscribed = searchParams.get('resubscribed') === 'true';

  useEffect(() => {
    loadSubscription();
  }, [userEmail]);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      const status = await checkSubscription(userEmail);
      setSubscription(status);
    } catch (error) {
      console.error('Error loading subscription:', error);
      // Set a default status on error
      setSubscription({
        hasAccess: false,
        status: 'none',
        message: 'Kon abonnement niet laden'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const { session } = await auth.getSession();
      if (!session?.access_token) {
        setCancelResult({ success: false, message: 'Geen geldige sessie. Log opnieuw in.' });
        return;
      }
      const result = await cancelSubscription(session.access_token);
      setCancelResult(result);
      setShowCancelConfirm(false);

      if (result.success) {
        // Reload subscription status
        await loadSubscription();
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setCancelResult({
        success: false,
        message: 'Er ging iets mis bij het opzeggen. Probeer het later opnieuw.'
      });
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    const badges: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      trial: {
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        text: 'Proefperiode',
        icon: <Calendar className="w-4 h-4" />
      },
      active: {
        color: 'bg-green-100 text-green-700 border-green-200',
        text: 'Actief',
        icon: <CheckCircle className="w-4 h-4" />
      },
      cancelled: {
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        text: 'Opgezegd',
        icon: <XCircle className="w-4 h-4" />
      },
      expired: {
        color: 'bg-red-100 text-red-700 border-red-200',
        text: 'Verlopen',
        icon: <XCircle className="w-4 h-4" />
      },
      trial_expired: {
        color: 'bg-red-100 text-red-700 border-red-200',
        text: 'Proefperiode verlopen',
        icon: <XCircle className="w-4 h-4" />
      },
      pending: {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        text: 'In behandeling',
        icon: <Loader2 className="w-4 h-4 animate-spin" />
      },
      none: {
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        text: 'Geen abonnement',
        icon: <AlertCircle className="w-4 h-4" />
      }
    };

    const badge = badges[subscription.status] || badges.none;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${badge.color}`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const planType = subscription?.planType;
  // Alleen legacy exam_package is eenmalig. Yearly/quarterly zijn nu recurring abonnementen.
  const isOneTimePlan = planType === 'exam_package';

  const getPlanLabel = () => {
    switch (planType) {
      case 'exam_package': return 'Examenpakket (oud)';
      case 'yearly': return 'Jaarlijks';
      case 'quarterly': return 'Per kwartaal';
      case 'monthly':
      case 'individual':
      default: return 'Maandelijks';
    }
  };

  const getRecurringPriceLabel = () => {
    switch (planType) {
      case 'quarterly': return 'Daarna €24,95 per kwartaal';
      case 'yearly': return 'Daarna €79,00 per jaar';
      default: return 'Daarna €9,95 per maand';
    }
  };

  const getActiveBillingLabel = () => {
    switch (planType) {
      case 'quarterly': return '€24,95 / kwartaal';
      case 'yearly': return '€79,00 / jaar';
      default: return '€9,95 / maand';
    }
  };

  const canCancel = subscription &&
    (subscription.status === 'trial' || subscription.status === 'active') &&
    subscription.hasAccess &&
    !isOneTimePlan;

  // Toon "opnieuw abonneren" als abonnement verlopen/opgezegd is
  const canResubscribe = subscription &&
    ((!subscription.hasAccess && ['expired', 'cancelled', 'trial_expired'].includes(subscription.status)) ||
     (subscription.status === 'cancelled' && subscription.hasAccess));

  const handleResubscribe = async () => {
    setResubscribing(true);
    setResubscribeResult(null);
    try {
      const { session } = await auth.getSession();
      if (!session?.access_token) {
        setResubscribeResult({ success: false, message: 'Geen geldige sessie. Log opnieuw in.' });
        return;
      }
      const result = await resubscribe(session.access_token, resubscribePlan);
      if (result.success && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setResubscribeResult({ success: false, message: result.message || 'Er ging iets mis' });
      }
    } catch (error) {
      console.error('Resubscribe error:', error);
      setResubscribeResult({ success: false, message: 'Er ging iets mis. Probeer het later opnieuw.' });
    } finally {
      setResubscribing(false);
    }
  };

  const handleActivateCode = async () => {
    const trimmed = activationCode.trim();
    if (!trimmed) return;

    setActivating(true);
    setActivationResult(null);
    try {
      const { session } = await auth.getSession();
      if (!session?.access_token) {
        setActivationResult({ success: false, message: 'Geen geldige sessie. Log opnieuw in.' });
        return;
      }
      const result = await activateWithCode(session.access_token, trimmed);
      setActivationResult({ success: result.success, message: result.message });
      if (result.success) {
        setActivationCode('');
        await loadSubscription();
      }
    } catch (error) {
      console.error('Activation error:', error);
      setActivationResult({ success: false, message: 'Er ging iets mis. Probeer het later opnieuw.' });
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <SEO title="Abonnementsinstellingen" noindex={true} />
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Instellingen</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Subject Package Settings */}
          <SubjectPackageSettings userEmail={userEmail} />

          {/* Subscription Settings */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-500">Abonnement laden...</p>
              </div>
            </div>
          ) : (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Abonnementsstatus</h2>
                  {getStatusBadge()}
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Account Email */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-500">E-mailadres</span>
                  <span className="font-medium text-slate-900">{userEmail}</span>
                </div>

                {/* Status Message */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-slate-500">Status</span>
                  <span className="font-medium text-slate-900">
                    {subscription?.message === 'Database fout'
                      ? 'Kon gegevens niet ophalen'
                      : (subscription?.message || 'Onbekend')}
                  </span>
                </div>

                {/* Error/No subscription message */}
                {(subscription?.message === 'Database fout' || subscription?.status === 'none') && (
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-900">
                          {subscription?.message === 'Database fout'
                            ? 'Er ging iets mis bij het ophalen van je abonnementsgegevens.'
                            : 'Je hebt nog geen actief abonnement.'}
                        </p>
                        <p className="text-sm text-amber-700 mt-1">
                          {subscription?.message === 'Database fout'
                            ? 'Probeer de pagina te vernieuwen. Als het probleem aanhoudt, neem contact op met support.'
                            : 'Neem een abonnement om toegang te krijgen tot alle functies.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resubscribed success message */}
                {justResubscribed && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900">Betaling ontvangen!</p>
                        <p className="text-sm text-green-700 mt-1">
                          Je abonnement wordt geactiveerd. Dit kan een paar minuten duren.
                          Vernieuw deze pagina als je status nog niet is bijgewerkt.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trial Info */}
                {subscription?.status === 'trial' && subscription.trialEndsAt && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-500">Proefperiode eindigt op</span>
                    <span className="font-medium text-slate-900">{formatDate(subscription.trialEndsAt)}</span>
                  </div>
                )}

                {/* Plan Type */}
                {subscription && subscription.status !== 'none' && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100">
                    <span className="text-slate-500">Pakket</span>
                    <span className="font-medium text-slate-900">{getPlanLabel()}</span>
                  </div>
                )}

                {/* Days Left */}
                {subscription?.daysLeft !== undefined && subscription.status === 'trial' && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-blue-900">
                          Nog {subscription.daysLeft} {subscription.daysLeft === 1 ? 'dag' : 'dagen'} proefperiode
                        </p>
                        <p className="text-sm text-blue-600">
                          {getRecurringPriceLabel()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Subscription Info */}
                {subscription?.status === 'active' && subscription.periodEnd && (
                  <>
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                      <span className="text-slate-500">{isOneTimePlan ? 'Toegang tot' : 'Volgende factuurdatum'}</span>
                      <span className="font-medium text-slate-900">{formatDate(subscription.periodEnd)}</span>
                    </div>
                    {!isOneTimePlan && (
                      <div className="flex items-center justify-between py-3">
                        <span className="text-slate-500">Bedrag</span>
                        <span className="font-medium text-slate-900">{getActiveBillingLabel()}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Cancel Result Message */}
            {cancelResult && (
              <div className={`rounded-xl p-4 border ${
                cancelResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {cancelResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium ${cancelResult.success ? 'text-green-900' : 'text-red-900'}`}>
                      {cancelResult.message}
                    </p>
                    {cancelResult.accessUntil && (
                      <p className="text-sm text-green-700 mt-1">
                        Je hebt nog toegang tot {formatDate(cancelResult.accessUntil)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Cancel Subscription Section */}
            {canCancel && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900">Abonnement beheren</h2>
                </div>

                <div className="p-6">
                  {!showCancelConfirm ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Abonnement opzeggen</p>
                        <p className="text-sm text-slate-500">
                          Je behoudt toegang tot het einde van je huidige periode
                        </p>
                      </div>
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                      >
                        Opzeggen
                      </button>
                    </div>
                  ) : (
                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      <div className="flex items-start gap-3 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-900">Weet je zeker dat je wilt opzeggen?</p>
                          <p className="text-sm text-red-700 mt-1">
                            Je abonnement wordt beëindigd. Je hebt nog toegang tot het einde van je huidige
                            {subscription?.status === 'trial' ? ' proefperiode' : ' betaalperiode'}.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => setShowCancelConfirm(false)}
                          disabled={cancelling}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          Annuleren
                        </button>
                        <button
                          onClick={handleCancelSubscription}
                          disabled={cancelling}
                          className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                          {cancelling ? 'Bezig met opzeggen...' : 'Ja, opzeggen'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resubscribe Section */}
            {canResubscribe && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-900">Opnieuw abonneren</h2>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-600">
                    Kies een pakket om je abonnement te heractiveren.
                  </p>

                  {/* Plan selector */}
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: 'monthly' as const, label: 'Maandelijks', price: '€9,95/mnd' },
                      { key: 'quarterly' as const, label: 'Per kwartaal', price: '€24,95 (3 mnd)' },
                      { key: 'yearly' as const, label: 'Jaarlijks', price: '€79 (12 mnd)' },
                    ]).map(({ key, label, price }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setResubscribePlan(key)}
                        className={`rounded-xl p-3 text-center transition-all border-2 ${
                          resubscribePlan === key
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className={`text-xs font-medium mb-1 ${resubscribePlan === key ? 'text-blue-600' : 'text-slate-500'}`}>
                          {label}
                        </div>
                        <div className={`text-sm font-bold ${resubscribePlan === key ? 'text-blue-700' : 'text-slate-900'}`}>
                          {price}
                        </div>
                      </button>
                    ))}
                  </div>

                  {resubscribeResult && !resubscribeResult.success && (
                    <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                      <p className="text-sm text-red-700">{resubscribeResult.message}</p>
                    </div>
                  )}

                  <button
                    onClick={handleResubscribe}
                    disabled={resubscribing}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {resubscribing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Bezig...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Ga naar betalen
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Activation Code Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Activatiecode inwisselen</h2>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Heb je een activatiecode ontvangen? Vul deze hieronder in om je abonnement te activeren.
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={activationCode}
                    onChange={e => setActivationCode(e.target.value.toUpperCase())}
                    placeholder="Bijv. ABCD-EFGH-JKLM"
                    maxLength={50}
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-mono tracking-wider focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    disabled={activating}
                    onKeyDown={e => { if (e.key === 'Enter') handleActivateCode(); }}
                  />
                  <button
                    onClick={handleActivateCode}
                    disabled={activating || !activationCode.trim()}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                  >
                    {activating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4" />
                    )}
                    {activating ? 'Bezig...' : 'Activeren'}
                  </button>
                </div>
                {activationResult && (
                  <div className={`rounded-xl p-4 border ${
                    activationResult.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      {activationResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <p className={`text-sm font-medium ${
                        activationResult.success ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {activationResult.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Betaling</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 text-slate-500">
                  <CreditCard className="w-5 h-5" />
                  <span>Betalingen worden verwerkt via Mollie</span>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="text-center py-4">
              <p className="text-sm text-slate-500">
                Vragen over je abonnement? Neem contact met ons op via{' '}
                <a href="mailto:support@examengenie.nl" className="text-indigo-600 hover:underline">
                  support@examengenie.nl
                </a>
              </p>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};
