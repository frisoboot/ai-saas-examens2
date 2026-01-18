/**
 * Simple in-memory rate limiter for Vercel serverless functions
 *
 * IMPORTANT: This rate limiter works per serverless instance.
 * For production at scale, consider using Upstash Redis or similar.
 * This provides basic protection against brute force attacks.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (resets when serverless instance recycles)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

interface RateLimitConfig {
  maxRequests: number;  // Maximum requests allowed
  windowMs: number;     // Time window in milliseconds
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;  // Seconds until rate limit resets
}

/**
 * Check if a request is rate limited
 * @param key - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanupOldEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No existing entry or window has expired
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    };
  }

  // Within window, check count
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

/**
 * Get client IP from Vercel request headers
 */
export function getClientIP(req: { headers: Record<string, string | string[] | undefined> }): string {
  // Vercel provides the real IP in x-forwarded-for or x-real-ip
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];

  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first IP
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ip?.trim() || 'unknown';
  }

  if (realIp) {
    const ip = Array.isArray(realIp) ? realIp[0] : realIp;
    return ip?.trim() || 'unknown';
  }

  return 'unknown';
}

// Pre-configured rate limiters for common use cases
export const rateLimits = {
  // Admin login: strict limit to prevent brute force
  adminLogin: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000  // 5 attempts per 15 minutes
  },
  // Student registration: moderate limit
  registration: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000  // 10 per hour
  },
  // AI API calls: prevent abuse
  aiApi: {
    maxRequests: 60,
    windowMs: 60 * 1000  // 60 per minute
  },
  // General API: generous limit
  general: {
    maxRequests: 100,
    windowMs: 60 * 1000  // 100 per minute
  }
};
