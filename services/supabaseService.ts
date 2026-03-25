import { createClient, User, Session } from '@supabase/supabase-js';
import { Question, ExamResult, StudentProfile, AIStudyFeedback } from '../types';

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
  has_image?: boolean;
  source?: string;
  options?: string[];
  correct_index?: number;
  model_answer?: string;
  score?: number;
  exam_year?: number;
  exam_type?: 'practice' | 'official_exam';
  tijdvak?: number;
  worksheet_url?: string;
  worksheet_label?: string;
  requires_worksheet?: boolean;
  section?: string;
  section_intro?: string;
  exam_pdf_url?: string;
  pdf_page?: number;
  exam_bijlage_url?: string;
  bijlage_pdf_page?: number;
  exam_kaart_url?: string;
  kaart_pdf_page?: number;
  exam_links?: Array<{ title: string; url: string }>;
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
    hasImage: dbQuestion.has_image,
    source: dbQuestion.source,
    options: dbQuestion.options,
    correctIndex: dbQuestion.correct_index,
    modelAnswer: dbQuestion.model_answer,
    score: dbQuestion.score,
    examYear: dbQuestion.exam_year,
    examType: dbQuestion.exam_type,
    tijdvak: dbQuestion.tijdvak,
    worksheetUrl: dbQuestion.worksheet_url,
    worksheetLabel: dbQuestion.worksheet_label,
    requiresWorksheet: dbQuestion.requires_worksheet,
    section: dbQuestion.section,
    sectionIntro: dbQuestion.section_intro,
    examPdfUrl: dbQuestion.exam_pdf_url,
    pdfPage: dbQuestion.pdf_page,
    examBijlageUrl: dbQuestion.exam_bijlage_url,
    bijlagePdfPage: dbQuestion.bijlage_pdf_page,
    examKaartUrl: dbQuestion.exam_kaart_url,
    kaartPdfPage: dbQuestion.kaart_pdf_page,
    examLinks: dbQuestion.exam_links
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
    has_image: question.hasImage,
    source: question.source,
    options: question.options,
    correct_index: question.correctIndex,
    model_answer: question.modelAnswer,
    score: question.score,
    exam_year: question.examYear,
    exam_type: question.examType,
    tijdvak: question.tijdvak,
    worksheet_url: question.worksheetUrl,
    worksheet_label: question.worksheetLabel,
    requires_worksheet: question.requiresWorksheet,
    section: question.section,
    section_intro: question.sectionIntro,
    exam_pdf_url: question.examPdfUrl,
    pdf_page: question.pdfPage,
    exam_bijlage_url: question.examBijlageUrl,
    bijlage_pdf_page: question.bijlagePdfPage,
    exam_kaart_url: question.examKaartUrl,
    kaart_pdf_page: question.kaartPdfPage,
    exam_links: question.examLinks
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
  },

  // Haal vragen op gefilterd op vak
  async getBySubject(subject: string): Promise<Question[]> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { data, error } = await supabase
      .from(TABLES.QUESTIONS)
      .select('*')
      .eq('subject', subject)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fout bij ophalen vragen per vak:', error);
      throw error;
    }

    // Converteer database records naar TypeScript objects
    return (data || []).map(dbToQuestion);
  }
};

// Database interface for exam_results table
interface DbExamResult {
  id: string;
  student_name: string;
  subject: string;
  score: number;
  total_questions: number;
  date: string;
  answers: any[];
  exam_year?: number;
  exam_type?: string;
  duration_seconds?: number;
  level?: string;
  user_id?: string; // For RLS enforcement
  created_at?: string;
}

// Convert database object to TypeScript ExamResult
const dbToExamResult = (dbResult: DbExamResult): ExamResult => {
  return {
    id: dbResult.id,
    studentName: dbResult.student_name,
    subject: dbResult.subject,
    score: dbResult.score,
    totalQuestions: dbResult.total_questions,
    date: dbResult.date,
    answers: dbResult.answers,
    examYear: dbResult.exam_year,
    examType: dbResult.exam_type as any,
    durationSeconds: dbResult.duration_seconds,
    level: dbResult.level as any,
    user_id: dbResult.user_id
  };
};

// Convert TypeScript ExamResult to database object
const examResultToDb = (result: ExamResult): DbExamResult => {
  return {
    id: result.id,
    student_name: result.studentName,
    subject: result.subject,
    score: result.score,
    total_questions: result.totalQuestions,
    date: result.date,
    answers: result.answers as any,
    exam_year: result.examYear,
    exam_type: result.examType,
    duration_seconds: result.durationSeconds,
    level: result.level,
    user_id: result.user_id
  };
};

// Resultaten operaties
export const dbResults = {
  async getAll(): Promise<ExamResult[]> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { data, error } = await supabase
      .from(TABLES.RESULTS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fout bij ophalen resultaten:', error);
      throw error;
    }

    return (data || []).map(dbToExamResult);
  },

  async getByUser(userId: string): Promise<ExamResult[]> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { data, error } = await supabase
      .from(TABLES.RESULTS)
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Fout bij ophalen resultaten voor gebruiker:', error);
      throw error;
    }

    return (data || []).map(dbToExamResult);
  },

  async save(result: ExamResult): Promise<ExamResult> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    // Convert to database format
    const dbResult = examResultToDb(result);

    const { data, error } = await supabase
      .from(TABLES.RESULTS)
      .insert(dbResult)
      .select()
      .single();

    if (error) {
      console.error('Fout bij opslaan resultaat:', error);
      throw error;
    }

    return dbToExamResult(data);
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
    isActive: row.is_active ?? true,
    isAdmin: row.is_admin ?? false,
    selectedSubjects: row.selected_subjects ?? null
  };
};

