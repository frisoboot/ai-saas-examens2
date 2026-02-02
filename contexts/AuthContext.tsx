import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { auth, userProfile } from '../services/supabaseService';
import { checkSubscription, SubscriptionStatus } from '../services/subscriptionService';
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
  subscriptionStatus: SubscriptionStatus | null;
  hasSubscriptionAccess: boolean;
  subscriptionLoading: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

// ============================================================================
// HELPERS
// ============================================================================

const getAdminEmails = (): string[] => {
  const adminEmailsStr = import.meta.env?.VITE_ADMIN_EMAILS as string || '';
  return adminEmailsStr.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
};

const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
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
    isAdmin: false,
    subscriptionStatus: null,
    hasSubscriptionAccess: false,
    subscriptionLoading: false
  });

  // Initialiseer auth en luister naar changes
  useEffect(() => {
    let mounted = true;

    const loadUserProfile = async (user: User) => {
      const profile = await userProfile.getCurrentProfile();
      if (mounted) {
        setState(prev => ({ ...prev, profile }));
      }
    };

    const loadSubscriptionStatus = async (email: string) => {
      // Admins hoeven geen subscription check
      if (isAdminEmail(email)) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            subscriptionStatus: null,
            hasSubscriptionAccess: true,
            subscriptionLoading: false
          }));
        }
        return;
      }

      if (mounted) {
        setState(prev => ({ ...prev, subscriptionLoading: true }));
      }

      try {
        const status = await checkSubscription(email);
        if (mounted) {
          setState(prev => ({
            ...prev,
            subscriptionStatus: status,
            hasSubscriptionAccess: status.hasAccess,
            subscriptionLoading: false
          }));
        }
      } catch (error) {
        console.error('[AuthContext] Subscription check failed:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            subscriptionStatus: null,
            hasSubscriptionAccess: false,
            subscriptionLoading: false
          }));
        }
      }
    };

    const initAuth = async () => {
      const { session } = await auth.getSession();

      if (session?.user && mounted) {
        setState(prev => ({
          ...prev,
          user: session.user,
          session,
          isAuthenticated: true,
          isAdmin: isAdminEmail(session.user.email),
          isLoading: false
        }));
        loadUserProfile(session.user);
        if (session.user.email) {
          loadSubscriptionStatus(session.user.email);
        }
      } else if (mounted) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setState(prev => ({
          ...prev,
          user: session.user,
          session,
          isAuthenticated: true,
          isAdmin: isAdminEmail(session.user.email)
        }));
        if (event === 'SIGNED_IN') {
          loadUserProfile(session.user);
          if (session.user.email) {
            loadSubscriptionStatus(session.user.email);
          }
        }
      } else {
        setState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          isAdmin: false,
          subscriptionStatus: null,
          hasSubscriptionAccess: false,
          subscriptionLoading: false
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign in functie
  // Let op: we zetten hier NIET isLoading, omdat dat de LoginPage zou unmounten
  // en de error state zou verliezen. LoginPage heeft zijn eigen isSubmitting state.
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { user, error } = await auth.signIn(email, password);

    if (error || !user) {
      return { error: error || 'Inloggen mislukt' };
    }

    // Profile wordt geladen via onAuthStateChange
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
    const profile = await userProfile.getCurrentProfile();
    setState(prev => ({ ...prev, profile }));
  };

  // Refresh subscription status
  const refreshSubscription = async () => {
    const email = state.user?.email;
    if (!email) return;

    if (isAdminEmail(email)) {
      setState(prev => ({ ...prev, hasSubscriptionAccess: true }));
      return;
    }

    setState(prev => ({ ...prev, subscriptionLoading: true }));
    try {
      const status = await checkSubscription(email);
      setState(prev => ({
        ...prev,
        subscriptionStatus: status,
        hasSubscriptionAccess: status.hasAccess,
        subscriptionLoading: false
      }));
    } catch (error) {
      console.error('[AuthContext] Subscription refresh failed:', error);
      setState(prev => ({ ...prev, subscriptionLoading: false }));
    }
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      signIn,
      signOut,
      refreshProfile,
      refreshSubscription
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
