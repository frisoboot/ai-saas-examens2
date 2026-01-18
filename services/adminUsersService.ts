import { auth } from './supabaseService';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface AdminUserResponse {
  success: boolean;
  userId?: string;
  email?: string;
  message?: string;
}

const getAccessToken = async (): Promise<string> => {
  const { session, error } = await auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('Niet ingelogd');
  }
  return session.access_token;
};

export const adminUsersService = {
  async createUser(email: string, password: string): Promise<AdminUserResponse> {
    try {
      const token = await getAccessToken();
      const response = await fetch(`${API_BASE}/api/admin/users/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.error || 'Account aanmaken mislukt'
        };
      }

      return { success: true, userId: data.userId, email: data.email };
    } catch (error) {
      console.error('Admin create user error:', error);
      return {
        success: false,
        message: `Netwerk fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`
      };
    }
  },

  async deleteUser(email: string): Promise<AdminUserResponse> {
    try {
      const token = await getAccessToken();
      const response = await fetch(`${API_BASE}/api/admin/users/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.error || 'Account verwijderen mislukt'
        };
      }

      return { success: true, userId: data.userId, email: data.email };
    } catch (error) {
      console.error('Admin delete user error:', error);
      return {
        success: false,
        message: `Netwerk fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`
      };
    }
  }
};
