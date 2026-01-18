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
  signOut: () => Promise<void>;
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

    // Luister naar auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);

      if (session?.user) {
        setState(prev => ({
          ...prev,
          user: session.user,
          session,
          isAuthenticated: true,
          isAdmin: isAdminEmail(session.user.email)
        }));

        // Laad profiel bij login
        if (event === 'SIGNED_IN') {
          const profile = await userProfile.getCurrentProfile();
          setState(prev => ({ ...prev, profile }));
        }
      } else {
        setState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          isAdmin: false
        });
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
  const signOut = async () => {
    await auth.signOut();
    setState({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false
    });
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
