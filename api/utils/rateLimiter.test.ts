import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, getClientIP, rateLimits } from './rateLimiter';

describe('checkRateLimit', () => {
  beforeEach(() => {
    // Reset time mocks
    vi.useFakeTimers();
  });

  it('should allow first request and return correct remaining count', () => {
    const config = { maxRequests: 5, windowMs: 60000 };
    const result = checkRateLimit('user1', config);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.retryAfter).toBeUndefined();
  });

  it('should track multiple requests within window', () => {
    const config = { maxRequests: 3, windowMs: 60000 };

    const result1 = checkRateLimit('user2', config);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = checkRateLimit('user2', config);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = checkRateLimit('user2', config);
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('should block requests after limit is reached', () => {
    const config = { maxRequests: 2, windowMs: 60000 };

    checkRateLimit('user3', config);
    checkRateLimit('user3', config);

    const result = checkRateLimit('user3', config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should reset count after window expires', () => {
    const config = { maxRequests: 2, windowMs: 60000 };

    // First requests
    checkRateLimit('user4', config);
    checkRateLimit('user4', config);

    // Advance time beyond window
    vi.advanceTimersByTime(61000);

    // Should allow new requests
    const result = checkRateLimit('user4', config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should handle multiple different keys independently', () => {
    const config = { maxRequests: 2, windowMs: 60000 };

    const result1 = checkRateLimit('user5', config);
    const result2 = checkRateLimit('user6', config);

    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(1);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);
  });

  it('should calculate correct retryAfter in seconds', () => {
    const config = { maxRequests: 1, windowMs: 60000 };

    checkRateLimit('user7', config);

    // Try again immediately
    const result = checkRateLimit('user7', config);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeLessThanOrEqual(60);
    expect(result.retryAfter).toBeGreaterThan(59);
  });

  it('should cleanup old entries after cleanup interval', () => {
    const config = { maxRequests: 5, windowMs: 1000 };

    // Create an entry
    checkRateLimit('user8', config);

    // Advance time past window but not cleanup interval
    vi.advanceTimersByTime(2000);

    // This should reset the entry (window expired)
    const result1 = checkRateLimit('user8', config);
    expect(result1.remaining).toBe(4);

    // Advance time past cleanup interval
    vi.advanceTimersByTime(60000);

    // Next check should trigger cleanup
    const result2 = checkRateLimit('user9', config);
    expect(result2.allowed).toBe(true);
  });
});

describe('getClientIP', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const req = {
      headers: {
        'x-forwarded-for': '192.168.1.1'
      }
    };

    expect(getClientIP(req)).toBe('192.168.1.1');
  });

  it('should extract first IP from comma-separated x-forwarded-for', () => {
    const req = {
      headers: {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1'
      }
    };

    expect(getClientIP(req)).toBe('192.168.1.1');
  });

  it('should handle x-forwarded-for as array', () => {
    const req = {
      headers: {
        'x-forwarded-for': ['192.168.1.1', '10.0.0.1']
      }
    };

    expect(getClientIP(req)).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip header if x-forwarded-for is missing', () => {
    const req = {
      headers: {
        'x-real-ip': '192.168.1.5'
      }
    };

    expect(getClientIP(req)).toBe('192.168.1.5');
  });

  it('should handle x-real-ip as array', () => {
    const req = {
      headers: {
        'x-real-ip': ['192.168.1.5']
      }
    };

    expect(getClientIP(req)).toBe('192.168.1.5');
  });

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const req = {
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.5'
      }
    };

    expect(getClientIP(req)).toBe('192.168.1.1');
  });

  it('should return "unknown" when no IP headers present', () => {
    const req = {
      headers: {}
    };

    expect(getClientIP(req)).toBe('unknown');
  });

  it('should trim whitespace from IP addresses', () => {
    const req = {
      headers: {
        'x-forwarded-for': '  192.168.1.1  '
      }
    };

    expect(getClientIP(req)).toBe('192.168.1.1');
  });
});

describe('rateLimits presets', () => {
  it('should have admin login limits configured', () => {
    expect(rateLimits.adminLogin.maxRequests).toBe(5);
    expect(rateLimits.adminLogin.windowMs).toBe(15 * 60 * 1000);
  });

  it('should have registration limits configured', () => {
    expect(rateLimits.registration.maxRequests).toBe(10);
    expect(rateLimits.registration.windowMs).toBe(60 * 60 * 1000);
  });

  it('should have AI API limits configured', () => {
    expect(rateLimits.aiApi.maxRequests).toBe(60);
    expect(rateLimits.aiApi.windowMs).toBe(60 * 1000);
  });

  it('should have general API limits configured', () => {
    expect(rateLimits.general.maxRequests).toBe(100);
    expect(rateLimits.general.windowMs).toBe(60 * 1000);
  });
});
