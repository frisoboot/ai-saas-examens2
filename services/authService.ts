import { StudentProfile, AdminUser, StudentLevel } from '../types';
import { supabase, supabaseAdmin } from './supabaseService';
import { apiCreateStudent, apiResetPassword, apiDeleteStudent } from './apiService';

// ============================================================================
// SUPABASE AUTH INTEGRATIE - GEEN FALLBACKS
// Database en Supabase Auth zijn VEREIST
// ============================================================================

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase niet beschikbaar. Controleer je configuratie.');
  }
};

// Admin authentication - via API die admin user aanmaakt in Supabase Auth
export const verifyAdminLogin = async (username: string, password: string): Promise<AdminUser | null> => {
  requireSupabase();

  // Stap 1: API aanroepen om admin user aan te maken/updaten in Supabase Auth
  const response = await fetch('/api/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const apiResult = await response.json();

  if (!apiResult.success) {
    throw new Error(apiResult.error || 'Admin login mislukt');
  }

  // Stap 2: Nu inloggen via Supabase Auth (user bestaat nu)
  const email = `${username}@admin.local`;
  const { data, error } = await supabase!.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error(`Supabase Auth login mislukt: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Geen user data ontvangen van Supabase Auth');
  }

  // Stap 3: Controleer of user admin role heeft
  if (data.user.user_metadata?.role !== 'admin') {
    await supabase!.auth.signOut();
    throw new Error('User is geen admin');
  }

  return {
    id: data.user.id,
    username: data.user.user_metadata?.username || username,
    passwordHash: '',
    email: data.user.email,
    lastLogin: new Date().toISOString()
  };
};

// Student authentication met Supabase Auth
export const verifyStudentLogin = async (name: string, password: string): Promise<StudentProfile | null> => {
  requireSupabase();

  // Gebruik name@student.local als email format voor studenten
  const email = `${name.toLowerCase().replace(/\s+/g, '_')}@student.local`;

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

  // Check subscription status
  const now = new Date();
  const expiresAt = profileData.subscription_expires_at
    ? new Date(profileData.subscription_expires_at)
    : null;

  const hasValidSubscriptionStatus =
    profileData.subscription_status === 'trial' ||
    profileData.subscription_status === 'active';

  // Subscription is expired if:
  // 1. There's an expiration date AND it has passed, OR
  // 2. The subscription status is explicitly 'expired' or 'cancelled' or 'inactive'
  const isExpired = expiresAt !== null && expiresAt <= now;
  const hasInvalidStatus =
    profileData.subscription_status === 'expired' ||
    profileData.subscription_status === 'cancelled' ||
    profileData.subscription_status === 'inactive';

  // Determine if subscription should be considered expired
  const subscriptionExpired = !profileData.created_by_admin && (isExpired || hasInvalidStatus || !hasValidSubscriptionStatus);

  // If subscription expired, return profile with flag
  if (subscriptionExpired) {
    return {
      name: profileData.name,
      level: profileData.level,
      strugglePoints: profileData.struggle_points,
      email: profileData.email,
      createdByAdmin: profileData.created_by_admin,
      isActive: profileData.is_active,
      subscriptionStatus: profileData.subscription_status,
      subscriptionExpiresAt: profileData.subscription_expires_at,
      subscriptionExpired: true
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
};

// Admin creates student account - gebruikt API of supabaseAdmin
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

  // PRODUCTIE: Gebruik veilige API endpoint
  if (!supabaseAdmin) {
    return await apiCreateStudent(adminUsername, name, password, level, strugglePoints, email);
  }

  // DEVELOPMENT: Gebruik supabaseAdmin direct
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
    throw new Error(`Auth error: ${authError.message}`);
  }

  // Stap 2: Maak student profiel in database
  const { error: profileError } = await supabaseAdmin
    .from('student_profiles')
    .insert({
      name: name,
      level: level,
      struggle_points: strugglePoints,
      email: email || authEmail,
      created_by_admin: adminUsername,
      is_active: true,
      auth_user_id: authData.user.id
    });

  if (profileError) {
    // Rollback: verwijder auth user
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Database error: ${profileError.message}`);
  }

  return { success: true };
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

// Reset student password - gebruikt API of supabaseAdmin
export const resetStudentPassword = async (
  name: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();

  // PRODUCTIE: Gebruik veilige API endpoint
  if (!supabaseAdmin) {
    return await apiResetPassword(name, newPassword);
  }

  // DEVELOPMENT: Gebruik supabaseAdmin direct
  // Haal student profiel op om auth_user_id te krijgen
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('student_profiles')
    .select('auth_user_id')
    .eq('name', name)
    .single();

  if (profileError || !profileData?.auth_user_id) {
    throw new Error('Student niet gevonden');
  }

  // Update wachtwoord via admin API
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    profileData.auth_user_id,
    { password: newPassword }
  );

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { success: true };
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

// Delete student account - gebruikt API of supabaseAdmin
export const deleteStudent = async (
  name: string
): Promise<{ success: boolean; error?: string }> => {
  requireSupabase();

  // PRODUCTIE: Gebruik veilige API endpoint
  if (!supabaseAdmin) {
    return await apiDeleteStudent(name);
  }

  // DEVELOPMENT: Gebruik supabaseAdmin direct
  // Haal student profiel op om auth_user_id te krijgen
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('student_profiles')
    .select('auth_user_id')
    .eq('name', name)
    .maybeSingle();

  if (profileError) {
    throw new Error('Student niet gevonden');
  }

  if (!profileData) {
    throw new Error('Student niet gevonden');
  }

  const authUserId = profileData.auth_user_id;

  // Stap 1: Verwijder exam results
  const { error: resultsError } = await supabaseAdmin
    .from('exam_results')
    .delete()
    .eq('student_name', name);

  if (resultsError) throw resultsError;

  // Stap 2: Verwijder student progress
  const { error: progressError } = await supabaseAdmin
    .from('student_progress')
    .delete()
    .eq('student_name', name);

  if (progressError) throw progressError;

  // Stap 2b: Verwijder flashcard progress
  const { error: flashcardProgressError } = await supabaseAdmin
    .from('flashcard_progress')
    .delete()
    .eq('student_name', name);

  // Non-critical, log but don't throw
  if (flashcardProgressError) {
    console.error('Error deleting flashcard progress:', flashcardProgressError);
  }

  // Stap 2c: Verwijder subscription events
  const { error: subscriptionEventsError } = await supabaseAdmin
    .from('subscription_events')
    .delete()
    .eq('student_name', name);

  // Non-critical, log but don't throw
  if (subscriptionEventsError) {
    console.error('Error deleting subscription events:', subscriptionEventsError);
  }

  // Stap 3: Verwijder student profiel
  const { error: deleteProfileError } = await supabaseAdmin
    .from('student_profiles')
    .delete()
    .eq('name', name);

  if (deleteProfileError) {
    throw new Error(deleteProfileError.message);
  }

  // Stap 4: Verwijder Supabase Auth user (als die bestaat)
  if (authUserId) {
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);

    if (authDeleteError) {
      throw new Error(`Auth user kon niet worden verwijderd: ${authDeleteError.message}`);
    }
  }

  return { success: true };
};
