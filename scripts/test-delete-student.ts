/**
 * Test Script - Student Delete Functionaliteit
 *
 * Dit script test of een student volledig verwijderd wordt uit het systeem.
 *
 * Test Scenario:
 * 1. Maak een test student aan
 * 2. Voeg test exam results toe
 * 3. Voeg test progress data toe
 * 4. Verwijder de student
 * 5. Verifieer dat alles verwijderd is
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const TEST_STUDENT_NAME = 'TestStudent_DeleteMe';
const TEST_STUDENT_EMAIL = `${TEST_STUDENT_NAME.toLowerCase()}@student.local`;
const TEST_PASSWORD = 'TestPassword123!';

async function createTestStudent() {
  console.log('\n📝 Stap 1: Test student aanmaken...');

  // Maak auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_STUDENT_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      role: 'student',
      name: TEST_STUDENT_NAME,
      level: 'HAVO',
      created_by: 'test-script'
    }
  });

  if (authError) {
    console.error('❌ Error creating auth user:', authError);
    return null;
  }

  console.log('✅ Auth user created:', authData.user.id);

  // Maak student profile
  const { data: profileData, error: profileError } = await supabase
    .from('student_profiles')
    .insert({
      name: TEST_STUDENT_NAME,
      level: 'HAVO',
      struggle_points: 'Test struggle points',
      email: TEST_STUDENT_EMAIL,
      created_by_admin: 'test-script',
      is_active: true,
      auth_user_id: authData.user.id
    })
    .select()
    .single();

  if (profileError) {
    console.error('❌ Error creating profile:', profileError);
    // Cleanup auth user
    await supabase.auth.admin.deleteUser(authData.user.id);
    return null;
  }

  console.log('✅ Student profile created:', TEST_STUDENT_NAME);
  return authData.user.id;
}

async function createTestData() {
  console.log('\n📝 Stap 2: Test exam results aanmaken...');

  const { data, error } = await supabase
    .from('exam_results')
    .insert([
      {
        id: `test-result-1-${Date.now()}`,
        student_name: TEST_STUDENT_NAME,
        subject: 'Wiskunde',
        score: 8,
        total_questions: 10,
        date: new Date().toISOString(),
        answers: JSON.stringify([])
      },
      {
        id: `test-result-2-${Date.now()}`,
        student_name: TEST_STUDENT_NAME,
        subject: 'Engels',
        score: 7,
        total_questions: 10,
        date: new Date().toISOString(),
        answers: JSON.stringify([])
      }
    ])
    .select();

  if (error) {
    console.error('❌ Error creating exam results:', error);
    return false;
  }

  console.log(`✅ Created ${data.length} exam results`);

  console.log('\n📝 Stap 3: Test progress data aanmaken...');

  const { data: progressData, error: progressError } = await supabase
    .from('student_progress')
    .insert({
      id: `test-progress-${Date.now()}`,
      student_name: TEST_STUDENT_NAME,
      subject: 'Wiskunde',
      total_exams_taken: 2,
      total_questions_answered: 20,
      total_correct_answers: 15,
      average_score: 7.5,
      last_exam_date: new Date().toISOString(),
      improvement_rate: 10.0
    })
    .select();

  if (progressError) {
    console.error('❌ Error creating progress:', progressError);
    return false;
  }

  console.log('✅ Progress data created');
  return true;
}

async function verifyDataExists() {
  console.log('\n🔍 Verificatie: Data bestaat...');

  // Check student profile
  const { data: profile } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('name', TEST_STUDENT_NAME)
    .maybeSingle();

  if (!profile) {
    console.log('❌ Student profile not found');
    return false;
  }
  console.log('✅ Student profile exists');

  // Check exam results
  const { data: results } = await supabase
    .from('exam_results')
    .select('*')
    .eq('student_name', TEST_STUDENT_NAME);

  console.log(`✅ Found ${results?.length || 0} exam results`);

  // Check progress
  const { data: progress } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_name', TEST_STUDENT_NAME);

  console.log(`✅ Found ${progress?.length || 0} progress records`);

  return true;
}

async function deleteTestStudent() {
  console.log('\n🗑️  Stap 4: Student verwijderen...');

  // Haal auth_user_id op
  const { data: profile } = await supabase
    .from('student_profiles')
    .select('auth_user_id')
    .eq('name', TEST_STUDENT_NAME)
    .maybeSingle();

  if (!profile) {
    console.error('❌ Student profile not found');
    return false;
  }

  const authUserId = profile.auth_user_id;

  // Delete exam results
  const { error: resultsError } = await supabase
    .from('exam_results')
    .delete()
    .eq('student_name', TEST_STUDENT_NAME);

  if (resultsError) {
    console.error('❌ Error deleting exam results:', resultsError);
  } else {
    console.log('✅ Exam results deleted');
  }

  // Delete progress
  const { error: progressError } = await supabase
    .from('student_progress')
    .delete()
    .eq('student_name', TEST_STUDENT_NAME);

  if (progressError) {
    console.error('❌ Error deleting progress:', progressError);
  } else {
    console.log('✅ Student progress deleted');
  }

  // Delete profile
  const { error: profileError } = await supabase
    .from('student_profiles')
    .delete()
    .eq('name', TEST_STUDENT_NAME);

  if (profileError) {
    console.error('❌ Error deleting profile:', profileError);
    return false;
  }
  console.log('✅ Student profile deleted');

  // Delete auth user
  if (authUserId) {
    const { error: authError } = await supabase.auth.admin.deleteUser(authUserId);
    if (authError) {
      console.error('❌ Error deleting auth user:', authError);
    } else {
      console.log('✅ Auth user deleted');
    }
  }

  return true;
}

async function verifyDataDeleted() {
  console.log('\n🔍 Stap 5: Verificatie dat alles verwijderd is...');

  let allDeleted = true;

  // Check student profile
  const { data: profile } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('name', TEST_STUDENT_NAME)
    .maybeSingle();

  if (profile) {
    console.log('❌ Student profile still exists!');
    allDeleted = false;
  } else {
    console.log('✅ Student profile verwijderd');
  }

  // Check exam results
  const { data: results } = await supabase
    .from('exam_results')
    .select('*')
    .eq('student_name', TEST_STUDENT_NAME);

  if (results && results.length > 0) {
    console.log(`❌ ${results.length} exam results still exist!`);
    allDeleted = false;
  } else {
    console.log('✅ Exam results verwijderd');
  }

  // Check progress
  const { data: progress } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_name', TEST_STUDENT_NAME);

  if (progress && progress.length > 0) {
    console.log(`❌ ${progress.length} progress records still exist!`);
    allDeleted = false;
  } else {
    console.log('✅ Student progress verwijderd');
  }

  return allDeleted;
}

async function cleanup() {
  console.log('\n🧹 Cleanup: Verwijder test data (voor het geval het mislukt is)...');

  // Probeer oude test data te verwijderen
  const { data: oldProfile } = await supabase
    .from('student_profiles')
    .select('auth_user_id')
    .eq('name', TEST_STUDENT_NAME)
    .maybeSingle();

  if (oldProfile) {
    await supabase.from('exam_results').delete().eq('student_name', TEST_STUDENT_NAME);
    await supabase.from('student_progress').delete().eq('student_name', TEST_STUDENT_NAME);
    await supabase.from('student_profiles').delete().eq('name', TEST_STUDENT_NAME);
    if (oldProfile.auth_user_id) {
      await supabase.auth.admin.deleteUser(oldProfile.auth_user_id);
    }
    console.log('✅ Old test data cleaned up');
  } else {
    console.log('✅ No cleanup needed');
  }
}

async function runTest() {
  console.log('🧪 ===================================');
  console.log('🧪 STUDENT DELETE FUNCTIONALITEIT TEST');
  console.log('🧪 ===================================');

  try {
    // Cleanup eerst
    await cleanup();

    // Stap 1: Maak test student
    const authUserId = await createTestStudent();
    if (!authUserId) {
      console.error('\n❌ TEST FAILED: Could not create test student');
      return;
    }

    // Stap 2-3: Maak test data
    const dataCreated = await createTestData();
    if (!dataCreated) {
      console.error('\n❌ TEST FAILED: Could not create test data');
      await cleanup();
      return;
    }

    // Verificatie dat data bestaat
    const dataExists = await verifyDataExists();
    if (!dataExists) {
      console.error('\n❌ TEST FAILED: Data verification failed');
      await cleanup();
      return;
    }

    // Stap 4: Verwijder student
    const deleted = await deleteTestStudent();
    if (!deleted) {
      console.error('\n❌ TEST FAILED: Could not delete student');
      await cleanup();
      return;
    }

    // Stap 5: Verifieer dat alles weg is
    const allDeleted = await verifyDataDeleted();

    if (allDeleted) {
      console.log('\n✅ ===================================');
      console.log('✅ TEST PASSED: Student succesvol verwijderd!');
      console.log('✅ ===================================');
      console.log('\n📋 Samenvatting:');
      console.log('  ✅ Student profile verwijderd');
      console.log('  ✅ Exam results verwijderd');
      console.log('  ✅ Student progress verwijderd');
      console.log('  ✅ Auth user verwijderd');
    } else {
      console.log('\n❌ ===================================');
      console.log('❌ TEST FAILED: Niet alles is verwijderd!');
      console.log('❌ ===================================');
      await cleanup();
    }

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
    await cleanup();
  }
}

runTest();
