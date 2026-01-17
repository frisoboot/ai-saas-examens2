import { StudentProfile, AdminUser, StudentLevel } from '../types';
import { supabase } from './supabaseService';
import { apiCreateStudent, apiResetPassword, apiDeleteStudent } from './apiService';

// ============================================================================
// SUPABASE AUTH - VOLLEDIGE INTEGRATIE
//
// Dit bestand bevat alle authenticatie logica via Supabase Auth.
// Geen fallbacks, geen alternatieve auth methodes.
//
// SECURITY:
// - Alle admin operaties (student aanmaken, wachtwoord resetten, etc.)
//   gaan via server-side API endpoints
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
 * Check of een gebruiker een admin is gebaseerd op email
 */
const isAdminEmail = (email: string): boolean => {
  return email.endsWith('@admin.example.com');
};

/**
 * Check of een gebruiker een student is gebaseerd op email
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
    // We gooien geen error bij logout, de sessie is toch weg
  }
};

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Haal de huidige sessie op en bepaal of user student of admin is
 * Returns het profiel als er een geldige sessie is, anders null
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

    // Check admin eerst (email domain check)
    if (isAdminEmail(email)) {
      const username = email.replace('@admin.example.com', '').replace(/_/g, ' ');
      return {
        type: 'admin',
        profile: null,
        admin: {
          id: user.id,
          username: username,
          passwordHash: '',
          email: email,
          lastLogin: new Date().toISOString()
        }
      };
    }

    // Check student (email domain check)
    if (isStudentEmail(email)) {
      // Haal student profiel op
      const studentName = user.user_metadata?.name;
      let profileData = null;

      if (studentName) {
        const result = await supabase!
          .from('student_profiles')
          .select('*')
          .eq('name', studentName)
          .maybeSingle();
        profileData = result.data;
      }

      // Fallback: zoek op auth_user_id
      if (!profileData) {
        const fallbackResult = await supabase!
          .from('student_profiles')
          .select('*')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        profileData = fallbackResult.data;
      }

      if (!profileData) {
        // Student profiel niet gevonden, log uit
        await logout();
        return null;
      }

      // Check of account actief is
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

    // Onbekend user type, log uit
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
 * Admins moeten handmatig aangemaakt worden in de Supabase Auth dashboard:
 * 1. Ga naar Authentication > Users
 * 2. Klik "Add user" > "Create new user"
 * 3. Email: username@admin.example.com
 * 4. Wachtwoord: minimaal 12 karakters
 * 5. Auto confirm: aan
 * 6. User metadata: { "role": "admin", "name": "username" }
 */
export const verifyAdminLogin = async (username: string, password: string): Promise<AdminUser | null> => {
  requireSupabase();

  // Valideer input
  if (!username || !password) {
    throw new Error('Gebruikersnaam en wachtwoord zijn verplicht');
  }

  // Converteer username naar email format
  const email = `${username.toLowerCase().replace(/\s+/g, '_')}@admin.example.com`;

  try {
    const { data, error } = await supabase!.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Geef generieke foutmelding om security info niet te lekken
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Gebruikersnaam of wachtwoord onjuist');
      }
      throw new Error(`Login mislukt: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Geen user data ontvangen');
    }

    // Verifieer dat dit een admin is (email check)
    if (!isAdminEmail(data.user.email || '')) {
      await logout();
      throw new Error('Dit account heeft geen admin rechten');
    }

    return {
      id: data.user.id,
      username: username,
      passwordHash: '',
      email: data.user.email,
      lastLogin: new Date().toISOString()
    };

  } catch (error: any) {
    // Re-throw met duidelijke message
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
 */
export const verifyStudentLogin = async (name: string, password: string): Promise<StudentProfile | null> => {
  requireSupabase();

  // Valideer input
  if (!name || !password) {
    throw new Error('Naam en wachtwoord zijn verplicht');
  }

  // Converteer naam naar email format
  const email = `${name.toLowerCase().replace(/\s+/g, '_')}@student.example.com`;

  try {
    const { data, error } = await supabase!.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Naam of wachtwoord onjuist');
      }
      throw new Error(`Login mislukt: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Geen user data ontvangen');
    }

    // Verifieer dat dit een student is
    const userEmail = data.user.email || '';
    if (!isStudentEmail(userEmail)) {
      await logout();
      throw new Error('Dit is geen student account');
    }

    // Check ook de role metadata voor extra zekerheid
    const role = data.user.user_metadata?.role;
    if (role && role !== 'student') {
      await logout();
      throw new Error('Dit is geen student account');
    }

    // Haal student profiel op uit database
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

    // Fallback: zoek op auth_user_id
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
      throw new Error(`Fout bij ophalen profiel: ${profileError.message}`);
    }

    if (!profileData) {
      await logout();
      throw new Error('Student profiel niet gevonden. Neem contact op met de beheerder.');
    }

    // Check of account actief is
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
 * Gaat via server-side API voor veiligheid
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

  // Valideer input
  if (!name || !password || !level) {
    return { success: false, error: 'Naam, wachtwoord en niveau zijn verplicht' };
  }

  if (password.length < 8) {
    return { success: false, error: 'Wachtwoord moet minimaal 8 karakters zijn' };
  }

  // Check of student al bestaat
  const existing = await getStudentByName(name);
  if (existing) {
    return { success: false, error: 'Student met deze naam bestaat al' };
  }

  // Gebruik veilige server-side API endpoint
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
 * Gaat via server-side API voor veiligheid
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
 * Gaat via server-side API voor veiligheid
 */
export const deleteStudent = async (
  name: string
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();
  return await apiDeleteStudent(name);
};
