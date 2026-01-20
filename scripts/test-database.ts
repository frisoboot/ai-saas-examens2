#!/usr/bin/env npx tsx
/**
 * Database Connection Test Script
 *
 * Test de Supabase database connectie en alle tabellen.
 *
 * Gebruik: npx tsx scripts/test-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Laad .env.local of .env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

// Colors voor terminal output
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const CHECK = colors.green('✓');
const CROSS = colors.red('✗');
const WARN = colors.yellow('⚠');

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  duration?: number;
  details?: any;
}

async function runTests(): Promise<void> {
  console.log('\n' + colors.bold('═══════════════════════════════════════════════════'));
  console.log(colors.bold('       DATABASE CONNECTION TEST'));
  console.log(colors.bold('═══════════════════════════════════════════════════') + '\n');

  const results: TestResult[] = [];

  // Test 1: Environment Variables
  console.log(colors.blue('1. Checking environment variables...'));
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    results.push({
      name: 'Environment Variables',
      status: 'fail',
      message: 'VITE_SUPABASE_URL of VITE_SUPABASE_ANON_KEY ontbreekt in .env.local'
    });
    console.log(`   ${CROSS} Missing: VITE_SUPABASE_URL of VITE_SUPABASE_ANON_KEY\n`);
    printSummary(results);
    return;
  }

  results.push({
    name: 'Environment Variables',
    status: 'pass',
    message: 'Alle vereiste variabelen aanwezig',
    details: {
      url: supabaseUrl.substring(0, 30) + '...',
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey
    }
  });
  console.log(`   ${CHECK} VITE_SUPABASE_URL: ${supabaseUrl.substring(0, 40)}...`);
  console.log(`   ${CHECK} VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`);
  console.log(`   ${supabaseServiceKey ? CHECK : WARN} SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'aanwezig' : 'ontbreekt (alleen nodig voor admin API)'}\n`);

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    : null;

  // Test 2: Database Connection
  console.log(colors.blue('2. Testing database connection...'));
  const start = Date.now();
  try {
    const { error } = await supabase.from('questions').select('id').limit(1);
    const duration = Date.now() - start;

    if (error) {
      results.push({
        name: 'Database Connection',
        status: 'fail',
        message: error.message,
        duration
      });
      console.log(`   ${CROSS} Connection failed: ${error.message}\n`);
    } else {
      results.push({
        name: 'Database Connection',
        status: 'pass',
        message: 'Verbinding succesvol',
        duration
      });
      console.log(`   ${CHECK} Connected in ${duration}ms\n`);
    }
  } catch (err: any) {
    results.push({
      name: 'Database Connection',
      status: 'fail',
      message: err.message
    });
    console.log(`   ${CROSS} Error: ${err.message}\n`);
  }

  // Test 3: Questions Table
  console.log(colors.blue('3. Testing questions table...'));
  try {
    const start = Date.now();
    const { data, error, count } = await supabase
      .from('questions')
      .select('id, subject, level, type', { count: 'exact' })
      .limit(5);
    const duration = Date.now() - start;

    if (error) {
      results.push({
        name: 'Questions Table',
        status: 'fail',
        message: error.message,
        duration
      });
      console.log(`   ${CROSS} Query failed: ${error.message}\n`);
    } else {
      const subjects = [...new Set(data?.map(q => q.subject) || [])];
      results.push({
        name: 'Questions Table',
        status: 'pass',
        message: `${count || 0} vragen gevonden`,
        duration,
        details: { count, subjects: subjects.slice(0, 5) }
      });
      console.log(`   ${CHECK} ${count || 0} vragen in database (${duration}ms)`);
      if (subjects.length > 0) {
        console.log(`   ${CHECK} Vakken: ${subjects.join(', ')}`);
      }
      console.log('');
    }
  } catch (err: any) {
    results.push({
      name: 'Questions Table',
      status: 'fail',
      message: err.message
    });
    console.log(`   ${CROSS} Error: ${err.message}\n`);
  }

  // Test 4: Student Profiles Table
  console.log(colors.blue('4. Testing student_profiles table...'));
  try {
    const start = Date.now();
    const { data, error, count } = await supabase
      .from('student_profiles')
      .select('email, name, level', { count: 'exact' })
      .limit(5);
    const duration = Date.now() - start;

    if (error) {
      // RLS might block this - that's OK
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        results.push({
          name: 'Student Profiles Table',
          status: 'warn',
          message: 'RLS actief - login vereist voor data',
          duration
        });
        console.log(`   ${WARN} RLS actief - kan profielen niet lezen zonder login (dit is correct!)\n`);
      } else {
        results.push({
          name: 'Student Profiles Table',
          status: 'fail',
          message: error.message,
          duration
        });
        console.log(`   ${CROSS} Query failed: ${error.message}\n`);
      }
    } else {
      results.push({
        name: 'Student Profiles Table',
        status: 'pass',
        message: `${count || 0} profielen gevonden`,
        duration,
        details: { count }
      });
      console.log(`   ${CHECK} ${count || 0} student profielen (${duration}ms)\n`);
    }
  } catch (err: any) {
    results.push({
      name: 'Student Profiles Table',
      status: 'fail',
      message: err.message
    });
    console.log(`   ${CROSS} Error: ${err.message}\n`);
  }

  // Test 5: Exam Results Table
  console.log(colors.blue('5. Testing exam_results table...'));
  try {
    const start = Date.now();
    const { data, error, count } = await supabase
      .from('exam_results')
      .select('id, subject, score', { count: 'exact' })
      .limit(5);
    const duration = Date.now() - start;

    if (error) {
      if (error.code === 'PGRST301' || error.message.includes('JWT')) {
        results.push({
          name: 'Exam Results Table',
          status: 'warn',
          message: 'RLS actief - login vereist voor data',
          duration
        });
        console.log(`   ${WARN} RLS actief - kan resultaten niet lezen zonder login (dit is correct!)\n`);
      } else {
        results.push({
          name: 'Exam Results Table',
          status: 'fail',
          message: error.message,
          duration
        });
        console.log(`   ${CROSS} Query failed: ${error.message}\n`);
      }
    } else {
      results.push({
        name: 'Exam Results Table',
        status: 'pass',
        message: `${count || 0} resultaten gevonden`,
        duration,
        details: { count }
      });
      console.log(`   ${CHECK} ${count || 0} exam resultaten (${duration}ms)\n`);
    }
  } catch (err: any) {
    results.push({
      name: 'Exam Results Table',
      status: 'fail',
      message: err.message
    });
    console.log(`   ${CROSS} Error: ${err.message}\n`);
  }

  // Test 6: Auth Admin (if service key available)
  if (supabaseAdmin) {
    console.log(colors.blue('6. Testing Supabase Auth (admin)...'));
    try {
      const start = Date.now();
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 10
      });
      const duration = Date.now() - start;

      if (error) {
        results.push({
          name: 'Supabase Auth Admin',
          status: 'fail',
          message: error.message,
          duration
        });
        console.log(`   ${CROSS} Auth check failed: ${error.message}\n`);
      } else {
        const userCount = data?.users?.length || 0;
        results.push({
          name: 'Supabase Auth Admin',
          status: 'pass',
          message: `${userCount} gebruikers gevonden`,
          duration,
          details: { userCount }
        });
        console.log(`   ${CHECK} ${userCount} geregistreerde gebruikers (${duration}ms)\n`);
      }
    } catch (err: any) {
      results.push({
        name: 'Supabase Auth Admin',
        status: 'fail',
        message: err.message
      });
      console.log(`   ${CROSS} Error: ${err.message}\n`);
    }
  } else {
    console.log(colors.blue('6. Skipping Auth Admin test (no service key)...\n'));
  }

  // Test 7: Storage
  if (supabaseAdmin) {
    console.log(colors.blue('7. Testing Supabase Storage...'));
    try {
      const start = Date.now();
      const { data, error } = await supabaseAdmin.storage.listBuckets();
      const duration = Date.now() - start;

      if (error) {
        results.push({
          name: 'Supabase Storage',
          status: 'fail',
          message: error.message,
          duration
        });
        console.log(`   ${CROSS} Storage check failed: ${error.message}\n`);
      } else {
        const buckets = data?.map(b => b.name) || [];
        results.push({
          name: 'Supabase Storage',
          status: 'pass',
          message: `${buckets.length} buckets gevonden`,
          duration,
          details: { buckets }
        });
        console.log(`   ${CHECK} ${buckets.length} storage buckets: ${buckets.join(', ') || 'geen'} (${duration}ms)\n`);
      }
    } catch (err: any) {
      results.push({
        name: 'Supabase Storage',
        status: 'fail',
        message: err.message
      });
      console.log(`   ${CROSS} Error: ${err.message}\n`);
    }
  }

  printSummary(results);
}

function printSummary(results: TestResult[]): void {
  console.log(colors.bold('═══════════════════════════════════════════════════'));
  console.log(colors.bold('                    SAMENVATTING'));
  console.log(colors.bold('═══════════════════════════════════════════════════') + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  results.forEach(r => {
    const icon = r.status === 'pass' ? CHECK : r.status === 'fail' ? CROSS : WARN;
    const duration = r.duration ? ` (${r.duration}ms)` : '';
    console.log(`   ${icon} ${r.name}: ${r.message}${duration}`);
  });

  console.log('');
  console.log(colors.bold('───────────────────────────────────────────────────'));

  if (failed === 0) {
    console.log(`   ${colors.green(colors.bold('ALLE TESTS GESLAAGD!'))} ${passed} passed, ${warned} warnings`);
  } else {
    console.log(`   ${colors.red(colors.bold('TESTS GEFAALD!'))} ${passed} passed, ${failed} failed, ${warned} warnings`);
  }

  console.log(colors.bold('═══════════════════════════════════════════════════') + '\n');
}

// Run tests
runTests().catch(console.error);
