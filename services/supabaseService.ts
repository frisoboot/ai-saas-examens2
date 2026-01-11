import { createClient } from '@supabase/supabase-js';
import { Question, ExamResult, StudentProfile } from '../types';

// Supabase configuratie - deze waarden moeten in .env.local staan
const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials niet gevonden. Gebruik localStorage als fallback.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database tabellen namen
const TABLES = {
  QUESTIONS: 'questions',
  RESULTS: 'exam_results',
  STUDENTS: 'student_profiles'
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

    return data || [];
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

    return data;
  },

  // Sla een vraag op (create of update)
  async save(question: Question): Promise<Question> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { data, error } = await supabase
      .from(TABLES.QUESTIONS)
      .upsert(question, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Fout bij opslaan vraag:', error);
      throw error;
    }

    return data;
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

    return data || [];
  }
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

    return data || [];
  },

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

    return data;
  },

  async save(profile: StudentProfile): Promise<StudentProfile> {
    if (!supabase) {
      throw new Error('Supabase niet geconfigureerd');
    }

    const { data, error } = await supabase
      .from(TABLES.STUDENTS)
      .upsert(profile, { onConflict: 'name' })
      .select()
      .single();

    if (error) {
      console.error('Fout bij opslaan student:', error);
      throw error;
    }

    return data;
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

    return data || [];
  }
};
