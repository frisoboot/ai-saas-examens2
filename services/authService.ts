import { StudentProfile, AdminUser, StudentLevel } from '../types';
import { supabase, supabaseAdmin } from './supabaseService';
import { apiCreateStudent, apiResetPassword, apiDeleteStudent } from './apiService';

// ============================================================================
// SUPABASE AUTH INTEGRATIE
// Dit bestand gebruikt nu Supabase Auth voor authenticatie met custom metadata
// ============================================================================

// Admin authentication met Supabase Auth
export const verifyAdminLogin = async (username: string, password: string): Promise<AdminUser | null> => {
  console.log('verifyAdminLogin called for user:', username);

  if (!supabase) {
    // Fallback: hardcoded admin check (DEVELOPMENT ONLY)
    if (import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEV_FALLBACK === 'true') {
      console.log('Using development fallback admin login');
      if (username === 'admin' && password === 'admin123') {
        console.log('Fallback admin login SUCCESS');
        return {
          id: 'admin-001',
          username: 'admin',
          passwordHash: '',
          email: undefined,
          lastLogin: new Date().toISOString()
        };
      }
      console.log('Fallback admin login FAILED - wrong credentials');
      return null;
    } else {
      console.error('Database unavailable and fallback disabled in production');
      return null;
    }
  }

  try {
    // Gebruik email format voor Supabase Auth: admin@admin.local
    const email = `${username}@admin.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Supabase Auth error:', error.message);
      return null;
    }

    if (!data.user) {
      console.log('No user returned from Supabase Auth');
      return null;
    }

    // Controleer of user admin role heeft
    const role = data.user.user_metadata?.role;
    if (role !== 'admin') {
      console.error('User is not an admin');
      await supabase.auth.signOut();
      return null;
    }

    console.log('Admin login SUCCESS via Supabase Auth');

    return {
      id: data.user.id,
      username: data.user.user_metadata?.username || username,
      passwordHash: '',
      email: data.user.email,
      lastLogin: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error verifying admin login:', error);

    // Fallback if database fails (DEVELOPMENT ONLY)
    if (import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEV_FALLBACK === 'true') {
      console.log('Database login failed, trying development fallback...');
      if (username === 'admin' && password === 'admin123') {
        console.log('Fallback admin login SUCCESS');
        return {
          id: 'admin-001',
          username: 'admin',
          passwordHash: '',
          email: undefined,
          lastLogin: new Date().toISOString()
        };
      }
    }

    return null;
  }
};

// Student authentication met Supabase Auth
export const verifyStudentLogin = async (name: string, password: string): Promise<StudentProfile | null> => {
  if (!supabase) {
    // LocalStorage fallback voor development
    const stored = localStorage.getItem('ai_exam_students');
    const students: StudentProfile[] = stored ? JSON.parse(stored) : [];
    const student = students.find(s => s.name.toLowerCase() === name.toLowerCase());

    if (!student) return null;

    // Check password (simplified for fallback)
    if (student.password && student.password === password) {
      return student;
    }

    return null;
  }

  try {
    // Gebruik name@student.local als email format voor studenten
    const email = `${name.toLowerCase().replace(/\s+/g, '_')}@student.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Student login error:', error.message);
      return null;
    }

    if (!data.user) {
      console.log('No user returned from Supabase Auth');
      return null;
    }

    // Controleer of user student role heeft
    const role = data.user.user_metadata?.role;
    if (role !== 'student') {
      console.error('User is not a student');
      await supabase.auth.signOut();
      return null;
    }

    console.log('Student login SUCCESS via Supabase Auth');

    // Haal student profiel op uit database
    const { data: profileData, error: profileError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('name', data.user.user_metadata?.name)
      .maybeSingle();

    if (profileError || !profileData) {
      console.error('Error fetching student profile:', profileError);
      return null;
    }

    // Check subscription status
    const now = new Date();
    const expiresAt = profileData.subscription_expires_at
      ? new Date(profileData.subscription_expires_at)
      : null;

    const hasValidSubscription =
      profileData.subscription_status === 'trial' ||
      profileData.subscription_status === 'active';

    const isNotExpired = expiresAt && expiresAt > now;

    // If subscription expired or inactive, return profile with flag
    if (profileData.created_by_admin) {
      // Students created by admin don't need subscription (special case: schools)
      console.log('Student created by admin, skipping subscription check');
    } else if (!hasValidSubscription || !isNotExpired) {
      console.error('Student subscription expired or inactive');
      return {
        name: profileData.name,
        level: profileData.level,
        strugglePoints: profileData.struggle_points,
        email: profileData.email,
        createdByAdmin: profileData.created_by_admin,
        isActive: profileData.is_active,
        subscriptionStatus: profileData.subscription_status,
        subscriptionExpiresAt: profileData.subscription_expires_at,
        subscriptionExpired: true // Flag for UI
      } as any;
    }

    return {
      name: profileData.name,
      level: profileData.level,
      strugglePoints: profileData.struggle_points,
      email: profileData.email,
      createdByAdmin: profileData.created_by_admin,
      isActive: profileData.is_active,
      subscriptionStatus: profileData.subscription_status,
      subscriptionExpiresAt: profileData.subscription_expires_at,
      mollieCustomerId: profileData.mollie_customer_id,
      mollieSubscriptionId: profileData.mollie_subscription_id
    };
  } catch (error) {
    console.error('Error verifying student login:', error);
    return null;
  }
};

