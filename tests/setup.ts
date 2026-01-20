/**
 * Vitest Test Setup
 * Configuratie voor alle tests
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock import.meta.env for tests
vi.stubGlobal('import.meta', {
  env: {
    VITE_SUPABASE_URL: 'https://test-project.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key-123',
    VITE_ADMIN_EMAILS: 'admin@test.nl,beheer@test.nl',
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock console methods to reduce noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
