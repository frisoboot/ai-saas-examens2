/**
 * Cleanup Script - Verwijder Orphaned Auth Users
 *
 * Dit script vindt en verwijdert auth.users die geen overeenkomstig
 * student_profiles record hebben (orphaned auth users).
 *
 * Dit kan gebeuren wanneer:
 * - Delete operation mislukt halverwege
 * - Student profile handmatig verwijderd via SQL
 * - Auth user delete stap faalt
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

async function findOrphanedAuthUsers() {
  console.log('🔍 Searching for orphaned auth users...\n');

  // Stap 1: Haal alle student profiles op
  const { data: profiles, error: profilesError } = await supabase
    .from('student_profiles')
    .select('auth_user_id, name');

  if (profilesError) {
    console.error('❌ Error fetching student profiles:', profilesError);
    return [];
  }

  const validAuthIds = new Set(
    profiles?.map(p => p.auth_user_id).filter(Boolean) || []
  );

  console.log(`✅ Found ${profiles?.length || 0} student profiles`);
  console.log(`   Valid auth user IDs: ${validAuthIds.size}\n`);

  // Stap 2: Haal alle auth users met role=student op
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error('❌ Error fetching auth users:', usersError);
    return [];
  }

  const studentAuthUsers = users?.filter(u => u.user_metadata?.role === 'student') || [];
  console.log(`✅ Found ${studentAuthUsers.length} auth users with role=student\n`);

  // Stap 3: Vind orphans
  const orphans = studentAuthUsers.filter(u => !validAuthIds.has(u.id));

  return orphans;
}

async function cleanupOrphans(dryRun: boolean = true) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  CLEANUP ORPHANED AUTH USERS                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - Geen wijzigingen worden gemaakt\n');
  } else {
    console.log('⚠️  LIVE MODE - Auth users zullen echt verwijderd worden!\n');
  }

  const orphans = await findOrphanedAuthUsers();

  if (orphans.length === 0) {
    console.log('✅ Geen orphaned auth users gevonden!\n');
    return;
  }

  console.log(`⚠️  Found ${orphans.length} orphaned auth users:\n`);

  orphans.forEach((orphan, i) => {
    const name = orphan.user_metadata?.name || 'Unknown';
    const email = orphan.email || 'no-email';
    const createdAt = new Date(orphan.created_at).toLocaleDateString();

    console.log(`${i + 1}. ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Auth ID: ${orphan.id}`);
    console.log(`   Created: ${createdAt}`);
    console.log(`   Level: ${orphan.user_metadata?.level || 'N/A'}`);
    console.log('');
  });

  if (dryRun) {
    console.log('📋 To actually delete these users, run:');
    console.log('   npx tsx scripts/cleanup-orphaned-auth-users.ts --delete\n');
    return;
  }

  // Confirm before deleting
  console.log('⚠️  WARNING: You are about to DELETE these auth users!');
  console.log('   This action cannot be undone.');
  console.log('   Waiting 5 seconds before proceeding...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Delete orphans
  let deletedCount = 0;
  let failedCount = 0;

  for (const orphan of orphans) {
    const name = orphan.user_metadata?.name || 'Unknown';
    try {
      const { error } = await supabase.auth.admin.deleteUser(orphan.id);

      if (error) {
        console.error(`❌ Failed to delete ${name}:`, error.message);
        failedCount++;
      } else {
        console.log(`✅ Deleted ${name} (${orphan.email})`);
        deletedCount++;
      }
    } catch (error) {
      console.error(`❌ Exception deleting ${name}:`, error);
      failedCount++;
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  CLEANUP SUMMARY                                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Total orphans found: ${orphans.length}`);
  console.log(`Successfully deleted: ${deletedCount}`);
  console.log(`Failed to delete: ${failedCount}\n`);

  if (deletedCount > 0) {
    console.log('✅ Cleanup completed successfully!\n');
  }
}

async function findStudentsWithoutAuthUser() {
  console.log('\n🔍 BONUS: Checking for students WITHOUT auth users...\n');

  const { data: profiles } = await supabase
    .from('student_profiles')
    .select('name, auth_user_id')
    .order('name');

  const studentsWithoutAuth = profiles?.filter(p => !p.auth_user_id) || [];

  if (studentsWithoutAuth.length === 0) {
    console.log('✅ All students have auth_user_id\n');
  } else {
    console.log(`⚠️  Found ${studentsWithoutAuth.length} students WITHOUT auth_user_id:\n`);
    studentsWithoutAuth.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} - Missing auth_user_id ⚠️`);
    });
    console.log('\nThese students cannot log in!');
    console.log('Consider recreating them or assigning auth_user_id manually.\n');
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const deleteMode = args.includes('--delete') || args.includes('-d');

  try {
    await cleanupOrphans(!deleteMode);
    await findStudentsWithoutAuthUser();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
