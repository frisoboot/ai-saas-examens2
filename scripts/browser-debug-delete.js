/**
 * BROWSER DEBUG HELPER - Delete Student Flow
 *
 * Kopieer en plak deze code in de browser console (F12) terwijl je ingelogd bent als admin
 * om de delete flow stap voor stap te debuggen.
 *
 * Gebruik:
 * 1. Log in als admin in de app
 * 2. Open Developer Console (F12)
 * 3. Plak deze hele code
 * 4. Run: await testDeleteFlow('StudentName')
 */

async function testDeleteFlow(studentName) {
  console.log('🔍 DEBUG: Delete Student Flow Test');
  console.log('=' .repeat(60));
  console.log('Student:', studentName);
  console.log('');

  // Stap 1: Check Supabase client
  console.log('📋 Stap 1: Checking Supabase Client');
  if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase client niet beschikbaar in window.supabase');
    console.log('   Probeer: const { supabase } = await import("./services/supabaseService")');
    return;
  }
  console.log('✅ Supabase client found');

  // Stap 2: Check current session
  console.log('\n📋 Stap 2: Checking Current Session');
  const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('❌ Geen actieve sessie - je moet ingelogd zijn!');
    return;
  }

  console.log('✅ Session active');
  console.log('   User ID:', session.user.id);
  console.log('   User Role:', session.user.user_metadata?.role);
  console.log('   Access Token:', session.access_token.substring(0, 20) + '...');

  if (session.user.user_metadata?.role !== 'admin') {
    console.error('❌ Je bent niet ingelogd als admin!');
    return;
  }
  console.log('✅ Logged in as admin');

  // Stap 3: Check student exists
  console.log('\n📋 Stap 3: Checking if student exists');
  const { data: student, error: studentError } = await window.supabase
    .from('student_profiles')
    .select('*')
    .eq('name', studentName)
    .maybeSingle();

  if (studentError) {
    console.error('❌ Error fetching student:', studentError);
    return;
  }

  if (!student) {
    console.error('❌ Student niet gevonden:', studentName);
    return;
  }

  console.log('✅ Student found:');
  console.log('   Name:', student.name);
  console.log('   Level:', student.level);
  console.log('   Auth User ID:', student.auth_user_id);
  console.log('   Created by:', student.created_by_admin);

  // Stap 4: Check related data
  console.log('\n📋 Stap 4: Checking related data');

  const { data: examResults } = await window.supabase
    .from('exam_results')
    .select('*')
    .eq('student_name', studentName);

  const { data: progress } = await window.supabase
    .from('student_progress')
    .select('*')
    .eq('student_name', studentName);

  console.log(`   Exam results: ${examResults?.length || 0}`);
  console.log(`   Progress records: ${progress?.length || 0}`);

  // Stap 5: Test API endpoint
  console.log('\n📋 Stap 5: Testing API Endpoint');
  console.log('   Sending DELETE request to /api/delete-student');
  console.log('   With Authorization header...');

  try {
    const apiUrl = window.location.origin.includes('localhost')
      ? 'http://localhost:3001/api/delete-student'
      : '/api/delete-student';

    console.log('   API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        studentName: studentName
      })
    });

    console.log('   Response status:', response.status, response.statusText);

    const data = await response.json();
    console.log('   Response data:', data);

    if (!response.ok) {
      console.error('❌ API Error:', data.error);
      console.error('   Details:', data.details || 'No details');
      return;
    }

    console.log('✅ API call successful!');

    // Stap 6: Verify deletion
    console.log('\n📋 Stap 6: Verifying deletion');

    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    const { data: studentAfter } = await window.supabase
      .from('student_profiles')
      .select('*')
      .eq('name', studentName)
      .maybeSingle();

    const { data: resultsAfter } = await window.supabase
      .from('exam_results')
      .select('*')
      .eq('student_name', studentName);

    const { data: progressAfter } = await window.supabase
      .from('student_progress')
      .select('*')
      .eq('student_name', studentName);

    let allDeleted = true;

    if (studentAfter) {
      console.error('❌ Student profile still exists!');
      allDeleted = false;
    } else {
      console.log('✅ Student profile deleted');
    }

    if (resultsAfter && resultsAfter.length > 0) {
      console.error(`❌ ${resultsAfter.length} exam results still exist!`);
      allDeleted = false;
    } else {
      console.log('✅ Exam results deleted');
    }

    if (progressAfter && progressAfter.length > 0) {
      console.error(`❌ ${progressAfter.length} progress records still exist!`);
      allDeleted = false;
    } else {
      console.log('✅ Progress deleted');
    }

    console.log('\n' + '=' .repeat(60));
    if (allDeleted) {
      console.log('✅✅✅ DELETE SUCCESVOL! ✅✅✅');
      console.log(`Student "${studentName}" is volledig verwijderd uit het systeem.`);
    } else {
      console.error('❌ DELETE GEFAALD - Niet alle data is verwijderd');
    }
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.error('   Error details:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Helper functie om alle studenten te tonen
async function listStudents() {
  console.log('📋 Alle studenten in database:');
  const { data: students } = await window.supabase
    .from('student_profiles')
    .select('name, level, created_by_admin, is_active')
    .order('name');

  students?.forEach((s, i) => {
    console.log(`${i + 1}. ${s.name} (${s.level}) - ${s.is_active ? 'Active' : 'Inactive'}`);
  });

  console.log(`\nTotaal: ${students?.length || 0} studenten`);
  console.log('\nOm een student te testen: await testDeleteFlow("StudentName")');
}

// Info message
console.log('%c🔧 DELETE FLOW DEBUG HELPER LOADED', 'color: #4CAF50; font-weight: bold; font-size: 16px');
console.log('');
console.log('Beschikbare functies:');
console.log('  • await testDeleteFlow("StudentName") - Test delete flow voor specifieke student');
console.log('  • await listStudents() - Toon alle studenten');
console.log('');
console.log('Example: await testDeleteFlow("TestStudent")');
console.log('');

// Auto-run listStudents
if (typeof window.supabase !== 'undefined') {
  listStudents();
}