// Admin creates student account - gebruikt API (veilig!) of fallback
export const createStudentAccount = async (
  adminUsername: string,
  name: string,
  password: string,
  level: StudentLevel,
  strugglePoints: string,
  email?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check if student already exists
    const existing = await getStudentByName(name);
    if (existing) {
      return { success: false, error: 'Student met deze naam bestaat al' };
    }

    // ====================================================================
    // PRODUCTIE: Gebruik veilige API endpoint (aanbevolen!)
    // ====================================================================
    if (supabase && !supabaseAdmin) {
      // In productie: gebruik API (supabaseAdmin is niet beschikbaar)
      return await apiCreateStudent(adminUsername, name, password, level, strugglePoints, email);
    }

    // ====================================================================
    // DEVELOPMENT: Gebruik supabaseAdmin direct (alleen voor development!)
    // ====================================================================
    if (supabaseAdmin) {
      console.warn('⚠️  Using supabaseAdmin directly - only use in development!');

      const authEmail = `${name.toLowerCase().replace(/\s+/g, '_')}@student.local`;

      // Stap 1: Maak Supabase Auth user aan met admin client
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          role: 'student',
          name: name,
          level: level,
          created_by: adminUsername
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        return { success: false, error: `Auth error: ${authError.message}` };
      }

      console.log('Auth user created:', authData.user.id);

      // Stap 2: Maak student profiel in database
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('student_profiles')
        .insert({
          name: name,
          level: level,
          struggle_points: strugglePoints,
          email: email || authEmail,
          created_by_admin: adminUsername,
          is_active: true,
          auth_user_id: authData.user.id
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating student profile:', profileError);
        // Rollback: verwijder auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: `Database error: ${profileError.message}` };
      }

      console.log('Student profile created:', profileData);
      return { success: true };
    }

    // ====================================================================
    // FALLBACK: LocalStorage (alleen als Supabase niet beschikbaar is)
    // ====================================================================
    console.warn('⚠️  Using localStorage fallback');
    const stored = localStorage.getItem('ai_exam_students');
    const students: StudentProfile[] = stored ? JSON.parse(stored) : [];
    students.push({
      name,
      password,
      level,
      strugglePoints,
      email,
      createdByAdmin: adminUsername,
      isActive: true
    });
    localStorage.setItem('ai_exam_students', JSON.stringify(students));
    return { success: true };

  } catch (error) {
    console.error('Full error creating student:', error);

    let errorMessage = 'Onbekende fout';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }

    return { success: false, error: `Er ging iets mis: ${errorMessage}` };
  }
};

// Get all students (for admin management)
export const getAllStudents = async (): Promise<StudentProfile[]> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map(d => ({
        name: d.name,
        level: d.level,
        strugglePoints: d.struggle_points,
        email: d.email,
        createdByAdmin: d.created_by_admin,
        isActive: d.is_active
      }));
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  } else {
    // LocalStorage fallback
    const stored = localStorage.getItem('ai_exam_students');
    return stored ? JSON.parse(stored) : [];
  }
};

// Update student
export const updateStudent = async (
  name: string,
  updates: Partial<StudentProfile>
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (supabase) {
      const dbUpdates: any = {};
      if (updates.level) dbUpdates.level = updates.level;
      if (updates.strugglePoints !== undefined) dbUpdates.struggle_points = updates.strugglePoints;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const { error } = await supabase
        .from('student_profiles')
        .update(dbUpdates)
        .eq('name', name);

      if (error) throw error;
    } else {
      // LocalStorage fallback
      const stored = localStorage.getItem('ai_exam_students');
      const students: StudentProfile[] = stored ? JSON.parse(stored) : [];
      const index = students.findIndex(s => s.name === name);

      if (index === -1) {
        return { success: false, error: 'Student niet gevonden' };
      }

      students[index] = { ...students[index], ...updates };
      localStorage.setItem('ai_exam_students', JSON.stringify(students));
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating student:', error);
    return { success: false, error: 'Er ging iets mis bij het bijwerken' };
  }
};

// Deactivate student account
export const deactivateStudent = async (name: string): Promise<{ success: boolean; error?: string }> => {
  return updateStudent(name, { isActive: false });
};

// Activate student account
export const activateStudent = async (name: string): Promise<{ success: boolean; error?: string }> => {
  return updateStudent(name, { isActive: true });
};

