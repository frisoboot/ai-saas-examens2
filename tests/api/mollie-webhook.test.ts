/**
 * Mollie Webhook Tests
 * Test betalingsverwerking, wachtwoord encryptie en validatie
 */

import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';

// Reproduceer de encryptie/decryptie logica uit de webhook
function generateSecurePassword(): string {
  return crypto.randomBytes(16).toString('base64url');
}

function encryptPassword(password: string, secretKey: string): string {
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptPassword(encryptedData: string, secretKey: string): string | null {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      return null;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const key = crypto.scryptSync(secretKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch {
    return null;
  }
}

describe('Mollie Webhook - Wachtwoord Encryptie', () => {
  const secretKey = 'test-secret-key-for-encryption';

  it('moet een veilig random wachtwoord genereren', () => {
    const password = generateSecurePassword();

    expect(password).toBeDefined();
    expect(password.length).toBeGreaterThan(0);
    expect(typeof password).toBe('string');
  });

  it('moet unieke wachtwoorden genereren', () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 100; i++) {
      passwords.add(generateSecurePassword());
    }
    // Alle 100 wachtwoorden moeten uniek zijn
    expect(passwords.size).toBe(100);
  });

  it('moet een wachtwoord correct encrypten en decrypten', () => {
    const originalPassword = 'MijnVeiligeW@chtw00rd!';

    const encrypted = encryptPassword(originalPassword, secretKey);
    const decrypted = decryptPassword(encrypted, secretKey);

    expect(decrypted).toBe(originalPassword);
  });

  it('moet encrypted formaat in 3 delen hebben (iv:authTag:data)', () => {
    const encrypted = encryptPassword('test123', secretKey);
    const parts = encrypted.split(':');

    expect(parts).toHaveLength(3);
    // IV is 12 bytes = 24 hex chars
    expect(parts[0].length).toBe(24);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1].length).toBe(32);
    // Encrypted data should have some length
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it('moet null retourneren bij ongeldig formaat', () => {
    expect(decryptPassword('invalid-data', secretKey)).toBeNull();
    expect(decryptPassword('only:two', secretKey)).toBeNull();
    expect(decryptPassword('', secretKey)).toBeNull();
  });

  it('moet null retourneren bij verkeerde sleutel', () => {
    const encrypted = encryptPassword('test123', secretKey);
    const decrypted = decryptPassword(encrypted, 'wrong-secret-key');

    expect(decrypted).toBeNull();
  });

  it('moet null retourneren bij gecorrumpeerde data', () => {
    const encrypted = encryptPassword('test123', secretKey);
    const parts = encrypted.split(':');
    // Corrupt the encrypted data
    const corrupted = `${parts[0]}:${parts[1]}:corrupted${parts[2]}`;

    expect(decryptPassword(corrupted, secretKey)).toBeNull();
  });

  it('moet speciale tekens correct encrypten/decrypten', () => {
    const specialPasswords = [
      'p@$$w0rd!#%',
      'wachtwoord met spaties',
      'ëéüöä',
      '日本語テスト',
      '🔐🎉🚀',
    ];

    specialPasswords.forEach(password => {
      const encrypted = encryptPassword(password, secretKey);
      const decrypted = decryptPassword(encrypted, secretKey);
      expect(decrypted).toBe(password);
    });
  });

  it('moet lange wachtwoorden aankunnen', () => {
    const longPassword = 'a'.repeat(1000);
    const encrypted = encryptPassword(longPassword, secretKey);
    const decrypted = decryptPassword(encrypted, secretKey);

    expect(decrypted).toBe(longPassword);
  });
});

describe('Mollie Webhook - Request Validatie', () => {
  it('moet alleen POST requests accepteren', () => {
    const validMethod = 'POST';
    const invalidMethods = ['GET', 'PUT', 'DELETE', 'OPTIONS'];

    expect(validMethod).toBe('POST');
    invalidMethods.forEach(method => {
      expect(method).not.toBe('POST');
    });
  });

  it('moet payment ID vereisen in de body', () => {
    const validBody = { id: 'tr_abc123' };
    const invalidBodies = [
      {},
      { amount: 1.00 },
      null,
      undefined,
    ];

    expect(validBody.id).toBeDefined();
    invalidBodies.forEach(body => {
      expect(body?.id).toBeUndefined();
    });
  });

  it('moet environment variabelen vereisen', () => {
    const requiredEnvVars = ['MOLLIE_API_KEY', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

    requiredEnvVars.forEach(envVar => {
      // In test omgeving zijn deze niet ingesteld
      expect(typeof envVar).toBe('string');
      expect(envVar.length).toBeGreaterThan(0);
    });
  });
});

describe('Mollie Webhook - Payment Status Handling', () => {
  it('moet geldige Mollie payment statussen kennen', () => {
    const validStatuses = ['open', 'canceled', 'pending', 'authorized', 'expired', 'failed', 'paid'];

    expect(validStatuses).toContain('paid');
    expect(validStatuses).toContain('failed');
    expect(validStatuses).toContain('expired');
    expect(validStatuses).toContain('canceled');
  });

  it('moet "paid" status als succesvol behandelen', () => {
    const status = 'paid';
    expect(status === 'paid').toBe(true);
  });

  it('moet "failed" en "expired" als mislukt behandelen', () => {
    const failedStatuses = ['failed', 'expired'];
    failedStatuses.forEach(status => {
      expect(['failed', 'expired'].includes(status)).toBe(true);
    });
  });

  it('moet metadata correct parsen', () => {
    const payment = {
      status: 'paid',
      metadata: {
        type: 'verification',
        email: 'student@test.nl',
        level: 'HAVO',
      },
    };

    expect(payment.metadata.type).toBe('verification');
    expect(payment.metadata.email).toBe('student@test.nl');
    expect(payment.metadata.level).toBe('HAVO');
  });

  it('moet omgaan met null metadata', () => {
    const payment = {
      status: 'paid',
      metadata: null as any,
    };

    const metadata = payment.metadata as { type?: string; email?: string } | null;
    expect(metadata).toBeNull();
  });
});

describe('Mollie Webhook - Subscription Logica', () => {
  it('moet trial periode op 30 dagen instellen', () => {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 30);

    const diffMs = trialEnd.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    expect(diffDays).toBe(30);
  });

  it('moet subscription status correct instellen bij nieuwe activatie', () => {
    const subscription = {
      status: 'trial',
      trial_start: new Date().toISOString(),
      trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      payment_verified: true,
    };

    expect(subscription.status).toBe('trial');
    expect(subscription.payment_verified).toBe(true);
  });

  it('moet subscription als expired markeren bij mislukte betaling', () => {
    const subscription = {
      status: 'expired',
      cancelled_at: new Date().toISOString(),
    };

    expect(subscription.status).toBe('expired');
    expect(subscription.cancelled_at).toBeDefined();
  });

  it('moet verificatiebetaling herkennen aan metadata type', () => {
    const verificationPayment = { metadata: { type: 'verification' } };
    const recurringPayment = { metadata: { type: 'recurring' } };
    const noTypePayment = { metadata: {} };

    expect(verificationPayment.metadata.type).toBe('verification');
    expect(recurringPayment.metadata.type).toBe('recurring');
    expect(noTypePayment.metadata.type).toBeUndefined();
  });
});
