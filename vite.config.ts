/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // SECURITY: Gemini API key is NOT exposed to client - handled server-side in /api/gemini
      // Only public keys are exposed (Supabase anon key is designed to be public, protected by RLS)
      // Only define values that are actually set: defining `undefined` leaks the
      // literal string "undefined" into process.env during tests.
      define: Object.fromEntries(
        (['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const)
          .filter((key) => env[key] !== undefined)
          .map((key) => [`import.meta.env.${key}`, JSON.stringify(env[key])])
      ),
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
          include: ['services/**/*.ts', 'api/**/*.ts'],
        },
      },
    };
});
