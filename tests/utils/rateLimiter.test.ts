/**
 * Rate Limiter Tests
 * Test rate limiting logica, IP extractie en preconfigureerde limieten
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, getClientIP, rateLimits } from '../../api/utils/rateLimiter';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moet eerste request toestaan', () => {
    const result = checkRateLimit('test-first-request', {
      maxRequests: 5,
      windowMs: 60000,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('moet meerdere requests toestaan binnen de limiet', () => {
    const key = 'test-multiple-' + Date.now();
    const config = { maxRequests: 3, windowMs: 60000 };

    const r1 = checkRateLimit(key, config);
    const r2 = checkRateLimit(key, config);
    const r3 = checkRateLimit(key, config);

    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('moet requests blokkeren na het overschrijden van de limiet', () => {
    const key = 'test-block-' + Date.now();
    const config = { maxRequests: 2, windowMs: 60000 };

    checkRateLimit(key, config); // 1
    checkRateLimit(key, config); // 2

    const blocked = checkRateLimit(key, config); // 3 - should be blocked

    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeDefined();
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('moet retryAfter in seconden retourneren', () => {
    const key = 'test-retry-' + Date.now();
    const config = { maxRequests: 1, windowMs: 30000 }; // 30 sec window

    checkRateLimit(key, config);
    const blocked = checkRateLimit(key, config);

    expect(blocked.retryAfter).toBeDefined();
    expect(blocked.retryAfter).toBeLessThanOrEqual(30);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('moet verschillende keys onafhankelijk van elkaar bijhouden', () => {
    const config = { maxRequests: 1, windowMs: 60000 };

    const key1 = 'user-a-' + Date.now();
    const key2 = 'user-b-' + Date.now();

    checkRateLimit(key1, config);
    const r1 = checkRateLimit(key1, config);
    const r2 = checkRateLimit(key2, config);

    expect(r1.allowed).toBe(false); // key1 is over limiet
    expect(r2.allowed).toBe(true);  // key2 is nog niet over limiet
  });

  it('moet resetTime correct instellen', () => {
    const key = 'test-reset-' + Date.now();
    const windowMs = 60000;
    const now = Date.now();

    const result = checkRateLimit(key, { maxRequests: 5, windowMs });

    expect(result.resetTime).toBeGreaterThanOrEqual(now + windowMs - 100);
    expect(result.resetTime).toBeLessThanOrEqual(now + windowMs + 100);
  });
});

describe('getClientIP', () => {
  it('moet IP ophalen uit x-forwarded-for header', () => {
    const req = {
      headers: {
        'x-forwarded-for': '1.2.3.4',
      },
    };

    expect(getClientIP(req)).toBe('1.2.3.4');
  });

  it('moet eerste IP pakken bij meerdere IPs in x-forwarded-for', () => {
    const req = {
      headers: {
        'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12',
      },
    };

    expect(getClientIP(req)).toBe('1.2.3.4');
  });

  it('moet IP ophalen uit x-real-ip header als fallback', () => {
    const req = {
      headers: {
        'x-real-ip': '10.0.0.1',
      },
    };

    expect(getClientIP(req)).toBe('10.0.0.1');
  });

  it('moet x-forwarded-for prioriteit geven boven x-real-ip', () => {
    const req = {
      headers: {
        'x-forwarded-for': '1.2.3.4',
        'x-real-ip': '10.0.0.1',
      },
    };

    expect(getClientIP(req)).toBe('1.2.3.4');
  });

  it('moet "unknown" retourneren als er geen IP headers zijn', () => {
    const req = {
      headers: {},
    };

    expect(getClientIP(req)).toBe('unknown');
  });

  it('moet array-format x-forwarded-for afhandelen', () => {
    const req = {
      headers: {
        'x-forwarded-for': ['1.2.3.4', '5.6.7.8'],
      },
    };

    expect(getClientIP(req)).toBe('1.2.3.4');
  });

  it('moet array-format x-real-ip afhandelen', () => {
    const req = {
      headers: {
        'x-real-ip': ['10.0.0.1'],
      },
    };

    expect(getClientIP(req)).toBe('10.0.0.1');
  });
});

describe('Preconfigured Rate Limits', () => {
  it('moet admin login limiet hebben van 5 per 15 minuten', () => {
    expect(rateLimits.adminLogin.maxRequests).toBe(5);
    expect(rateLimits.adminLogin.windowMs).toBe(15 * 60 * 1000);
  });

  it('moet registratie limiet hebben van 10 per uur', () => {
    expect(rateLimits.registration.maxRequests).toBe(10);
    expect(rateLimits.registration.windowMs).toBe(60 * 60 * 1000);
  });

  it('moet AI API limiet hebben van 60 per minuut', () => {
    expect(rateLimits.aiApi.maxRequests).toBe(60);
    expect(rateLimits.aiApi.windowMs).toBe(60 * 1000);
  });

  it('moet general API limiet hebben van 100 per minuut', () => {
    expect(rateLimits.general.maxRequests).toBe(100);
    expect(rateLimits.general.windowMs).toBe(60 * 1000);
  });

  it('moet strengere limieten hebben voor admin dan voor general', () => {
    expect(rateLimits.adminLogin.maxRequests).toBeLessThan(rateLimits.general.maxRequests);
  });
});
