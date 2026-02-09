import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Calendar, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { checkSubscription, cancelSubscription, SubscriptionStatus } from '../services/subscriptionService';
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
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ success: boolean; message: string; accessUntil?: string } | null>(null);

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
  const isOneTimePlan = planType === 'exam_package' || planType === 'yearly';

  const getPlanLabel = () => {
    switch (planType) {
      case 'exam_package': return 'Examenpakket';
      case 'yearly': return 'Jaarpakket';
      case 'monthly':
      case 'individual':
      default: return 'Maandelijks';
    }
  };

  const canCancel = subscription &&
    (subscription.status === 'trial' || subscription.status === 'active') &&
    subscription.hasAccess &&
    !isOneTimePlan;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
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
                          Daarna €14,95 per maand
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
                        <span className="font-medium text-slate-900">€14,95 / maand</span>
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
