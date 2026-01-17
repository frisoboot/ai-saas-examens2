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
}

export interface CheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  message?: string;
  subscription?: {
    status: string;
    trialEndsAt?: string;
    periodEnd?: string;
  };
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
    const response = await fetch(`${API_BASE}/api/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, username, password, level })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || 'Checkout kon niet worden gestart'
      };
    }

    return data;
  } catch (error) {
    console.error('Create checkout error:', error);
    return {
      success: false,
      message: 'Netwerk fout bij starten checkout'
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
