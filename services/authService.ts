import { StudentProfile, AdminUser, StudentLevel } from '../types';
import { supabase } from './supabaseService';

// ============================================================================
// AUTHENTICATION SERVICE
// - Admin: server-side token authenticatie
// - Student: Supabase Auth
// ============================================================================

const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_USER_KEY = 'admin_user';

// Admin token management
export const getAdminToken = (): string | null => {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
};

export const setAdminToken = (token: string, username: string): void => {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify({ username }));
};

export const clearAdminToken = (): void => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
};

export const getStoredAdmin = (): AdminUser | null => {
  const data = localStorage.getItem(ADMIN_USER_KEY);
  if (!data) return null;
  try {
    const { username } = JSON.parse(data);
    return {
      id: 'admin',
      username,
      passwordHash: '',
      lastLogin: new Date().toISOString()
    };
  } catch {
    return null;
  }
};

// API base URL
const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return 'http://localhost:3001/api';
  }
  return `${window.location.origin}/api`;
};

// Admin login via server-side API
export const verifyAdminLogin = async (username: string, password: string): Promise<AdminUser | null> => {
  const response = await fetch(`${getApiBaseUrl()}/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Login mislukt');
  }

  // Sla token op
  setAdminToken(data.token, data.admin.username);

  return {
    id: 'admin',
    username: data.admin.username,
    passwordHash: '',
    lastLogin: new Date().toISOString()
  };
};

// Student login via Supabase Auth
export const verifyStudentLogin = async (name: string, password: string): Promise<StudentProfile | null> => {
  if (!supabase) {
    throw new Error('Supabase niet beschikbaar');
  }

  const email = `${name.toLowerCase().replace(/\s+/g, '_')}@student.example.com`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error('Naam of wachtwoord onjuist');
  }

  if (!data.user) {
    throw new Error('Login mislukt');
  }

  // Haal student profiel op
  const { data: profile, error: profileError } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('name', data.user.user_metadata?.name || name)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    throw new Error('Profiel niet gevonden');
  }

  return {
    name: profile.name,
    level: profile.level,
    strugglePoints: profile.struggle_points,
    email: profile.email,
    createdByAdmin: profile.created_by_admin,
    isActive: profile.is_active
  };
};

// Get all students (admin only)
export const getAllStudents = async (): Promise<StudentProfile[]> => {
  if (!supabase) {
    throw new Error('Supabase niet beschikbaar');
  }

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
};

// Create student account via API
export const createStudentAccount = async (
  adminUsername: string,
  name: string,
  password: string,
  level: StudentLevel,
  strugglePoints: string,
  email?: string
): Promise<{ success: boolean; error?: string }> => {
  const token = getAdminToken();
  if (!token) {
    return { success: false, error: 'Niet ingelogd als admin' };
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/create-student`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, password, level, strugglePoints, email })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Fout bij aanmaken' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Netwerkfout' };
  }
};

// Update student
export const updateStudent = async (
  name: string,
  updates: Partial<StudentProfile>
): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) {
    return { success: false, error: 'Supabase niet beschikbaar' };
  }

  const dbUpdates: Record<string, unknown> = {};
  if (updates.level) dbUpdates.level = updates.level;
  if (updates.strugglePoints !== undefined) dbUpdates.struggle_points = updates.strugglePoints;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { error } = await supabase
    .from('student_profiles')
    .update(dbUpdates)
    .eq('name', name);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};

// Deactivate student
export const deactivateStudent = async (name: string): Promise<{ success: boolean; error?: string }> => {
  return updateStudent(name, { isActive: false });
};

// Activate student
export const activateStudent = async (name: string): Promise<{ success: boolean; error?: string }> => {
  return updateStudent(name, { isActive: true });
};

// Reset student password via API
export const resetStudentPassword = async (
  name: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const token = getAdminToken();
  if (!token) {
    return { success: false, error: 'Niet ingelogd als admin' };
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ studentName: name, newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Fout bij resetten' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Netwerkfout' };
  }
};

// Delete student via API
export const deleteStudent = async (name: string): Promise<{ success: boolean; error?: string }> => {
  const token = getAdminToken();
  if (!token) {
    return { success: false, error: 'Niet ingelogd als admin' };
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/delete-student`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ studentName: name })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Fout bij verwijderen' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Netwerkfout' };
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  clearAdminToken();
  if (supabase) {
    await supabase.auth.signOut();
  }
};
