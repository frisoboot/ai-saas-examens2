import { ExamResult } from '../types';
import { supabase } from './supabaseService';

// Database is VEREIST - geen fallbacks meer
const requireDatabase = () => {
  if (!supabase) {
    throw new Error('Database niet beschikbaar. Controleer je Supabase configuratie.');
  }
};

// Update progress after exam completion
export const updateProgressAfterExam = async (result: ExamResult): Promise<void> => {
  requireDatabase();

  const { data: existing } = await supabase!
    .from('student_progress')
    .select('*')
    .eq('student_name', result.studentName)
    .eq('subject', result.subject)
    .maybeSingle();

  const newTotalExams = (existing?.total_exams_taken || 0) + 1;
  const newTotalQuestions = (existing?.total_questions_answered || 0) + result.totalQuestions;
  const newTotalCorrect = (existing?.total_correct_answers || 0) + result.score;
  const newAverageScore = (newTotalCorrect / newTotalQuestions) * 100;

  // Calculate improvement rate
  let newImprovementRate = existing?.improvement_rate || 0;
  if (existing && newTotalExams >= 4) {
    // Fetch recent exam results to calculate improvement
    const { data: recentResults, error: recentError } = await supabase!
      .from('exam_results')
      .select('score, total_questions, date')
      .eq('student_name', result.studentName)
      .eq('subject', result.subject)
      .order('date', { ascending: true });

    if (recentError) throw recentError;

    if (recentResults && recentResults.length >= 4) {
      const mid = Math.floor(recentResults.length / 2);
      const firstHalf = recentResults.slice(0, mid);
      const secondHalf = recentResults.slice(mid);

      const firstAvg = firstHalf.reduce((sum, r) => sum + (r.score / r.total_questions), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, r) => sum + (r.score / r.total_questions), 0) / secondHalf.length;

      newImprovementRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
    }
  }

  if (existing) {
    const { error } = await supabase!
      .from('student_progress')
      .update({
        total_exams_taken: newTotalExams,
        total_questions_answered: newTotalQuestions,
        total_correct_answers: newTotalCorrect,
        average_score: Math.round(newAverageScore * 100) / 100,
        last_exam_date: result.date,
        improvement_rate: Math.round(newImprovementRate * 100) / 100
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase!
      .from('student_progress')
      .insert({
        id: `${result.studentName}-${result.subject}-${Date.now()}`,
        student_name: result.studentName,
        subject: result.subject,
        total_exams_taken: newTotalExams,
        total_questions_answered: newTotalQuestions,
        total_correct_answers: newTotalCorrect,
        average_score: Math.round(newAverageScore * 100) / 100,
        last_exam_date: result.date,
        improvement_rate: 0
      });

    if (error) throw error;
  }
};
