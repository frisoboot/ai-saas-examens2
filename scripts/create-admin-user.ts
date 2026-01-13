/**
 * Script om admin user aan te maken in Supabase Auth
 *
 * Gebruik:
 * 1. Zorg dat je .env.local hebt met VITE_SUPABASE_SERVICE_ROLE_KEY
 * 2. Run: npx tsx scripts/create-admin-user.ts
 *
 * Of kopieer de code en plak in browser console op je website
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Laad .env.local bestand
config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ VITE_SUPABASE_URL en VITE_SUPABASE_SERVICE_ROLE_KEY moeten in .env.local staan');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  console.log('🔧 Admin user aanmaken...');

  try {
    // Check of admin user al bestaat
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Fout bij ophalen users:', listError);
      return;
    }

    const adminExists = existingUsers?.users?.find(
      user => user.email === 'admin@admin.local'
    );

    if (adminExists) {
      console.log('⚠️  Admin user bestaat al!');
      console.log('   Email: admin@admin.local');
      console.log('   User ID:', adminExists.id);

      // Update metadata voor zekerheid
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        adminExists.id,
        {
          user_metadata: {
            role: 'admin',
            username: 'admin'
          }
        }
      );

      if (updateError) {
        console.error('❌ Fout bij updaten metadata:', updateError);
      } else {
        console.log('✅ Admin metadata bijgewerkt');
      }

      return;
    }

    // Maak nieuwe admin user aan
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@admin.local',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        role: 'admin',
        username: 'admin'
      }
    });

    if (error) {
      console.error('❌ Fout bij aanmaken admin:', error);
      return;
    }

    console.log('✅ Admin user succesvol aangemaakt!');
    console.log('   Email: admin@admin.local');
    console.log('   Password: admin123');
    console.log('   User ID:', data.user.id);
    console.log('');
    console.log('⚠️  BELANGRIJK: Verander dit wachtwoord in productie!');

  } catch (error) {
    console.error('❌ Onverwachte fout:', error);
  }
}

// Run script
createAdminUser();
