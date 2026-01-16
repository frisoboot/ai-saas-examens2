/**
 * Security utilities for API endpoints
 *
 * This module provides security helpers for:
 * - Timing-safe string comparison (prevents timing attacks)
 * - Password strength validation
 * - Input sanitization
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Timing-safe string comparison to prevent timing attacks
 *
 * Regular string comparison (===) can leak information about the string
 * through the time it takes to compare. This function uses constant-time
 * comparison to prevent such attacks.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  // Use HMAC to ensure both strings are the same length for timingSafeEqual
  const key = 'secure-compare-key';
  const hmacA = createHmac('sha256', key).update(a).digest();
  const hmacB = createHmac('sha256', key).update(b).digest();

  return timingSafeEqual(hmacA, hmacB);
}

/**
 * Password strength validation
 *
 * Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * @param password - Password to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Wachtwoord is verplicht' };
  }

  if (password.length < 12) {
    return { isValid: false, error: 'Wachtwoord moet minimaal 12 karakters zijn' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Wachtwoord mag maximaal 128 karakters zijn' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Wachtwoord moet minimaal 1 hoofdletter bevatten' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Wachtwoord moet minimaal 1 kleine letter bevatten' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Wachtwoord moet minimaal 1 cijfer bevatten' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Wachtwoord moet minimaal 1 speciaal karakter bevatten (!@#$%^&*()_+-=[]{};\':"|,.<>/?)' };
  }

  // Check for common weak patterns
  const weakPatterns = [
    /^(.)\1+$/, // All same character
    /^(012|123|234|345|456|567|678|789|890)+$/, // Sequential numbers
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i, // Sequential letters
    /password/i,
    /wachtwoord/i,
    /qwerty/i,
    /admin/i,
  ];

  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      return { isValid: false, error: 'Wachtwoord bevat een zwak patroon. Kies een sterker wachtwoord.' };
    }
  }

  return { isValid: true };
}

/**
 * Simpler password validation for students (less strict)
 *
 * Requirements:
 * - Minimum 10 characters
 * - At least one letter
 * - At least one number
 *
 * @param password - Password to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateStudentPassword(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Wachtwoord is verplicht' };
  }

  if (password.length < 10) {
    return { isValid: false, error: 'Wachtwoord moet minimaal 10 karakters zijn' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Wachtwoord mag maximaal 128 karakters zijn' };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return { isValid: false, error: 'Wachtwoord moet minimaal 1 letter bevatten' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Wachtwoord moet minimaal 1 cijfer bevatten' };
  }

  return { isValid: true };
}

/**
 * Sanitize text input to prevent XSS and injection attacks
 * Removes HTML tags and dangerous characters
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script-like content
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    // Escape special characters that could be used in injection
    .replace(/[<>"'&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[char] || char;
    })
    .trim();
}

/**
 * Generate a cryptographically secure random string
 *
 * @param length - Length of the string to generate
 * @returns Random string
 */
export function generateSecureToken(length: number = 32): string {
  const { randomBytes } = require('crypto');
  return randomBytes(length).toString('hex');
}
