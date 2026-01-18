import { createClient, User, Session } from '@supabase/supabase-js';
import { Question, ExamResult, StudentProfile } from '../types';

/**
 * Supabase Client - Browser-side database access
 *
 * SECURITY: Alleen de anon key wordt in de browser geladen.
 * De anon key is ontworpen om publiek te zijn - beveiliging gebeurt via Row Level Security (RLS).
 * De service role key wordt NOOIT in de browser geladen en is alleen beschikbaar in /api endpoints.
 */

// Supabase configuratie - deze waarden moeten in .env.local staan
const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials niet gevonden. Gebruik localStorage als fallback.');
}

// Public client - gebruikt door studenten en voor login
// De anon key is veilig om te gebruiken in de browser (beschermd door RLS)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// NOTE: supabaseAdmin is verwijderd uit de browser code voor veiligheid
// Admin operaties moeten via server-side API endpoints gaan (/api/*)

// Database tabellen namen
const TABLES = {
  QUESTIONS: 'questions',
  RESULTS: 'exam_results',
  STUDENTS: 'student_profiles'
};

// ============================================================================
// DATA TRANSFORMATION HELPERS
// Converteer tussen snake_case (database) en camelCase (TypeScript)
// ============================================================================

interface DbQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'OPEN';
  subject: string;
  level: 'VMBO-TL' | 'HAVO' | 'VWO';
  text: string;
  context_text?: string;
  image_url?: string;
  source?: string;
  options?: string[];
  correct_index?: number;
  model_answer?: string;
  exam_year?: number;
  exam_type?: 'practice' | 'official_exam';
  created_at?: string;
  updated_at?: string;
}

// Converteer database object (snake_case) naar TypeScript object (camelCase)
const dbToQuestion = (dbQuestion: DbQuestion): Question => {
  return {
    id: dbQuestion.id,
    type: dbQuestion.type,
    subject: dbQuestion.subject,
    level: dbQuestion.level,
    text: dbQuestion.text,
    contextText: dbQuestion.context_text,
    imageUrl: dbQuestion.image_url,
    source: dbQuestion.source,
    options: dbQuestion.options,
    correctIndex: dbQuestion.correct_index,
    modelAnswer: dbQuestion.model_answer,
    examYear: dbQuestion.exam_year,
    examType: dbQuestion.exam_type
  };
};

// Converteer TypeScript object (camelCase) naar database object (snake_case)
const questionToDb = (question: Question): DbQuestion => {
  return {
    id: question.id,
    type: question.type,
    subject: question.subject,
    level: question.level,
    text: question.text,
    context_text: question.contextText,
    image_url: question.imageUrl,
    source: question.source,
    options: question.options,
    correct_index: question.correctIndex,
    model_answer: question.modelAnswer,
    exam_year: question.examYear,
    exam_type: question.examType
  };
};

// Vragen operaties
export const dbQuestions = {
  // Haal alle vragen op
  async getAll(): Promise<Question[]> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { data, error } = await supabase
      .from(TABLES.QUESTIONS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fout bij ophalen vragen:', error);
      throw error;
    }

    // Converteer database records naar TypeScript objects
    return (data || []).map(dbToQuestion);
  },

  // Haal één vraag op
  async getById(id: string): Promise<Question | null> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { data, error } = await supabase
      .from(TABLES.QUESTIONS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      console.error('Fout bij ophalen vraag:', error);
      throw error;
    }

    // Converteer database record naar TypeScript object
    return data ? dbToQuestion(data) : null;
  },

  // Sla een vraag op (create of update)
  async save(question: Question): Promise<Question> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    // Converteer TypeScript object naar database format
    const dbQuestion = questionToDb(question);

    const { data, error } = await supabase
      .from(TABLES.QUESTIONS)
      .upsert(dbQuestion, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Fout bij opslaan vraag:', error);
      throw new Error(`Database fout: ${error.message}`);
    }

    // Converteer terug naar TypeScript format
    return dbToQuestion(data);
  },

  // Verwijder een vraag
  async delete(id: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { error } = await supabase
      .from(TABLES.QUESTIONS)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Fout bij verwijderen vraag:', error);
      throw error;
    }
  }
};

// Resultaten operaties
export const dbResults = {
  async save(result: ExamResult): Promise<ExamResult> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { data, error } = await supabase
      .from(TABLES.RESULTS)
      .insert(result)
      .select()
      .single();

    if (error) {
      console.error('Fout bij opslaan resultaat:', error);
      throw error;
    }

    return data;
  }
};

// Helper: converteer database row naar StudentProfile
const mapDbToProfile = (row: any): StudentProfile | null => {
  if (!row) return null;
  return {
    name: row.name,
    level: row.level,
    strugglePoints: row.struggle_points || '',
    email: row.email,
    isActive: row.is_active ?? true
  };
};

