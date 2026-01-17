import { StudentProfile, AdminUser, StudentLevel } from '../types';
import { supabase } from './supabaseService';

// ============================================================================
// AUTHENTICATION SERVICE
// - Admin: server-side token authenticatie via /api/admin
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

// API base URL
const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return 'http://localhost:3001/api';
  }
  return `${window.location.origin}/api`;
};

// Admin API call helper
const adminApiCall = async (action: string, data: Record<string, unknown> = {}) => {
  const token = getAdminToken();
  const response = await fetch(`${getApiBaseUrl()}/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ action, ...data })
  });
  return response.json();
};

// Admin login
export const verifyAdminLogin = async (username: string, password: string): Promise<AdminUser | null> => {
  const data = await adminApiCall('login', { username, password });

  if (!data.success) {
    throw new Error(data.error || 'Login mislukt');
  }

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

// Get all students via API
export const getAllStudents = async (): Promise<StudentProfile[]> => {
  const data = await adminApiCall('list-students');

  if (!data.success) {
    throw new Error(data.error || 'Kon studenten niet ophalen');
  }

  return (data.students || []).map((d: Record<string, unknown>) => ({
    name: d.name as string,
    level: d.level as string,
    strugglePoints: d.struggle_points as string,
    email: d.email as string,
    createdByAdmin: d.created_by_admin as string,
    isActive: d.is_active as boolean
  }));
};

// Create student
export const createStudentAccount = async (
  _adminUsername: string,
  name: string,
  password: string,
  level: StudentLevel,
  strugglePoints: string,
  email?: string
): Promise<{ success: boolean; error?: string }> => {
  const data = await adminApiCall('create-student', { name, password, level, strugglePoints, email });
  return data.success ? { success: true } : { success: false, error: data.error };
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

// Reset password
export const resetStudentPassword = async (
  name: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const data = await adminApiCall('reset-password', { studentName: name, newPassword });
  return data.success ? { success: true } : { success: false, error: data.error };
};

// Delete student
export const deleteStudent = async (name: string): Promise<{ success: boolean; error?: string }> => {
  const data = await adminApiCall('delete-student', { studentName: name });
  return data.success ? { success: true } : { success: false, error: data.error };
};

// Sign out
export const signOut = async (): Promise<void> => {
  clearAdminToken();
  if (supabase) {
    await supabase.auth.signOut();
  }
};
