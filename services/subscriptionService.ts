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
  existingAccount?: boolean;
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
 * Check subscription status voor de ingelogde gebruiker
 */
export async function checkSubscription(accessToken: string): Promise<SubscriptionStatus> {
  try {
    const response = await fetch(`${API_BASE}/api/check-subscription`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
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
  plan: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
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
        message: data.error || data.details || `Server error: ${response.status}`,
        existingAccount: data.existingAccount || false
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
 * Opnieuw abonneren voor ingelogde gebruikers met verlopen abonnement
 */
export async function resubscribe(
  token: string,
  plan: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
): Promise<{ success: boolean; checkoutUrl?: string; message?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/resubscribe`, {
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
        message: data.error || 'Opnieuw abonneren mislukt'
      };
    }

    return data;
  } catch (error) {
    console.error('Resubscribe error:', error);
    return {
      success: false,
      message: 'Netwerk fout bij opnieuw abonneren'
    };
  }
}

/**
 * Activatiecode inwisselen voor abonnement
 */
export async function activateWithCode(
  token: string,
  code: string
): Promise<{
  success: boolean;
  message: string;
  subscription?: {
    status: string;
    planType: string;
    periodEnd: string;
    durationDays: number;
  };
}> {
  try {
    const response = await fetch(`${API_BASE}/api/activate-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ code })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || 'Activatiecode kon niet worden ingewisseld'
      };
    }

    return data;
  } catch (error) {
    console.error('Activate code error:', error);
    return {
      success: false,
      message: 'Netwerk fout bij het activeren van de code'
    };
  }
}

/**
 * Registreer een nieuw account met een activatiecode (geen betaling nodig)
 */
export async function registerWithCode(
  email: string,
  password: string,
  level: string,
  code: string
): Promise<{
  success: boolean;
  message: string;
  subscription?: {
    status: string;
    planType: string;
    periodEnd: string;
    durationDays: number;
  };
}> {
  try {
    const response = await fetch(`${API_BASE}/api/register-with-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, level, code })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.error || 'Registratie mislukt'
      };
    }

    return data;
  } catch (error) {
    console.error('Register with code error:', error);
    return {
      success: false,
      message: 'Netwerk fout bij het registreren'
    };
  }
}

/**
 * Admin: Activatiecodes ophalen
 */
export async function getActivationCodes(token: string): Promise<{
  success: boolean;
  codes?: any[];
  message?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/admin/activation-codes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Invalid JSON response:', text.substring(0, 200));
      return { success: false, message: `Server fout (${response.status})` };
    }

    if (!response.ok) {
      return { success: false, message: data.error || 'Kon codes niet ophalen' };
    }

    return data;
  } catch (error) {
    console.error('Get activation codes error:', error);
    return { success: false, message: 'Netwerk fout - controleer je verbinding' };
  }
}

/**
 * Admin: Activatiecodes aanmaken
 */
export async function createActivationCodes(
  token: string,
  options: {
    count?: number;
    plan_type?: string;
    duration_days?: number;
    max_uses?: number;
    label?: string;
    expires_at?: string;
    custom_code?: string;
  }
): Promise<{ success: boolean; codes?: any[]; message?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/admin/activation-codes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(options)
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Invalid JSON response:', text.substring(0, 200));
      return { success: false, message: `Server fout (${response.status})` };
    }

    if (!response.ok) {
      return { success: false, message: data.error || 'Kon codes niet aanmaken' };
    }

    return data;
  } catch (error) {
    console.error('Create activation codes error:', error);
    return { success: false, message: 'Netwerk fout - controleer je verbinding' };
  }
}

/**
 * Admin: Activatiecode bijwerken
 */
export async function updateActivationCode(
  token: string,
  id: string,
  updates: { is_active?: boolean; label?: string; max_uses?: number; expires_at?: string | null }
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/admin/activation-codes`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id, ...updates })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Invalid JSON response:', text.substring(0, 200));
      return { success: false, message: `Server fout (${response.status})` };
    }

    if (!response.ok) {
      return { success: false, message: data.error || 'Kon code niet bijwerken' };
    }

    return data;
  } catch (error) {
    console.error('Update activation code error:', error);
    return { success: false, message: 'Netwerk fout - controleer je verbinding' };
  }
}

/**
 * Admin: Activatiecode verwijderen
 */
export async function deleteActivationCode(
  token: string,
  id: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/admin/activation-codes?id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Invalid JSON response:', text.substring(0, 200));
      return { success: false, message: `Server fout (${response.status})` };
    }

    if (!response.ok) {
      return { success: false, message: data.error || 'Kon code niet verwijderen' };
    }

    return data;
  } catch (error) {
    console.error('Delete activation code error:', error);
    return { success: false, message: 'Netwerk fout - controleer je verbinding' };
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
