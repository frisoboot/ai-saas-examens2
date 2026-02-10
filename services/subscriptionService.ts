/**
 * Subscription Service
 *
 * Handelt alle subscription-gerelateerde API calls af.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface SubscriptionStatus {
  hasAccess: boolean;
  status: 'none' | 'trial' | 'trial_expired' | 'active' | 'pending' | 'cancelled' | 'expired';
  message: string;
  trialEndsAt?: string;
  periodEnd?: string;
  daysLeft?: number;
  planType?: string;
}

export interface CheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  paymentId?: string;
  message?: string;
  subscription?: {
    status: string;
    trialEndsAt?: string;
    periodEnd?: string;
  };
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'paid' | 'pending' | 'failed' | 'canceled' | 'expired' | 'open';
  message: string;
  email: string | null;
  accountReady: boolean;
  paymentMethod?: string;
  error?: string;
}

/**
 * Check subscription status voor een email
 */
export async function checkSubscription(email: string): Promise<SubscriptionStatus> {
  try {
    const response = await fetch(`${API_BASE}/api/check-subscription?email=${encodeURIComponent(email)}`);
    const data = await response.json();

    if (!response.ok) {
      console.error('Check subscription error:', data);
      return {
        hasAccess: false,
        status: 'none',
        message: data.error || 'Kon subscription niet controleren'
      };
    }

    return data;
  } catch (error) {
    console.error('Check subscription network error:', error);
    return {
      hasAccess: false,
      status: 'none',
      message: 'Netwerk fout'
    };
  }
}

/**
 * Start checkout proces voor nieuwe subscription
 */
export async function createCheckout(
  email: string,
  password: string,
  level: 'VMBO-TL' | 'HAVO' | 'VWO',
  plan: 'monthly' | 'exam_package' | 'yearly' = 'monthly'
): Promise<CheckoutResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, level, plan })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || data.details || `Server error: ${response.status}`
      };
    }

    return data;
  } catch (error) {
    console.error('Create checkout error:', error);
    return {
      success: false,
      message: `Netwerk fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`
    };
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(token: string): Promise<{
  success: boolean;
  message: string;
  accessUntil?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || 'Opzeggen mislukt'
      };
    }

    return data;
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return {
      success: false,
      message: 'Netwerk fout bij opzeggen'
    };
  }
}

/**
 * Renew subscription voor ingelogde gebruiker met verlopen abonnement
 */
export async function renewSubscription(
  token: string,
  plan: 'monthly' | 'exam_package' | 'yearly' = 'monthly'
): Promise<CheckoutResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/renew-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ plan })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || `Server error: ${response.status}`
      };
    }

    return data;
  } catch (error) {
    console.error('Renew subscription error:', error);
    return {
      success: false,
      message: `Netwerk fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`
    };
  }
}

/**
 * Check betaalstatus bij Mollie
 */
export async function checkPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/check-payment-status?payment_id=${encodeURIComponent(paymentId)}`);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        status: 'failed',
        message: data.error || 'Kon betaalstatus niet ophalen',
        email: null,
        accountReady: false
      };
    }

    return data;
  } catch (error) {
    console.error('Check payment status error:', error);
    return {
      success: false,
      status: 'failed',
      message: 'Netwerk fout bij ophalen betaalstatus',
      email: null,
      accountReady: false
    };
  }
}
