/**
 * API Service - Roept Vercel serverless functions aan
 *
 * Deze service communiceert met de backend API voor veilige operaties
 * die de service role key nodig hebben.
 */

import { supabase } from './supabaseService';
import { StudentLevel } from '../types';

// Bepaal de API base URL
const getApiBaseUrl = (): string => {
  // In development: gebruik localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:3001/api';
  }
  // In production: gebruik string concatenatie i.p.v. URL constructor
  // De URL constructor kan "The string did not match the expected pattern" geven in Safari
  // of andere browsers bij bepaalde edge cases
  return `${window.location.origin}/api`;
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Haal het auth token op van de huidige user
 */
const getAuthToken = async (): Promise<string | null> => {
  if (!supabase) return null;

  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};

/**
 * Maak een nieuwe student account aan via de API
 */
export const apiCreateStudent = async (
  adminUsername: string,
  name: string,
  password: string,
  level: StudentLevel,
  strugglePoints: string,
  email?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Niet ingelogd' };
    }

    const response = await fetch(`${API_BASE_URL}/create-student`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        adminUsername,
        name,
        password,
        level,
        strugglePoints,
        email
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API error:', data);
      return { success: false, error: data.error || 'Er ging iets mis' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error calling create-student API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Netwerkfout'
    };
  }
};

/**
 * Reset het wachtwoord van een student via de API
 */
export const apiResetPassword = async (
  studentName: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Niet ingelogd' };
    }

    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        studentName,
        newPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API error:', data);
      return { success: false, error: data.error || 'Er ging iets mis' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error calling reset-password API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Netwerkfout'
    };
  }
};

/**
 * Verwijder een student account via de API
 */
export const apiDeleteStudent = async (
  studentName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const token = await getAuthToken();
    if (!token) {
      return { success: false, error: 'Niet ingelogd' };
    }

    const response = await fetch(`${API_BASE_URL}/delete-student`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        studentName
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API error:', data);
      return { success: false, error: data.error || 'Er ging iets mis' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error calling delete-student API:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Netwerkfout'
    };
  }
};
