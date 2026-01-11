import bcrypt from 'bcryptjs';
import { StudentProfile, AdminUser, StudentLevel } from '../types';
import { supabase } from './supabaseService';

const SALT_ROUNDS = 10;

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// Admin authentication
export const verifyAdminLogin = async (username: string, password: string): Promise<AdminUser | null> => {
  console.log('verifyAdminLogin called for user:', username);
  console.log('Supabase available:', !!supabase);

  if (!supabase) {
    // Fallback: hardcoded admin check (DEVELOPMENT ONLY - disable in production!)
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
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    console.log('Database query result:', { data, error });

    if (error) {
      console.error('Database error:', error);
      return null;
    }

    if (!data) {
      console.log('No admin user found in database');
      return null;
    }

    console.log('Found admin user, verifying password...');
    const isValid = await verifyPassword(password, data.password_hash);
    console.log('Password valid:', isValid);

    if (!isValid) return null;

    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id);

    return {
      id: data.id,
      username: data.username,
      passwordHash: data.password_hash,
      email: data.email,
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
    } else {
      console.error('Database login failed and fallback disabled in production');
    }

    return null;
  }
};

// Student authentication (updated for password hash)
export const verifyStudentLogin = async (name: string, password: string): Promise<StudentProfile | null> => {
  if (!supabase) {
    // LocalStorage fallback
    const stored = localStorage.getItem('ai_exam_students');
    const students: StudentProfile[] = stored ? JSON.parse(stored) : [];
    const student = students.find(s => s.name.toLowerCase() === name.toLowerCase());

    if (!student) return null;

    // Check if password is hashed or plain text
    if (student.passwordHash) {
      const isValid = await verifyPassword(password, student.passwordHash);
      return isValid ? student : null;
    } else if (student.password) {
      // Legacy plain text password (should be migrated)
      return student.password === password ? student : null;
    }

    return null;
  }

  try {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error || !data) return null;

    // Check password hash
    if (data.password_hash) {
      const isValid = await verifyPassword(password, data.password_hash);
      return isValid ? {
        name: data.name,
        passwordHash: data.password_hash,
        level: data.level,
        strugglePoints: data.struggle_points,
        email: data.email,
        createdByAdmin: data.created_by_admin,
        isActive: data.is_active
      } : null;
    }

    // Fallback to plain text password (migration case)
    if (data.password === password) {
      // TODO: Trigger password migration here
      return {
        name: data.name,
        password: data.password,
        level: data.level,
        strugglePoints: data.struggle_points,
        email: data.email
      };
    }

    return null;
  } catch (error) {
    console.error('Error verifying student login:', error);
    return null;
  }
};

// Admin creates student account
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

    const passwordHash = await hashPassword(password);

    const newStudent: StudentProfile = {
      name,
      passwordHash,
      level,
      strugglePoints,
      email,
      createdByAdmin: adminUsername,
      isActive: true
    };

    if (supabase) {
      console.log('Creating student in database:', newStudent.name);
      const { data, error } = await supabase
        .from('student_profiles')
        .insert({
          name: newStudent.name,
          password: 'MIGRATED', // Tijdelijke waarde voor oude kolom (wordt niet meer gebruikt)
          password_hash: newStudent.passwordHash,
          level: newStudent.level,
          struggle_points: newStudent.strugglePoints,
          email: newStudent.email,
          created_by_admin: newStudent.createdByAdmin,
          is_active: newStudent.isActive
        })
        .select();

      if (error) {
        console.error('Database error creating student:', error);
        throw error;
      }
      console.log('Student created successfully:', data);
    } else {
      // LocalStorage fallback
      const stored = localStorage.getItem('ai_exam_students');
      const students: StudentProfile[] = stored ? JSON.parse(stored) : [];
      students.push(newStudent);
      localStorage.setItem('ai_exam_students', JSON.stringify(students));
    }

    return { success: true };
  } catch (error) {
    console.error('Full error creating student:', error);
    console.error('Error type:', typeof error);
    console.error('Error details:', JSON.stringify(error, null, 2));

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
        passwordHash: d.password_hash,
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

// Update student (for password reset, level change, etc.)
export const updateStudent = async (
  name: string,
  updates: Partial<StudentProfile>
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (supabase) {
      const dbUpdates: any = {};
      if (updates.passwordHash) dbUpdates.password_hash = updates.passwordHash;
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

// Reset student password
export const resetStudentPassword = async (
  name: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const passwordHash = await hashPassword(newPassword);
    return updateStudent(name, { passwordHash, password: undefined });
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
        passwordHash: data.password_hash,
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

// Migrate plain text password to hash (one-time migration helper)
export const migratePasswordToHash = async (name: string, plainPassword: string): Promise<void> => {
  const passwordHash = await hashPassword(plainPassword);

  if (supabase) {
    await supabase
      .from('student_profiles')
      .update({ password_hash: passwordHash })
      .eq('name', name);
  } else {
    const stored = localStorage.getItem('ai_exam_students');
    const students: StudentProfile[] = stored ? JSON.parse(stored) : [];
    const student = students.find(s => s.name === name);
    if (student) {
      student.passwordHash = passwordHash;
      delete student.password;
      localStorage.setItem('ai_exam_students', JSON.stringify(students));
    }
  }
};
