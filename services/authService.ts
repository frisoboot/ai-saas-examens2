import { StudentProfile, AdminUser, StudentLevel } from '../types';
import { supabase } from './supabaseService';
import { apiCreateStudent, apiResetPassword, apiDeleteStudent } from './apiService';

// ============================================================================
// SUPABASE AUTH - VOLLEDIGE INTEGRATIE
//
// Dit bestand bevat alle authenticatie logica via Supabase Auth.
// Login gebeurt direct met email - geen conversies nodig.
//
// SECURITY:
// - Alle admin operaties gaan via server-side API endpoints
// - De service role key is NOOIT beschikbaar in de browser
// - RLS policies beschermen alle data in de database
// ============================================================================

/**
 * Gooi een error als Supabase niet beschikbaar is
 */
const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase niet beschikbaar. Controleer je configuratie.');
  }
};

/**
 * Check of een email een admin is
 */
const isAdminEmail = (email: string): boolean => {
  return email.endsWith('@admin.example.com');
};

/**
 * Check of een email een student is
 */
const isStudentEmail = (email: string): boolean => {
  return email.endsWith('@student.example.com');
};

// ============================================================================
// LOGOUT
// ============================================================================

/**
 * Log de huidige gebruiker uit via Supabase Auth
 */
export const logout = async (): Promise<void> => {
  requireSupabase();

  const { error } = await supabase!.auth.signOut();

  if (error) {
    console.error('Logout error:', error);
  }
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Haal de huidige sessie op en bepaal of user student of admin is
 */
export const getCurrentSession = async (): Promise<{
  type: 'student' | 'admin';
  profile: StudentProfile | null;
  admin: AdminUser | null;
} | null> => {
  requireSupabase();

  try {
    const { data: { session }, error } = await supabase!.auth.getSession();

    if (error || !session) {
      return null;
    }

    const user = session.user;
    const email = user.email || '';

    // Check admin
    if (isAdminEmail(email)) {
      return {
        type: 'admin',
        profile: null,
        admin: {
          id: user.id,
          username: email, // Gewoon het email adres tonen
          passwordHash: '',
          email: email,
          lastLogin: new Date().toISOString()
        }
      };
    }

    // Check student
    if (isStudentEmail(email)) {
      // Zoek profiel op auth_user_id (meest betrouwbaar)
      let profileData = null;

      const result = await supabase!
        .from('student_profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      profileData = result.data;

      // Fallback: zoek op email in profiel
      if (!profileData) {
        const emailResult = await supabase!
          .from('student_profiles')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        profileData = emailResult.data;
      }

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
        },
        admin: null
      };
    }

    await logout();
    return null;

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
// ADMIN AUTHENTICATION
// ============================================================================

/**
 * Admin login via Supabase Auth
 *
 * @param email - Het volledige email adres (moet eindigen op @admin.example.com)
 * @param password - Het wachtwoord
 */
export const verifyAdminLogin = async (email: string, password: string): Promise<AdminUser | null> => {
  requireSupabase();

  if (!email || !password) {
    throw new Error('Email en wachtwoord zijn verplicht');
  }

  // Valideer dat het een admin email is
  if (!isAdminEmail(email)) {
    throw new Error('Gebruik je admin email (eindigt op @admin.example.com)');
  }

  try {
    const { data, error } = await supabase!.auth.signInWithPassword({
      email: email.toLowerCase(),
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

    return {
      id: data.user.id,
      username: data.user.email || email,
      passwordHash: '',
      email: data.user.email,
      lastLogin: new Date().toISOString()
    };

  } catch (error: any) {
    if (error.message) {
      throw error;
    }
    throw new Error('Er ging iets mis bij het inloggen');
  }
};

// ============================================================================
// STUDENT AUTHENTICATION
// ============================================================================

/**
 * Student login via Supabase Auth
 *
 * @param email - Het volledige email adres (moet eindigen op @student.example.com)
 * @param password - Het wachtwoord
 */
export const verifyStudentLogin = async (email: string, password: string): Promise<StudentProfile | null> => {
  requireSupabase();

  if (!email || !password) {
    throw new Error('Email en wachtwoord zijn verplicht');
  }

  // Valideer dat het een student email is
  if (!isStudentEmail(email)) {
    throw new Error('Gebruik je student email (eindigt op @student.example.com)');
  }

  try {
    const { data, error } = await supabase!.auth.signInWithPassword({
      email: email.toLowerCase(),
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

    // Haal student profiel op via auth_user_id
    let profileData = null;
    let profileError = null;

    const result = await supabase!
      .from('student_profiles')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();
    profileData = result.data;
    profileError = result.error;

    // Fallback: zoek op email in profiel
    if (!profileData && !profileError) {
      const emailResult = await supabase!
        .from('student_profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      profileData = emailResult.data;
      profileError = emailResult.error;
    }

    if (profileError) {
      throw new Error(`Fout bij ophalen profiel: ${profileError.message}`);
    }

    if (!profileData) {
      await logout();
      throw new Error('Profiel niet gevonden. Neem contact op met de beheerder.');
    }

    if (profileData.is_active === false) {
      await logout();
      throw new Error('Je account is gedeactiveerd. Neem contact op met je docent.');
    }

    return {
      name: profileData.name,
      level: profileData.level,
      strugglePoints: profileData.struggle_points,
      email: profileData.email,
      createdByAdmin: profileData.created_by_admin,
      isActive: profileData.is_active
    };

  } catch (error: any) {
    if (error.message) {
      throw error;
    }
    throw new Error('Er ging iets mis bij het inloggen');
  }
};

// ============================================================================
// ADMIN OPERATIES (via server-side API)
// ============================================================================

/**
 * Maak een nieuwe student account aan
 */
export const createStudentAccount = async (
  adminUsername: string,
  name: string,
  password: string,
  level: StudentLevel,
  strugglePoints: string,
  email?: string
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();

  if (!name || !password || !level) {
    return { success: false, error: 'Naam, wachtwoord en niveau zijn verplicht' };
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

/**
 * Haal alle studenten op (voor admin beheer)
 */
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

/**
 * Update een student profiel
 */
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

/**
 * Deactiveer een student account
 */
export const deactivateStudent = async (name: string): Promise<{ success: boolean; error?: string }> => {
  return updateStudent(name, { isActive: false });
};

/**
 * Activeer een student account
 */
export const activateStudent = async (name: string): Promise<{ success: boolean; error?: string }> => {
  return updateStudent(name, { isActive: true });
};

/**
 * Reset student wachtwoord
 */
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

/**
 * Helper: haal student op via naam
 */
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

/**
 * Verwijder een student account
 */
export const deleteStudent = async (
  name: string
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();
  return await apiDeleteStudent(name);
};
