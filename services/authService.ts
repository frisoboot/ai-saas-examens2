import { StudentProfile, AdminUser, StudentLevel } from '../types';
import { supabase } from './supabaseService';
import { apiCreateStudent, apiResetPassword, apiDeleteStudent } from './apiService';

// ============================================================================
// SUPABASE AUTH INTEGRATIE - GEEN FALLBACKS
// Database en Supabase Auth zijn VEREIST
//
// SECURITY: Alle admin operaties (student aanmaken, wachtwoord resetten, etc.)
// gaan via server-side API endpoints. Dit voorkomt dat de service role key
// in de browser wordt geladen.
// ============================================================================

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase niet beschikbaar. Controleer je configuratie.');
  }
};

// Admin authentication - via Supabase Auth (zelfde als studenten)
export const verifyAdminLogin = async (username: string, password: string): Promise<AdminUser | null> => {
  requireSupabase();

  // Gebruik username@admin.example.com als email format voor admins
  // (.local TLD wordt niet geaccepteerd door Supabase's e-mail validatie)
  const email = `${username.toLowerCase().replace(/\s+/g, '_')}@admin.example.com`;

  const { data, error } = await supabase!.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error(`Admin login mislukt: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Geen user data ontvangen van Supabase Auth');
  }

  // Email eindigt op @admin.example.com = admin (geen metadata nodig)
  return {
    id: data.user.id,
    username: username,
    passwordHash: '',
    email: data.user.email,
    lastLogin: new Date().toISOString()
  };
};

// Student authentication met Supabase Auth
export const verifyStudentLogin = async (name: string, password: string): Promise<StudentProfile | null> => {
  requireSupabase();

  // Gebruik name@student.example.com als email format voor studenten
  // (.local TLD wordt niet geaccepteerd door Supabase's e-mail validatie)
  const email = `${name.toLowerCase().replace(/\s+/g, '_')}@student.example.com`;

  const { data, error } = await supabase!.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error(`Student login mislukt: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Geen user data ontvangen van Supabase Auth');
  }

  // Controleer of user student role heeft
  const role = data.user.user_metadata?.role;
  if (role !== 'student') {
    await supabase!.auth.signOut();
    throw new Error('User is geen student');
  }

  // Haal student profiel op uit database
  // Try by name from metadata first, fallback to auth_user_id for robustness
  const studentName = data.user.user_metadata?.name;
  let profileData = null;
  let profileError = null;

  if (studentName) {
    const result = await supabase!
      .from('student_profiles')
      .select('*')
      .eq('name', studentName)
      .maybeSingle();
    profileData = result.data;
    profileError = result.error;
  }

  // Fallback: try to find by auth_user_id if name lookup failed
  if (!profileData && !profileError) {
    const fallbackResult = await supabase!
      .from('student_profiles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();
    profileData = fallbackResult.data;
    profileError = fallbackResult.error;
  }

  if (profileError) {
    throw new Error(`Fout bij ophalen student profiel: ${profileError.message}`);
  }

  if (!profileData) {
    await supabase!.auth.signOut();
    throw new Error('Student profiel niet gevonden in database. Neem contact op met de beheerder.');
  }

  return {
    name: profileData.name,
    level: profileData.level,
    strugglePoints: profileData.struggle_points,
    email: profileData.email,
    createdByAdmin: profileData.created_by_admin,
    isActive: profileData.is_active
  };
};

// Admin creates student account - via server-side API voor veiligheid
export const createStudentAccount = async (
  adminUsername: string,
  name: string,
  password: string,
  level: StudentLevel,
  strugglePoints: string,
  email?: string
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();

  // Check if student already exists
  const existing = await getStudentByName(name);
  if (existing) {
    return { success: false, error: 'Student met deze naam bestaat al' };
  }

  // Gebruik veilige server-side API endpoint
  return await apiCreateStudent(adminUsername, name, password, level, strugglePoints, email);
};

// Get all students (for admin management)
export const getAllStudents = async (): Promise<StudentProfile[]> => {
  requireSupabase();

  const { data, error } = await supabase!
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
};

// Update student
export const updateStudent = async (
  name: string,
  updates: Partial<StudentProfile>
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();

  const dbUpdates: any = {};
  if (updates.level) dbUpdates.level = updates.level;
  if (updates.strugglePoints !== undefined) dbUpdates.struggle_points = updates.strugglePoints;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { error } = await supabase!
    .from('student_profiles')
    .update(dbUpdates)
    .eq('name', name);

  if (error) throw error;

  return { success: true };
};

// Deactivate student account
export const deactivateStudent = async (name: string): Promise<{ success: boolean; error?: string }> => {
  return updateStudent(name, { isActive: false });
};

// Activate student account
export const activateStudent = async (name: string): Promise<{ success: boolean; error?: string }> => {
  return updateStudent(name, { isActive: true });
};

// Reset student password - via server-side API voor veiligheid
export const resetStudentPassword = async (
  name: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();

  // Gebruik veilige server-side API endpoint
  return await apiResetPassword(name, newPassword);
};

// Helper to get student by name
const getStudentByName = async (name: string): Promise<StudentProfile | null> => {
  requireSupabase();

  const { data, error } = await supabase!
    .from('student_profiles')
    .select('*')
    .eq('name', name)
    .maybeSingle();

  if (error) throw error;

  return data ? {
    name: data.name,
    level: data.level,
    strugglePoints: data.struggle_points,
    email: data.email,
    createdByAdmin: data.created_by_admin,
    isActive: data.is_active
  } : null;
};

// Get current session user
export const getCurrentUser = async (): Promise<{ role: 'admin' | 'student'; data: AdminUser | StudentProfile } | null> => {
  if (!supabase) return null;

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
};

// Sign out
export const signOut = async (): Promise<void> => {
  if (!supabase) return;
  await supabase.auth.signOut();
};

// Delete student account - via server-side API voor veiligheid
export const deleteStudent = async (
  name: string
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();

  // Gebruik veilige server-side API endpoint
  return await apiDeleteStudent(name);
};
