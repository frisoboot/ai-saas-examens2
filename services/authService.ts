import { StudentProfile, AdminUser, StudentLevel } from '../types';
import { supabase } from './supabaseService';
import { apiCreateStudent, apiResetPassword, apiDeleteStudent } from './apiService';

// ============================================================================
// SUPABASE AUTH - VOLLEDIGE INTEGRATIE
//
// Login met echte email adressen. Admin rol wordt bepaald via VITE_ADMIN_EMAILS.
//
// SECURITY:
// - Alle admin operaties gaan via server-side API endpoints
// - De service role key is NOOIT beschikbaar in de browser
// - RLS policies beschermen alle data in de database
// ============================================================================

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase niet beschikbaar. Controleer je configuratie.');
  }
};

/**
 * Check of een email adres een admin is
 * Admin emails worden geconfigureerd via VITE_ADMIN_EMAILS environment variable
 */
const isAdminEmail = (email: string): boolean => {
  const adminEmails = import.meta.env.VITE_ADMIN_EMAILS || '';
  const adminList = adminEmails.split(',').map((e: string) => e.toLowerCase().trim()).filter(Boolean);
  return adminList.includes(email.toLowerCase().trim());
};

// ============================================================================
// LOGOUT
// ============================================================================

export const logout = async (): Promise<void> => {
  requireSupabase();
  const { error } = await supabase!.auth.signOut();
  if (error) {
    console.error('Logout error:', error);
  }
};

// ============================================================================
// UNIFIED LOGIN - Eén login voor iedereen
// ============================================================================

export type LoginResult = {
  type: 'admin';
  admin: AdminUser;
} | {
  type: 'student';
  profile: StudentProfile;
} | null;

/**
 * Unified login - werkt voor zowel admins als studenten
 * Rol wordt bepaald via user_metadata.role
 */