// Reset student password - gebruikt API (veilig!) of fallback
export const resetStudentPassword = async (
  name: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // ====================================================================
    // PRODUCTIE: Gebruik veilige API endpoint (aanbevolen!)
    // ====================================================================
    if (supabase && !supabaseAdmin) {
      // In productie: gebruik API (supabaseAdmin is niet beschikbaar)
      return await apiResetPassword(name, newPassword);
    }

    // ====================================================================
    // DEVELOPMENT: Gebruik supabaseAdmin direct (alleen voor development!)
    // ====================================================================
    if (supabaseAdmin) {
      console.warn('⚠️  Using supabaseAdmin directly for password reset - only use in development!');

      // Haal student profiel op om auth_user_id te krijgen
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('student_profiles')
        .select('auth_user_id')
        .eq('name', name)
        .single();

      if (profileError || !profileData?.auth_user_id) {
        return { success: false, error: 'Student niet gevonden' };
      }

      // Update wachtwoord via admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        profileData.auth_user_id,
        { password: newPassword }
      );

      if (updateError) {
        console.error('Error resetting password:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    }

    // ====================================================================
    // FALLBACK: LocalStorage (niet bruikbaar in productie)
    // ====================================================================
    return { success: false, error: 'Admin client niet beschikbaar' };

  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: 'Er ging iets mis bij het resetten van het wachtwoord' };
  }
};

// Helper to get student by name
const getStudentByName = async (name: string): Promise<StudentProfile | null> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('name', name)
        .maybeSingle();

      if (error) {
        console.error('Error getting student by name:', error);
        return null;
      }

      return data ? {
        name: data.name,
        level: data.level,
        strugglePoints: data.struggle_points,
        email: data.email,
        createdByAdmin: data.created_by_admin,
        isActive: data.is_active
      } : null;
    } catch (error) {
      console.error('Exception getting student by name:', error);
      return null;
    }
  } else {
    const stored = localStorage.getItem('ai_exam_students');
    const students: StudentProfile[] = stored ? JSON.parse(stored) : [];
    return students.find(s => s.name.toLowerCase() === name.toLowerCase()) || null;
  }
};

// Get current session user
export const getCurrentUser = async (): Promise<{ role: 'admin' | 'student'; data: AdminUser | StudentProfile } | null> => {
  if (!supabase) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const role = user.user_metadata?.role;

    if (role === 'admin') {
      return {
        role: 'admin',
        data: {
          id: user.id,
          username: user.user_metadata?.username || 'admin',
          passwordHash: '',
          email: user.email,
          lastLogin: new Date().toISOString()
        }
      };
    } else if (role === 'student') {
      const profile = await getStudentByName(user.user_metadata?.name);
      if (!profile) return null;

      return {
        role: 'student',
        data: profile
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

// Delete student account - gebruikt API (veilig!) of fallback
export const deleteStudent = async (
  name: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // ====================================================================
    // PRODUCTIE: Gebruik veilige API endpoint (aanbevolen!)
    // ====================================================================
    if (supabase && !supabaseAdmin) {
      // In productie: gebruik API (supabaseAdmin is niet beschikbaar)
      return await apiDeleteStudent(name);
    }

    // ====================================================================
    // DEVELOPMENT: Gebruik supabaseAdmin direct (alleen voor development!)
    // ====================================================================
    if (supabaseAdmin) {
      console.warn('⚠️  Using supabaseAdmin directly for student deletion - only use in development!');

      // Haal student profiel op om auth_user_id te krijgen
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('student_profiles')
        .select('auth_user_id')
        .eq('name', name)
        .maybeSingle();

      if (profileError) {
        return { success: false, error: 'Student niet gevonden' };
      }

      if (!profileData) {
        return { success: false, error: 'Student niet gevonden' };
      }

      const authUserId = profileData.auth_user_id;

      // Stap 1: Verwijder exam results
      await supabaseAdmin
        .from('exam_results')
        .delete()
        .eq('student_name', name);

      // Stap 2: Verwijder student progress
      await supabaseAdmin
        .from('student_progress')
        .delete()
        .eq('student_name', name);

      // Stap 3: Verwijder student profiel
      const { error: deleteProfileError } = await supabaseAdmin
        .from('student_profiles')
        .delete()
        .eq('name', name);

      if (deleteProfileError) {
        console.error('Error deleting student profile:', deleteProfileError);
        return { success: false, error: deleteProfileError.message };
      }

      // Stap 4: Verwijder Supabase Auth user (als die bestaat)
      if (authUserId) {
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

        if (authDeleteError) {
          console.error('Error deleting auth user:', authDeleteError);
          // Profiel is al verwijderd, dus we loggen dit alleen
        }
      }

      return { success: true };
    }

    // ====================================================================
    // FALLBACK: LocalStorage (alleen als Supabase niet beschikbaar is)
    // ====================================================================
    console.warn('⚠️  Using localStorage fallback for deletion');
    const stored = localStorage.getItem('ai_exam_students');
    const students: StudentProfile[] = stored ? JSON.parse(stored) : [];
    const filtered = students.filter(s => s.name !== name);

    if (filtered.length === students.length) {
      return { success: false, error: 'Student niet gevonden' };
    }

    localStorage.setItem('ai_exam_students', JSON.stringify(filtered));
    return { success: true };

  } catch (error) {
    console.error('Error deleting student:', error);
    return { success: false, error: 'Er ging iets mis bij het verwijderen van de student' };
  }
};