// Student profielen operaties
export const dbStudents = {
  async getByName(name: string): Promise<StudentProfile | null> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { data, error } = await supabase
      .from(TABLES.STUDENTS)
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error) {
      console.error('Fout bij ophalen student:', error);
      throw error;
    }

    return mapDbToProfile(data);
  },

  async save(profile: StudentProfile): Promise<StudentProfile> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    // Converteer naar database format (snake_case)
    const dbData = {
      email: profile.email,
      name: profile.name,
      level: profile.level,
      struggle_points: profile.strugglePoints || '',
      is_active: profile.isActive ?? true
    };

    const { data, error } = await supabase
      .from(TABLES.STUDENTS)
      .upsert(dbData, { onConflict: 'email' })
      .select()
      .single();

    if (error) {
      console.error('Fout bij opslaan student:', error);
      throw error;
    }

    return mapDbToProfile(data)!;
  },

  async getAll(): Promise<StudentProfile[]> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { data, error } = await supabase
      .from(TABLES.STUDENTS)
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Fout bij ophalen studenten:', error);
      throw error;
    }

    return (data || []).map(row => mapDbToProfile(row)!);
  },

  async getByEmail(email: string): Promise<StudentProfile | null> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { data, error } = await supabase
      .from(TABLES.STUDENTS)
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Fout bij ophalen student via email:', error);
      throw error;
    }

    return mapDbToProfile(data);
  },

  async delete(email: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { error } = await supabase
      .from(TABLES.STUDENTS)
      .delete()
      .eq('email', email);

    if (error) {
      console.error('Fout bij verwijderen student profiel:', error);
      throw error;
    }
  }
};

// ============================================================================
// AUTHENTICATION - Supabase Auth functies
// ============================================================================

export const auth = {
  /**
   * Inloggen met email en wachtwoord
   */
  async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    if (!supabase) {
      return { user: null, error: 'Supabase niet geconfigureerd' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Inlogfout:', error);
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  },

  /**
   * Uitloggen
   * Gebruikt scope: 'global' om alle sessies te beëindigen voor betere stabiliteit
   */
  async signOut(): Promise<{ error: string | null }> {
    if (!supabase) {
      return { error: 'Supabase niet geconfigureerd' };
    }

    try {
      // Gebruik 'global' scope om alle sessies te beëindigen
      // Dit voorkomt problemen met stale sessies
      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        console.error('Uitlogfout:', error);
        return { error: error.message || 'Supabase logout failed' };
      }

      return { error: null };
    } catch (err) {
      // Vang network errors en andere exceptions op
      const errorMessage = err instanceof Error ? err.message : 'Onbekende fout bij uitloggen';
      console.error('Uitloggen exception:', errorMessage);
      return { error: errorMessage };
    }
  },

  /**
   * Huidige sessie ophalen
   */
  async getSession(): Promise<{ session: Session | null; error: string | null }> {
    if (!supabase) {
      return { session: null, error: 'Supabase niet geconfigureerd' };
    }

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Sessie ophalen mislukt:', error);
      return { session: null, error: error.message };
    }

    return { session: data.session, error: null };
  },

  /**
   * Huidige gebruiker ophalen
   */
  async getUser(): Promise<{ user: User | null; error: string | null }> {
    if (!supabase) {
      return { user: null, error: 'Supabase niet geconfigureerd' };
    }

    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Gebruiker ophalen mislukt:', error);
      return { user: null, error: error.message };
    }

    return { user: data.user, error: null };
  },

  /**
   * Luister naar auth state changes (login/logout)
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    if (!supabase) {
      console.warn('Supabase niet geconfigureerd - auth listener niet actief');
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange(callback);
  }
};

// ============================================================================
// USER PROFILE - Combineer auth user met student profile
// ============================================================================

export const userProfile = {
  /**
   * Haal volledig profiel op voor ingelogde gebruiker
   * Combineert Supabase Auth user met student_profiles tabel
   */
  async getCurrentProfile(): Promise<StudentProfile | null> {
    try {
      const { user, error: userError } = await auth.getUser();

      if (userError || !user) {
        return null;
      }

      // Probeer profiel te vinden via email
      try {
        const profile = await dbStudents.getByEmail(user.email || '');
        if (profile) {
          return profile;
        }
      } catch (e) {
        console.log('Geen profiel gevonden via email, probeer naam');
      }

      // Fallback: probeer via naam (voor oudere accounts)
      try {
        const profileByName = await dbStudents.getByName(user.email?.split('@')[0] || '');
        if (profileByName) {
          return profileByName;
        }
      } catch (e) {
        console.log('Geen profiel gevonden via naam');
      }

      // Als geen profiel gevonden, maak een default profiel voor admins
      return {
        name: user.email?.split('@')[0] || 'User',
        level: 'HAVO',
        strugglePoints: '',
        email: user.email,
        isActive: true
      };
    } catch (error) {
      console.error('Fout bij ophalen profiel:', error);
      return null;
    }
  }
};
