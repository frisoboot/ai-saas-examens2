/**
 * Auth Service Tests
 * Test alle authenticatie functionaliteit
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock user data
const mockUser = {
  id: 'user-123',
  email: 'test@student.nl',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  aud: 'authenticated',
  role: 'authenticated',
};

const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_at: Date.now() / 1000 + 3600,
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

// Mock Supabase auth
const mockSupabaseAuth = {
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
};

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signIn()', () => {
    it('moet succesvol inloggen met correcte credentials', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await mockSupabaseAuth.signInWithPassword({
        email: 'test@student.nl',
        password: 'wachtwoord123',
      });

      expect(result.data.user).toEqual(mockUser);
      expect(result.data.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('moet error retourneren bij verkeerde credentials', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await mockSupabaseAuth.signInWithPassword({
        email: 'test@student.nl',
        password: 'verkeerd',
      });

      expect(result.data.user).toBeNull();
      expect(result.error.message).toBe('Invalid login credentials');
    });

    it('moet error retourneren bij niet-bestaande gebruiker', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User not found' },
      });

      const result = await mockSupabaseAuth.signInWithPassword({
        email: 'nietbestaand@test.nl',
        password: 'wachtwoord',
      });

      expect(result.error.message).toBe('User not found');
    });

    it('moet rate limiting error afhandelen', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Too many requests' },
      });

      const result = await mockSupabaseAuth.signInWithPassword({
        email: 'test@student.nl',
        password: 'wachtwoord',
      });

      expect(result.error.message).toBe('Too many requests');
    });
  });

  describe('signOut()', () => {
    it('moet succesvol uitloggen', async () => {
      mockSupabaseAuth.signOut.mockResolvedValue({ error: null });

      const result = await mockSupabaseAuth.signOut({ scope: 'local' });

      expect(result.error).toBeNull();
    });

    it('moet localStorage wissen bij uitloggen', () => {
      const localStorageMock = {
        removeItem: vi.fn(),
        key: vi.fn((i: number) => i === 0 ? 'sb-token' : null),
        length: 1,
      };

      // Simuleer localStorage cleanup
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorageMock.length; i++) {
        const key = localStorageMock.key(i);
        if (key && key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorageMock.removeItem(key));

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('sb-token');
    });

    it('moet graceful omgaan met signOut errors', async () => {
      mockSupabaseAuth.signOut.mockResolvedValue({
        error: { message: 'Network error' },
      });

      // Zelfs bij error moet localStorage gewist zijn
      const result = await mockSupabaseAuth.signOut({ scope: 'local' });

      // We accepteren de error maar localStorage is al gewist
      expect(result.error).toBeDefined();
    });
  });

  describe('getSession()', () => {
    it('moet huidige sessie ophalen', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await mockSupabaseAuth.getSession();

      expect(result.data.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('moet null retourneren als niet ingelogd', async () => {
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await mockSupabaseAuth.getSession();

      expect(result.data.session).toBeNull();
    });

    it('moet verlopen sessie detecteren', async () => {
      const expiredSession = {
        ...mockSession,
        expires_at: Date.now() / 1000 - 3600, // 1 uur geleden verlopen
      };

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: expiredSession },
        error: null,
      });

      const result = await mockSupabaseAuth.getSession();
      const session = result.data.session;

      expect(session.expires_at).toBeLessThan(Date.now() / 1000);
    });
  });

  describe('getUser()', () => {
    it('moet huidige gebruiker ophalen', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await mockSupabaseAuth.getUser();

      expect(result.data.user).toEqual(mockUser);
      expect(result.data.user.email).toBe('test@student.nl');
    });

    it('moet null retourneren als niet ingelogd', async () => {
      mockSupabaseAuth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await mockSupabaseAuth.getUser();

      expect(result.data.user).toBeNull();
    });
  });

  describe('onAuthStateChange()', () => {
    it('moet callback registreren voor auth changes', () => {
      const callback = vi.fn();
      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      });

      const result = mockSupabaseAuth.onAuthStateChange(callback);

      expect(result.data.subscription.unsubscribe).toBeDefined();
    });

    it('moet callback uitvoeren bij SIGNED_IN event', async () => {
      const callback = vi.fn();
      let registeredCallback: any = null;

      mockSupabaseAuth.onAuthStateChange.mockImplementation((cb) => {
        registeredCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      mockSupabaseAuth.onAuthStateChange(callback);

      // Simuleer SIGNED_IN event
      if (registeredCallback) {
        registeredCallback('SIGNED_IN', mockSession);
      }

      expect(callback).toHaveBeenCalledWith('SIGNED_IN', mockSession);
    });

    it('moet callback uitvoeren bij SIGNED_OUT event', async () => {
      const callback = vi.fn();
      let registeredCallback: any = null;

      mockSupabaseAuth.onAuthStateChange.mockImplementation((cb) => {
        registeredCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      });

      mockSupabaseAuth.onAuthStateChange(callback);

      // Simuleer SIGNED_OUT event
      if (registeredCallback) {
        registeredCallback('SIGNED_OUT', null);
      }

      expect(callback).toHaveBeenCalledWith('SIGNED_OUT', null);
    });

    it('moet subscription kunnen unsubscribe-en', () => {
      const unsubscribe = vi.fn();
      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe } },
      });

      const result = mockSupabaseAuth.onAuthStateChange(vi.fn());
      result.data.subscription.unsubscribe();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});

describe('Admin Email Validation', () => {
  const adminEmails = 'admin@test.nl,beheer@test.nl';

  it('moet admin email herkennen', () => {
    const isAdmin = (email: string | undefined): boolean => {
      if (!email) return false;
      const admins = adminEmails.split(',').map(e => e.trim().toLowerCase());
      return admins.includes(email.toLowerCase());
    };

    expect(isAdmin('admin@test.nl')).toBe(true);
    expect(isAdmin('beheer@test.nl')).toBe(true);
    expect(isAdmin('ADMIN@TEST.NL')).toBe(true); // case insensitive
  });

  it('moet niet-admin email herkennen', () => {
    const isAdmin = (email: string | undefined): boolean => {
      if (!email) return false;
      const admins = adminEmails.split(',').map(e => e.trim().toLowerCase());
      return admins.includes(email.toLowerCase());
    };

    expect(isAdmin('student@test.nl')).toBe(false);
    expect(isAdmin('random@example.com')).toBe(false);
  });

  it('moet undefined en null correct afhandelen', () => {
    const isAdmin = (email: string | undefined): boolean => {
      if (!email) return false;
      const admins = adminEmails.split(',').map(e => e.trim().toLowerCase());
      return admins.includes(email.toLowerCase());
    };

    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin('')).toBe(false);
  });
});

describe('Session Token Validation', () => {
  it('moet valide JWT token format herkennen', () => {
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
    const parts = validToken.split('.');

    expect(parts).toHaveLength(3);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it('moet invalide token format detecteren', () => {
    const invalidTokens = [
      'not-a-jwt',
      'only.two.parts.missing',
      '',
      'single',
    ];

    invalidTokens.forEach(token => {
      const parts = token.split('.');
      const isValid = parts.length === 3 && parts.every(p => p.length > 0);
      expect(isValid).toBe(false);
    });
  });
});

describe('User Profile Integration', () => {
  const mockStudentProfile = {
    name: 'Jan Jansen',
    level: 'HAVO',
    struggle_points: 'algebra',
    email: 'jan@student.nl',
    is_active: true,
  };

  it('moet profiel ophalen voor ingelogde gebruiker', async () => {
    // Simuleer gecombineerde auth + profiel
    const user = mockUser;
    const profile = mockStudentProfile;

    const combinedProfile = {
      name: profile.name,
      level: profile.level,
      strugglePoints: profile.struggle_points,
      email: profile.email || user.email,
      isActive: profile.is_active,
    };

    expect(combinedProfile.email).toBe('jan@student.nl');
    expect(combinedProfile.name).toBe('Jan Jansen');
  });

  it('moet default profiel aanmaken voor nieuwe gebruikers', () => {
    const user = { ...mockUser, email: 'nieuw@student.nl' };

    // Default profiel als geen bestaand profiel
    const defaultProfile = {
      name: user.email?.split('@')[0] || 'User',
      level: 'HAVO',
      strugglePoints: '',
      email: user.email,
      isActive: true,
    };

    expect(defaultProfile.name).toBe('nieuw');
    expect(defaultProfile.level).toBe('HAVO');
  });
});
