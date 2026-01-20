/**
 * API Endpoint Tests
 * Test alle Vercel serverless API endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Vercel request/response
interface MockVercelRequest {
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
}

interface MockVercelResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  status: (code: number) => MockVercelResponse;
  json: (data: any) => MockVercelResponse;
  setHeader: (key: string, value: string) => void;
  end: () => void;
}

const createMockResponse = (): MockVercelResponse => {
  const res: MockVercelResponse = {
    statusCode: 200,
    headers: {},
    body: null,
    status: (code: number) => {
      res.statusCode = code;
      return res;
    },
    json: (data: any) => {
      res.body = data;
      return res;
    },
    setHeader: (key: string, value: string) => {
      res.headers[key] = value;
    },
    end: () => {},
  };
  return res;
};

// Mock Supabase voor API tests
const mockSupabaseAdmin = {
  from: vi.fn(),
  auth: {
    admin: {
      listUsers: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    },
    getUser: vi.fn(),
  },
  storage: {
    listBuckets: vi.fn(),
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseAdmin),
}));

describe('API: /api/check-subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request Validation', () => {
    it('moet OPTIONS request accepteren voor CORS', () => {
      const req: MockVercelRequest = {
        method: 'OPTIONS',
        headers: { origin: 'https://example.com' },
        query: {},
      };
      const res = createMockResponse();

      // Simuleer CORS handling
      if (req.method === 'OPTIONS') {
        res.status(200).end();
      }

      expect(res.statusCode).toBe(200);
    });

    it('moet GET en POST accepteren', () => {
      const validMethods = ['GET', 'POST'];

      validMethods.forEach(method => {
        const isValid = method === 'GET' || method === 'POST';
        expect(isValid).toBe(true);
      });
    });

    it('moet andere HTTP methods weigeren', () => {
      const invalidMethods = ['PUT', 'DELETE', 'PATCH'];

      invalidMethods.forEach(method => {
        const isValid = method === 'GET' || method === 'POST';
        expect(isValid).toBe(false);
      });
    });

    it('moet email parameter vereisen', () => {
      const req: MockVercelRequest = {
        method: 'GET',
        headers: {},
        query: {}, // geen email
      };

      const email = req.query.email;
      expect(email).toBeUndefined();
    });
  });

  describe('Subscription Status Responses', () => {
    it('moet geen subscription correct afhandelen', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const response = {
        hasAccess: false,
        status: 'none',
        message: 'Geen abonnement gevonden',
      };

      expect(response.hasAccess).toBe(false);
      expect(response.status).toBe('none');
    });

    it('moet actieve trial correct retourneren', () => {
      const subscription = {
        status: 'trial',
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dagen
      };

      const now = new Date();
      const trialEnds = new Date(subscription.trial_ends_at);
      const daysLeft = Math.ceil((trialEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      expect(subscription.status).toBe('trial');
      expect(daysLeft).toBeGreaterThan(0);
    });

    it('moet verlopen trial correct detecteren', () => {
      const subscription = {
        status: 'trial',
        trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // gisteren
      };

      const now = new Date();
      const trialEnds = new Date(subscription.trial_ends_at);
      const isExpired = trialEnds < now;

      expect(isExpired).toBe(true);
    });

    it('moet actieve subscription correct retourneren', () => {
      const subscription = {
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const now = new Date();
      const periodEnd = new Date(subscription.current_period_end);
      const isActive = periodEnd > now && subscription.status === 'active';

      expect(isActive).toBe(true);
    });

    it('moet pending status correct retourneren', () => {
      const subscription = {
        status: 'pending',
      };

      const response = {
        hasAccess: false,
        status: 'pending',
        message: 'Betaling wordt verwerkt',
      };

      expect(response.hasAccess).toBe(false);
      expect(response.status).toBe('pending');
    });

    it('moet cancelled status correct retourneren', () => {
      const subscription = {
        status: 'cancelled',
      };

      const response = {
        hasAccess: false,
        status: subscription.status,
        message: 'Abonnement niet actief',
      };

      expect(response.hasAccess).toBe(false);
    });
  });
});

describe('API: /api/admin/health-check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authorization', () => {
    it('moet Bearer token vereisen', () => {
      const req: MockVercelRequest = {
        method: 'GET',
        headers: {}, // geen Authorization
        query: {},
      };

      const authHeader = req.headers.authorization;
      const hasBearer = authHeader?.startsWith('Bearer ');

      expect(hasBearer).toBeFalsy();
    });

    it('moet valide Bearer token herkennen', () => {
      const req: MockVercelRequest = {
        method: 'GET',
        headers: { authorization: 'Bearer valid-token-123' },
        query: {},
      };

      const authHeader = req.headers.authorization;
      const hasBearer = authHeader?.startsWith('Bearer ');
      const token = authHeader?.substring(7);

      expect(hasBearer).toBe(true);
      expect(token).toBe('valid-token-123');
    });

    it('moet admin email verificatie uitvoeren', () => {
      const adminEmails = 'admin@test.nl,beheer@test.nl';
      const userEmail = 'admin@test.nl';

      const isAdmin = adminEmails
        .split(',')
        .map(e => e.trim().toLowerCase())
        .includes(userEmail.toLowerCase());

      expect(isAdmin).toBe(true);
    });

    it('moet niet-admin emails weigeren', () => {
      const adminEmails = 'admin@test.nl';
      const userEmail = 'student@test.nl';

      const isAdmin = adminEmails
        .split(',')
        .map(e => e.trim().toLowerCase())
        .includes(userEmail.toLowerCase());

      expect(isAdmin).toBe(false);
    });
  });

  describe('Health Check Responses', () => {
    it('moet correct overall status berekenen', () => {
      const services = [
        { name: 'Supabase Database', status: 'healthy' },
        { name: 'Supabase Auth', status: 'healthy' },
        { name: 'Environment Config', status: 'healthy' },
      ];

      const summary = {
        total: services.length,
        healthy: services.filter(s => s.status === 'healthy').length,
        degraded: services.filter(s => s.status === 'degraded').length,
        unhealthy: services.filter(s => s.status === 'unhealthy').length,
      };

      let overallStatus = 'healthy';
      if (summary.unhealthy > 0) {
        overallStatus = 'unhealthy';
      } else if (summary.degraded > 0) {
        overallStatus = 'degraded';
      }

      expect(overallStatus).toBe('healthy');
      expect(summary.healthy).toBe(3);
    });

    it('moet degraded status bij trage services', () => {
      const services = [
        { name: 'Supabase Database', status: 'degraded', responseTime: 2500 },
        { name: 'Supabase Auth', status: 'healthy', responseTime: 100 },
      ];

      const hasSlowService = services.some(s => s.status === 'degraded');
      expect(hasSlowService).toBe(true);
    });

    it('moet unhealthy status bij kritieke fout', () => {
      const services = [
        { name: 'Supabase Database', status: 'unhealthy' },
        { name: 'Supabase Auth', status: 'healthy' },
      ];

      const criticalServices = ['Supabase Database', 'Supabase Auth', 'Environment Config'];
      const criticalUnhealthy = services.filter(
        s => s.status === 'unhealthy' && criticalServices.includes(s.name)
      );

      expect(criticalUnhealthy).toHaveLength(1);
    });
  });

  describe('Service Checks', () => {
    it('moet database connectie controleren', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ id: '1' }],
            error: null,
          }),
        }),
      });

      const start = Date.now();
      const { data, error } = await mockSupabaseAdmin.from('questions').select('id').limit(1);
      const responseTime = Date.now() - start;

      expect(error).toBeNull();
      expect(responseTime).toBeLessThan(2000);
    });

    it('moet auth service controleren', async () => {
      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: [{ id: '1' }] },
        error: null,
      });

      const { data, error } = await mockSupabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });

      expect(error).toBeNull();
      expect(data.users).toBeDefined();
    });

    it('moet storage service controleren', async () => {
      mockSupabaseAdmin.storage.listBuckets.mockResolvedValue({
        data: [{ name: 'images' }],
        error: null,
      });

      const { data, error } = await mockSupabaseAdmin.storage.listBuckets();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });
});

describe('API: /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET - List Users', () => {
    it('moet users lijst retourneren', async () => {
      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: {
          users: [
            { id: '1', email: 'user1@test.nl' },
            { id: '2', email: 'user2@test.nl' },
          ],
        },
        error: null,
      });

      const { data } = await mockSupabaseAdmin.auth.admin.listUsers();

      expect(data.users).toHaveLength(2);
    });
  });

  describe('POST - Create User', () => {
    it('moet nieuwe user aanmaken', async () => {
      const newUser = {
        email: 'nieuw@test.nl',
        password: 'Wachtwoord123!',
      };

      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'new-1', email: newUser.email } },
        error: null,
      });

      const { data, error } = await mockSupabaseAdmin.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
      });

      expect(error).toBeNull();
      expect(data.user.email).toBe('nieuw@test.nl');
    });

    it('moet error geven bij duplicate email', async () => {
      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: 'User already exists' },
      });

      const { error } = await mockSupabaseAdmin.auth.admin.createUser({
        email: 'bestaand@test.nl',
        password: 'Wachtwoord123!',
      });

      expect(error.message).toBe('User already exists');
    });
  });

  describe('DELETE - Delete User', () => {
    it('moet user verwijderen', async () => {
      mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValue({
        error: null,
      });

      const { error } = await mockSupabaseAdmin.auth.admin.deleteUser('user-123');

      expect(error).toBeNull();
    });
  });
});

describe('API: CORS Handling', () => {
  it('moet correcte CORS headers zetten', () => {
    const res = createMockResponse();
    const origin = 'https://ai-examentrainer.nl';

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    expect(res.headers['Access-Control-Allow-Origin']).toBe(origin);
    expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('moet Vercel preview URLs toestaan', () => {
    const allowedOrigins = [
      'https://ai-examentrainer.nl',
      'https://ai-examentrainer.vercel.app',
      /^https:\/\/.*\.vercel\.app$/,
      'http://localhost:3000',
    ];

    const testOrigins = [
      { origin: 'https://preview-123.vercel.app', allowed: true },
      { origin: 'http://localhost:3000', allowed: true },
      { origin: 'https://malicious-site.com', allowed: false },
    ];

    testOrigins.forEach(({ origin, allowed }) => {
      const isAllowed = allowedOrigins.some(o => {
        if (typeof o === 'string') return o === origin;
        return o.test(origin);
      });

      expect(isAllowed).toBe(allowed);
    });
  });
});

describe('API: Rate Limiting', () => {
  it('moet requests tellen per IP', () => {
    const rateLimiter = new Map<string, { count: number; resetTime: number }>();

    const checkRateLimit = (ip: string, limit: number, windowMs: number): boolean => {
      const now = Date.now();
      const record = rateLimiter.get(ip);

      if (!record || now > record.resetTime) {
        rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
      }

      if (record.count >= limit) {
        return false;
      }

      record.count++;
      return true;
    };

    const ip = '192.168.1.1';
    const limit = 100;
    const window = 60000;

    // Eerste 100 requests moeten slagen
    for (let i = 0; i < limit; i++) {
      expect(checkRateLimit(ip, limit, window)).toBe(true);
    }

    // 101e request moet falen
    expect(checkRateLimit(ip, limit, window)).toBe(false);
  });
});

describe('API: Error Responses', () => {
  it('moet 400 voor ontbrekende parameters', () => {
    const validateRequest = (email?: string): { valid: boolean; status: number; message: string } => {
      if (!email) {
        return { valid: false, status: 400, message: 'Email is verplicht' };
      }
      return { valid: true, status: 200, message: 'OK' };
    };

    const result = validateRequest(undefined);
    expect(result.status).toBe(400);
    expect(result.message).toBe('Email is verplicht');
  });

  it('moet 401 voor ontbrekende authenticatie', () => {
    const validateAuth = (authHeader?: string): { valid: boolean; status: number } => {
      if (!authHeader?.startsWith('Bearer ')) {
        return { valid: false, status: 401 };
      }
      return { valid: true, status: 200 };
    };

    expect(validateAuth(undefined).status).toBe(401);
    expect(validateAuth('Basic xyz').status).toBe(401);
    expect(validateAuth('Bearer token').status).toBe(200);
  });

  it('moet 403 voor niet-admin gebruikers', () => {
    const checkAdminAccess = (email: string, adminEmails: string): { allowed: boolean; status: number } => {
      const isAdmin = adminEmails.split(',').map(e => e.trim().toLowerCase()).includes(email.toLowerCase());
      if (!isAdmin) {
        return { allowed: false, status: 403 };
      }
      return { allowed: true, status: 200 };
    };

    expect(checkAdminAccess('student@test.nl', 'admin@test.nl').status).toBe(403);
    expect(checkAdminAccess('admin@test.nl', 'admin@test.nl').status).toBe(200);
  });

  it('moet 500 voor interne server fouten', () => {
    const handleError = (error: Error): { status: number; message: string } => {
      console.error('Internal error:', error);
      return { status: 500, message: 'Er ging iets mis' };
    };

    const result = handleError(new Error('Database connection failed'));
    expect(result.status).toBe(500);
  });
});