export const login = async (email: string, password: string): Promise<LoginResult> => {
  requireSupabase();

  if (!email || !password) {
    throw new Error('Email en wachtwoord zijn verplicht');
  }

  try {
    const { data, error } = await supabase!.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Email of wachtwoord onjuist');
      }
      throw new Error(`Login mislukt: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Geen user data ontvangen');
    }

    const userEmail = data.user.email || email;

    // Admin - check via VITE_ADMIN_EMAILS environment variable
    if (isAdminEmail(userEmail)) {
      return {
        type: 'admin',
        admin: {
          id: data.user.id,
          username: userEmail,
          passwordHash: '',
          email: userEmail,
          lastLogin: new Date().toISOString()
        }
      };
    }

    // Student (default)
    const profileData = await getStudentProfile(data.user.id, data.user.email || email);

    if (!profileData) {
      await logout();
      throw new Error('Profiel niet gevonden. Neem contact op met de beheerder.');
    }

    if (profileData.is_active === false) {
      await logout();
      throw new Error('Je account is gedeactiveerd. Neem contact op met je docent.');
    }

    return {
      type: 'student',
      profile: {
        name: profileData.name,
        level: profileData.level,
        strugglePoints: profileData.struggle_points,
        email: profileData.email,
        createdByAdmin: profileData.created_by_admin,
        isActive: profileData.is_active
      }
    };

  } catch (error: any) {
    if (error.message) {
      throw error;
    }
    throw new Error('Er ging iets mis bij het inloggen');
  }
};

/**
 * Haal student profiel op via auth_user_id of email
 */
const getStudentProfile = async (userId: string, email: string) => {
  // Eerst zoeken op auth_user_id
  let result = await supabase!
    .from('student_profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (result.data) return result.data;

  // Fallback: zoeken op email
  result = await supabase!
    .from('student_profiles')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  return result.data;
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Haal de huidige sessie op
 */
export const getCurrentSession = async (): Promise<LoginResult> => {
  requireSupabase();

  try {
    const { data: { session }, error } = await supabase!.auth.getSession();

    if (error || !session) {
      return null;
    }

    const user = session.user;
    const userEmail = user.email || '';

    // Admin - check via VITE_ADMIN_EMAILS environment variable
    if (isAdminEmail(userEmail)) {
      return {
        type: 'admin',
        admin: {
          id: user.id,
          username: userEmail,
          passwordHash: '',
          email: userEmail,
          lastLogin: new Date().toISOString()
        }
      };
    }

    // Student
    const profileData = await getStudentProfile(user.id, user.email || '');

    if (!profileData) {
      await logout();
      return null;
    }

    if (profileData.is_active === false) {
      await logout();
      return null;
    }

    return {
      type: 'student',
      profile: {
        name: profileData.name,
        level: profileData.level,
        strugglePoints: profileData.struggle_points,
        email: profileData.email,
        createdByAdmin: profileData.created_by_admin,
        isActive: profileData.is_active
      }
    };

  } catch (error) {
    console.error('Error checking session:', error);
    return null;
  }
};

/**
 * Luister naar auth state changes
 */
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  requireSupabase();
  return supabase!.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

// ============================================================================
// LEGACY FUNCTIONS - voor backwards compatibility
// ============================================================================

/**
 * @deprecated Gebruik login() in plaats hiervan
 */
export const verifyAdminLogin = async (email: string, password: string): Promise<AdminUser | null> => {
  const result = await login(email, password);
  if (result?.type === 'admin') {
    return result.admin;
  }
  if (result?.type === 'student') {
    await logout();
    throw new Error('Dit is geen admin account');
  }
  return null;
};

/**
 * @deprecated Gebruik login() in plaats hiervan
 */
export const verifyStudentLogin = async (email: string, password: string): Promise<StudentProfile | null> => {
  const result = await login(email, password);
  if (result?.type === 'student') {
    return result.profile;
  }
  if (result?.type === 'admin') {
    await logout();
    throw new Error('Dit is geen student account');
  }
  return null;
};

// ============================================================================
// ADMIN OPERATIES (via server-side API)
// ============================================================================

export const createStudentAccount = async (
  adminUsername: string,
  name: string,
  password: string,
  level: StudentLevel,
  strugglePoints: string,
  email: string
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();

  if (!name || !password || !level || !email) {
    return { success: false, error: 'Naam, email, wachtwoord en niveau zijn verplicht' };
  }

  if (!email.includes('@')) {
    return { success: false, error: 'Vul een geldig email adres in' };
  }

  if (password.length < 8) {
    return { success: false, error: 'Wachtwoord moet minimaal 8 karakters zijn' };
  }

  const existing = await getStudentByName(name);
  if (existing) {
    return { success: false, error: 'Student met deze naam bestaat al' };
  }

  return await apiCreateStudent(adminUsername, name, password, level, strugglePoints, email);
};

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

export const updateStudent = async (
  name: string,
  updates: Partial<StudentProfile>
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();

  const dbUpdates: {
    level?: StudentLevel;
    struggle_points?: string;
    email?: string;
    is_active?: boolean;
  } = {};

  if (updates.level) dbUpdates.level = updates.level;
  if (updates.strugglePoints !== undefined) dbUpdates.struggle_points = updates.strugglePoints;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { error } = await supabase!
    .from('student_profiles')
    .update(dbUpdates)
    .eq('name', name);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const deactivateStudent = async (name: string): Promise<{ success: boolean; error?: string }> => {
  return updateStudent(name, { isActive: false });
};

export const activateStudent = async (name: string): Promise<{ success: boolean; error?: string }> => {
  return updateStudent(name, { isActive: true });
};

export const resetStudentPassword = async (
  name: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();

  if (newPassword.length < 8) {
    return { success: false, error: 'Wachtwoord moet minimaal 8 karakters zijn' };
  }

  return await apiResetPassword(name, newPassword);
};

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

export const deleteStudent = async (
  name: string
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();
  return await apiDeleteStudent(name);
};
