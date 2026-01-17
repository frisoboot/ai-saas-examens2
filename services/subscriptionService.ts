/**
 * Subscription Service
 *
 * Handelt alle subscription-gerelateerde API calls af.
 */

// Bepaal de API base URL - gebruik absolute URL in productie om "The string did not match the expected pattern" te voorkomen
const getApiBase = (): string => {
  // Gebruik environment variable indien beschikbaar
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In production: gebruik absolute URL gebaseerd op current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return ''; // SSR fallback
};

const API_BASE = getApiBase();

export interface SubscriptionStatus {
  hasAccess: boolean;
  status: 'none' | 'trial' | 'trial_expired' | 'active' | 'pending' | 'cancelled' | 'expired';
  message: string;
  trialEndsAt?: string;
  periodEnd?: string;
  daysLeft?: number;
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
  username: string | null;
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
  username: string,
  password: string,
  level: 'VMBO-TL' | 'HAVO' | 'VWO'
): Promise<CheckoutResponse> {
  try {
    console.log('Starting checkout for:', email, username, level);

    const response = await fetch(`${API_BASE}/api/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, username, password, level })
    });

    console.log('Checkout response status:', response.status);

    const data = await response.json();
    console.log('Checkout response data:', data);

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
export async function cancelSubscription(email: string): Promise<{
  success: boolean;
  message: string;
  accessUntil?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
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
 * Format datum voor weergave
 */
export function formatSubscriptionDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
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
        username: null,
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
      username: null,
      accountReady: false
    };
  }
}