// Student profielen operaties
export const dbStudents = {
  async save(profile: StudentProfile): Promise<StudentProfile> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    // Converteer naar database format (snake_case)
    const dbData: Record<string, any> = {
      email: profile.email,
      name: profile.name,
      level: profile.level,
      struggle_points: profile.strugglePoints || '',
      is_active: profile.isActive ?? true,
      // NOTE: is_admin is protected by RLS policy - normal users can't change it
      is_admin: profile.isAdmin ?? false
    };

    // Only include selected_subjects if explicitly set (avoid overwriting with undefined)
    if (profile.selectedSubjects !== undefined) {
      dbData.selected_subjects = profile.selectedSubjects;
    }

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

    // Log timestamp voor debugging van cache problemen
    const timestamp = Date.now();
    console.log(`[dbStudents.getAll] Ophalen studenten (timestamp: ${timestamp})`);

    const { data, error } = await supabase
      .from(TABLES.STUDENTS)
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Fout bij ophalen studenten:', error);
      throw error;
    }

    console.log(`[dbStudents.getAll] Studenten opgehaald: ${data?.length} records`);
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
  },

  async updateSelectedSubjects(email: string, selectedSubjects: string[] | null): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { error } = await supabase
      .from(TABLES.STUDENTS)
      .update({ selected_subjects: selectedSubjects })
      .eq('email', email);

    if (error) {
      console.error('Fout bij opslaan vakkenpakket:', error);
      throw error;
    }
  }
};

// ============================================================================
// AI STUDY FEEDBACK - Persoonlijk AI studieadvies per gebruiker
// ============================================================================

export const dbFeedback = {
  async getByUser(userId: string): Promise<(AIStudyFeedback & { lastExamDateAtGeneration?: string }) | null> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { data, error } = await supabase
      .from('ai_study_feedback')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Fout bij ophalen AI feedback:', error);
      throw error;
    }

    if (!data) return null;

    return {
      personalizedAdvice: data.personalized_advice || '',
      prioritySubjects: data.priority_subjects || [],
      weeklyGoal: data.weekly_goal || '',
      generatedAt: data.updated_at || data.created_at || new Date().toISOString(),
      lastExamDateAtGeneration: data.last_exam_date_at_generation || undefined
    };
  },

  async save(userId: string, feedback: AIStudyFeedback, lastExamDate?: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const dbData = {
      user_id: userId,
      personalized_advice: feedback.personalizedAdvice,
      priority_subjects: feedback.prioritySubjects,
      weekly_goal: feedback.weeklyGoal,
      last_exam_date_at_generation: lastExamDate || null
    };

    const { error } = await supabase
      .from('ai_study_feedback')
      .upsert(dbData, { onConflict: 'user_id' });

    if (error) {
      console.error('Fout bij opslaan AI feedback:', error);
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
   * Wist eerst localStorage en roept dan Supabase signOut aan
   */
  async signOut(): Promise<{ error: string | null }> {
    if (!supabase) {
      return { error: 'Supabase niet geconfigureerd' };
    }

    console.log('[auth.signOut] Starting sign out process...');

    // STAP 1: Wis localStorage EERST (voordat we Supabase aanroepen)
    // Dit voorkomt race conditions waarbij de client de sessie opnieuw laadt
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key === 'pending_payment_id')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        console.log('[auth.signOut] Removing localStorage key:', key);
        localStorage.removeItem(key);
      });
      console.log('[auth.signOut] localStorage items gewist:', keysToRemove.length);
    } catch (storageError) {
      console.warn('[auth.signOut] Kon localStorage niet wissen:', storageError);
    }

    try {
      // STAP 2: Roep Supabase signOut aan met 'local' scope
      const { error } = await supabase.auth.signOut({ scope: 'local' });

      if (error) {
        console.error('[auth.signOut] Supabase signOut error:', error);
        // We gaan toch door - localStorage is al gewist
      } else {
        console.log('[auth.signOut] Supabase signOut successful');
      }

      console.log('[auth.signOut] Sign out process completed');
      return { error: null };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Onbekende fout bij uitloggen';
      console.error('[auth.signOut] Exception:', errorMessage);
      // Return null error omdat we localStorage al hebben gewist
      return { error: null };
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
  },

  /**
   * Stuur wachtwoord reset email
   * Supabase stuurt een email met een link naar de reset pagina
   */
  async resetPasswordForEmail(email: string): Promise<{ error: string | null }> {
    if (!supabase) {
      return { error: 'Supabase niet geconfigureerd' };
    }

    // Bepaal de redirect URL gebaseerd op de huidige omgeving
    const redirectTo = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      console.error('Wachtwoord reset fout:', error);
      return { error: error.message };
    }

    return { error: null };
  },

  /**
   * Update wachtwoord na reset
   * Kan alleen worden aangeroepen als de gebruiker via de reset link is ingelogd
   */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    if (!supabase) {
      return { error: 'Supabase niet geconfigureerd' };
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('Wachtwoord update fout:', error);
      return { error: error.message };
    }

    return { error: null };
  }
};

// ============================================================================
// USER PROFILE - Combineer auth user met student profile
// ============================================================================

export const userProfile = {
  /**
   * Haal profiel op voor ingelogde gebruiker via email
   */
  async getCurrentProfile(): Promise<StudentProfile | null> {
    try {
      const { user, error: userError } = await auth.getUser();

      if (userError || !user?.email) {
        return null;
      }

      // Haal profiel op via email
      const profile = await dbStudents.getByEmail(user.email);

      // Return profiel of default voor admins zonder profiel
      return profile || {
        name: user.email.split('@')[0],
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
