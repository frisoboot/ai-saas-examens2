import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { auth, userProfile } from '../services/supabaseService';
import { StudentProfile } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: StudentProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

// ============================================================================
// HELPERS
// ============================================================================

// Check of email in admin lijst staat (via VITE_ADMIN_EMAILS env var)
const getAdminEmails = (): string[] => {
  const adminEmailsStr = import.meta.env?.VITE_ADMIN_EMAILS as string || '';
  return adminEmailsStr.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
};

const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
};

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false
  });

  // Laad profiel voor huidige user
  const loadProfile = useCallback(async () => {
    try {
      const profile = await userProfile.getCurrentProfile();
      setState(prev => ({ ...prev, profile }));
    } catch (error) {
      console.error('Fout bij laden profiel:', error);
    }
  }, []);

  // Initialiseer auth state bij mount
  useEffect(() => {
    const initAuth = async () => {
      const { session } = await auth.getSession();

      if (session?.user) {
        setState(prev => ({
          ...prev,
          user: session.user,
          session,
          isAuthenticated: true,
          isAdmin: isAdminEmail(session.user.email),
          isLoading: false
        }));

        // Laad profiel apart
        const profile = await userProfile.getCurrentProfile();
        setState(prev => ({ ...prev, profile }));
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false
        }));
      }
    };

    initAuth();

    // DEBUG: Alleen SIGNED_IN en SIGNED_OUT afhandelen
    // INITIAL_SESSION en TOKEN_REFRESHED negeren (veroorzaken tab switch bugs)
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('🔵 Auth event:', event, 'session:', session ? 'exists' : 'null');

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ SIGNED_IN - state bijwerken');
        setState(prev => ({
          ...prev,
          user: session.user,
          session,
          isAuthenticated: true,
          isAdmin: isAdminEmail(session.user.email),
          isLoading: false
        }));
        const profile = await userProfile.getCurrentProfile();
        setState(prev => ({ ...prev, profile }));
      } else if (event === 'SIGNED_OUT') {
        console.log('✅ SIGNED_OUT - state resetten');
        setState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          isAdmin: false
        });
      } else {
        console.log('🔴 Event GENEGEERD:', event);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in functie
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    setState(prev => ({ ...prev, isLoading: true }));

    const { user, error } = await auth.signIn(email, password);

    if (error || !user) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { error: error || 'Inloggen mislukt' };
    }

    // Profile wordt geladen via onAuthStateChange
    setState(prev => ({ ...prev, isLoading: false }));
    return { error: null };
  };

  // Sign out functie
  const signOut = async (): Promise<{ error: string | null }> => {
    console.log('[AuthContext] Starting sign out...');

    // STAP 1: Reset state EERST (optimistische update)
    // Dit zorgt ervoor dat de UI direct reageert
    setState({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false
    });

    try {
      // STAP 2: Roep de auth service aan
      const { error } = await auth.signOut();

      if (error) {
        console.warn('[AuthContext] Uitloggen warning:', error);
        // We loggen alleen een warning, want de state is al gereset
      }

      console.log('[AuthContext] Sign out completed');
      return { error: null };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Onbekende fout bij uitloggen';
      console.error('[AuthContext] Uitloggen exception:', errorMessage);
      // Return null want state is al gereset
      return { error: null };
    }
  };

  // Refresh profile
  const refreshProfile = async () => {
    await loadProfile();
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      signIn,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth moet binnen AuthProvider gebruikt worden');
  }

  return context;
};
