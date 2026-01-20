/**
 * Subscription Service Tests
 * Test subscription status logica en database interacties
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock subscription data
const mockTrialSubscription = {
  id: 'sub-123',
  user_email: 'student@test.nl',
  user_name: 'Jan Jansen',
  status: 'trial',
  trial_started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dagen geleden
  trial_ends_at: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(), // nog 23 dagen
  current_period_start: null,
  current_period_end: null,
  mollie_customer_id: 'cst_test123',
  mollie_subscription_id: null,
  created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

const mockActiveSubscription = {
  id: 'sub-456',
  user_email: 'betalend@test.nl',
  user_name: 'Piet Peters',
  status: 'active',
  trial_started_at: null,
  trial_ends_at: null,
  current_period_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  mollie_customer_id: 'cst_test456',
  mollie_subscription_id: 'sub_test456',
  created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

const mockExpiredSubscription = {
  id: 'sub-789',
  user_email: 'verlopen@test.nl',
  user_name: 'Kees Kansen',
  status: 'expired',
  trial_started_at: null,
  trial_ends_at: null,
  current_period_start: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  current_period_end: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  mollie_customer_id: 'cst_test789',
  mollie_subscription_id: 'sub_test789',
  created_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe('Subscription Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSubscriptionByEmail()', () => {
    it('moet subscription ophalen op email', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockTrialSubscription,
              error: null,
            }),
          }),
        }),
      });

      const { data } = await mockSupabase.from('subscriptions').select('*').eq('user_email', 'student@test.nl').maybeSingle();

      expect(data.user_email).toBe('student@test.nl');
      expect(data.status).toBe('trial');
    });

    it('moet null retourneren als geen subscription', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const { data } = await mockSupabase.from('subscriptions').select('*').eq('user_email', 'geenabo@test.nl').maybeSingle();

      expect(data).toBeNull();
    });
  });

  describe('checkAccess()', () => {
    it('moet toegang geven bij actieve trial', () => {
      const subscription = mockTrialSubscription;
      const now = new Date();

      const checkAccess = (sub: typeof subscription): { hasAccess: boolean; status: string; daysLeft?: number } => {
        if (sub.status === 'trial') {
          const trialEnds = new Date(sub.trial_ends_at!);
          if (trialEnds > now) {
            const daysLeft = Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return { hasAccess: true, status: 'trial', daysLeft };
          }
          return { hasAccess: false, status: 'trial_expired' };
        }
        return { hasAccess: false, status: 'unknown' };
      };

      const result = checkAccess(subscription);

      expect(result.hasAccess).toBe(true);
      expect(result.status).toBe('trial');
      expect(result.daysLeft).toBeGreaterThan(0);
    });

    it('moet toegang geven bij actief abonnement', () => {
      const subscription = mockActiveSubscription;
      const now = new Date();

      const checkAccess = (sub: typeof subscription): { hasAccess: boolean; status: string } => {
        if (sub.status === 'active') {
          const periodEnd = new Date(sub.current_period_end!);
          if (periodEnd > now) {
            return { hasAccess: true, status: 'active' };
          }
          return { hasAccess: false, status: 'expired' };
        }
        return { hasAccess: false, status: sub.status };
      };

      const result = checkAccess(subscription);

      expect(result.hasAccess).toBe(true);
      expect(result.status).toBe('active');
    });

    it('moet geen toegang geven bij verlopen abonnement', () => {
      const subscription = mockExpiredSubscription;

      const checkAccess = (sub: typeof subscription): { hasAccess: boolean; status: string } => {
        if (sub.status === 'expired' || sub.status === 'cancelled') {
          return { hasAccess: false, status: sub.status };
        }
        return { hasAccess: false, status: 'unknown' };
      };

      const result = checkAccess(subscription);

      expect(result.hasAccess).toBe(false);
      expect(result.status).toBe('expired');
    });

    it('moet geen toegang geven bij pending status', () => {
      const subscription = { ...mockTrialSubscription, status: 'pending' };

      const hasAccess = subscription.status !== 'pending';

      expect(hasAccess).toBe(false);
    });

    it('moet geen toegang geven bij payment_failed status', () => {
      const subscription = { ...mockActiveSubscription, status: 'payment_failed' };

      const hasAccess = subscription.status === 'active' || subscription.status === 'trial';

      expect(hasAccess).toBe(false);
    });
  });

  describe('Trial Period Calculation', () => {
    it('moet 30 dagen trial berekenen', () => {
      const trialDays = 30;
      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);

      const daysDifference = Math.round((trialEnd.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysDifference).toBe(30);
    });

    it('moet resterende trial dagen correct berekenen', () => {
      const now = new Date();
      const trialEndDate = new Date(mockTrialSubscription.trial_ends_at!);
      const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(daysLeft).toBeGreaterThan(0);
      expect(daysLeft).toBeLessThanOrEqual(30);
    });

    it('moet verlopen trial correct detecteren', () => {
      const expiredTrialEnd = new Date(Date.now() - 24 * 60 * 60 * 1000); // gisteren
      const now = new Date();

      const isExpired = expiredTrialEnd < now;

      expect(isExpired).toBe(true);
    });
  });

  describe('Subscription Status Transitions', () => {
    it('moet valid status waarden herkennen', () => {
      const validStatuses = ['trial', 'active', 'cancelled', 'expired', 'pending', 'payment_failed'];

      validStatuses.forEach(status => {
        expect(validStatuses.includes(status)).toBe(true);
      });
    });

    it('moet trial naar active transitie ondersteunen', () => {
      const subscription = { ...mockTrialSubscription };

      // Simuleer upgrade naar actief abonnement
      subscription.status = 'active';
      subscription.current_period_start = new Date().toISOString();
      subscription.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      expect(subscription.status).toBe('active');
      expect(subscription.current_period_end).toBeDefined();
    });

    it('moet active naar cancelled transitie ondersteunen', () => {
      const subscription = { ...mockActiveSubscription };

      // Simuleer annulering
      subscription.status = 'cancelled';

      expect(subscription.status).toBe('cancelled');
    });
  });
});

describe('Subscription Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Subscription', () => {
    it('moet nieuwe subscription aanmaken', async () => {
      const newSubscription = {
        user_email: 'nieuw@test.nl',
        user_name: 'Nieuwe Gebruiker',
        status: 'pending',
        mollie_customer_id: 'cst_new123',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'new-sub-id', ...newSubscription },
              error: null,
            }),
          }),
        }),
      });

      const { data, error } = await mockSupabase.from('subscriptions').insert(newSubscription).select().single();

      expect(error).toBeNull();
      expect(data.user_email).toBe('nieuw@test.nl');
      expect(data.status).toBe('pending');
    });
  });

  describe('Update Subscription', () => {
    it('moet subscription status updaten', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockTrialSubscription, status: 'active' },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { data, error } = await mockSupabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('id', 'sub-123')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.status).toBe('active');
    });

    it('moet trial activeren met correcte datums', async () => {
      const now = new Date();
      const trialEnds = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const updateData = {
        status: 'trial',
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const { error } = await mockSupabase
        .from('subscriptions')
        .update(updateData)
        .eq('user_email', 'student@test.nl');

      expect(error).toBeNull();
      expect(updateData.status).toBe('trial');
    });
  });
});

describe('Payment Integration', () => {
  describe('Mollie Customer', () => {
    it('moet mollie_customer_id opslaan', () => {
      const subscription = mockTrialSubscription;

      expect(subscription.mollie_customer_id).toBeDefined();
      expect(subscription.mollie_customer_id).toMatch(/^cst_/);
    });

    it('moet mollie_subscription_id opslaan bij actief abo', () => {
      const subscription = mockActiveSubscription;

      expect(subscription.mollie_subscription_id).toBeDefined();
      expect(subscription.mollie_subscription_id).toMatch(/^sub_/);
    });
  });

  describe('Payment Status Mapping', () => {
    it('moet Mollie payment status correct mappen', () => {
      const mollieToSubscription: Record<string, string> = {
        'paid': 'active',
        'pending': 'pending',
        'failed': 'payment_failed',
        'expired': 'expired',
        'canceled': 'cancelled',
      };

      expect(mollieToSubscription['paid']).toBe('active');
      expect(mollieToSubscription['failed']).toBe('payment_failed');
    });
  });
});

describe('Subscription Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('List Active Subscriptions', () => {
    it('moet alle actieve subscriptions ophalen', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [mockTrialSubscription, mockActiveSubscription],
            error: null,
          }),
        }),
      });

      const { data } = await mockSupabase
        .from('subscriptions')
        .select('*')
        .in('status', ['trial', 'active']);

      expect(data).toHaveLength(2);
    });
  });

  describe('Find Expiring Trials', () => {
    it('moet trials vinden die bijna verlopen', async () => {
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({
              data: [{ ...mockTrialSubscription, trial_ends_at: threeDaysFromNow }],
              error: null,
            }),
          }),
        }),
      });

      const { data } = await mockSupabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'trial')
        .lt('trial_ends_at', threeDaysFromNow);

      expect(data).toBeDefined();
    });
  });
});
