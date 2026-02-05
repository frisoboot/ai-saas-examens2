import { StudentProgress, ExamResult, TopicAnalysis } from '../types';
import { supabase, dbResults } from './supabaseService';
import { getQuestions } from './storageService';

// Database is VEREIST - geen fallbacks meer
const requireDatabase = () => {
  if (!supabase) {
    throw new Error('Database niet beschikbaar. Controleer je Supabase configuratie.');
  }
};

// Calculate progress statistics from exam results
export const calculateProgress = (
  studentName: string,
  subject: string,
  examResults: ExamResult[]
): StudentProgress => {
  const subjectResults = examResults.filter(
    r => r.studentName === studentName && r.subject === subject
  );

  if (subjectResults.length === 0) {
    return {
      id: `${studentName}-${subject}`,
      studentName,
      subject,
      totalExamsTaken: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      averageScore: 0,
      recentScores: []
    };
  }

  const totalExamsTaken = subjectResults.length;
  const totalQuestionsAnswered = subjectResults.reduce((sum, r) => sum + r.totalQuestions, 0);
  const totalCorrectAnswers = subjectResults.reduce((sum, r) => sum + r.score, 0);
  const averageScore = (totalCorrectAnswers / totalQuestionsAnswered) * 100;

  // Get last 5 exam scores for trend (sorted by date, newest first)
  const sortedResults = [...subjectResults].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const recentScores = sortedResults
    .slice(0, 5)
    .map(r => Math.round((r.score / r.totalQuestions) * 100));

  // Calculate improvement rate (comparing first half vs second half of exams)
  let improvementRate = 0;
  if (totalExamsTaken >= 4) {
    const chronologicalResults = [...subjectResults].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const mid = Math.floor(totalExamsTaken / 2);
    const firstHalf = chronologicalResults.slice(0, mid);
    const secondHalf = chronologicalResults.slice(mid);

    const firstAvg = firstHalf.reduce((sum, r) => sum + (r.score / r.totalQuestions), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + (r.score / r.totalQuestions), 0) / secondHalf.length;

    improvementRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  }

  const lastExamDate = sortedResults[0].date;

  return {
    id: `${studentName}-${subject}`,
    studentName,
    subject,
    totalExamsTaken,
    totalQuestionsAnswered,
    totalCorrectAnswers,
    averageScore: Math.round(averageScore * 10) / 10,
    lastExamDate,
    improvementRate: Math.round(improvementRate * 10) / 10,
    recentScores
  };
};

// Get all progress for a student (by user_id for RLS compatibility)
export const getStudentProgress = async (studentName: string, userId?: string): Promise<StudentProgress[]> => {
  requireDatabase();

  // Use user_id if available (required for RLS), fallback to student_name
  let query = supabase!
    .from('student_progress')
    .select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  } else {
    query = query.eq('student_name', studentName);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(d => ({
    id: d.id,
    studentName: d.student_name,
    subject: d.subject,
    totalExamsTaken: d.total_exams_taken,
    totalQuestionsAnswered: d.total_questions_answered,
    totalCorrectAnswers: d.total_correct_answers,
    averageScore: d.average_score,
    lastExamDate: d.last_exam_date,
    weakestTopics: d.weakest_topics,
    improvementRate: d.improvement_rate,
    recentScores: []
  }));
};

// Get overall progress summary for a student (across all subjects)
export const getOverallProgress = async (studentName: string, userId?: string): Promise<{
  totalExams: number;
  averageScore: number;
  improvementRate: number;
  lastExamDate?: string;
}> => {
  const progressData = await getStudentProgress(studentName, userId);

  if (progressData.length === 0) {
    return {
      totalExams: 0,
      averageScore: 0,
      improvementRate: 0
    };
  }

  const totalExams = progressData.reduce((sum, p) => sum + p.totalExamsTaken, 0);
  const totalQuestions = progressData.reduce((sum, p) => sum + p.totalQuestionsAnswered, 0);
  const totalCorrect = progressData.reduce((sum, p) => sum + p.totalCorrectAnswers, 0);
  const averageScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

  // Calculate overall improvement (average of all subject improvements)
  const subjectsWithImprovement = progressData.filter(p => p.improvementRate !== undefined && p.improvementRate !== 0);
  const improvementRate = subjectsWithImprovement.length > 0
    ? subjectsWithImprovement.reduce((sum, p) => sum + (p.improvementRate || 0), 0) / subjectsWithImprovement.length
    : 0;

  // Get most recent exam date across all subjects
  const lastExamDate = progressData
    .filter(p => p.lastExamDate)
    .map(p => new Date(p.lastExamDate!))
    .reduce((latest, date) => date > latest ? date : latest, new Date(0))
    .toISOString();

  return {
    totalExams,
    averageScore: Math.round(averageScore * 10) / 10,
    improvementRate: Math.round(improvementRate * 10) / 10,
    lastExamDate: lastExamDate !== new Date(0).toISOString() ? lastExamDate : undefined
  };
};

// Update progress after exam completion
export const updateProgressAfterExam = async (result: ExamResult): Promise<void> => {
  requireDatabase();

  // user_id is required for RLS - skip progress update if not available
  if (!result.user_id) {
    console.warn('updateProgressAfterExam: user_id missing, skipping progress update');
    return;
  }

  const { data: existing } = await supabase!
    .from('student_progress')
    .select('*')
    .eq('user_id', result.user_id)
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
      .eq('user_id', result.user_id)
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
        id: `${result.user_id}-${result.subject}-${Date.now()}`,
        user_id: result.user_id,
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

// Get weakest subjects for a student (lowest average scores)
export const getWeakestSubjects = async (studentName: string, limit: number = 3, userId?: string): Promise<StudentProgress[]> => {
  const progress = await getStudentProgress(studentName, userId);

  return progress
    .filter(p => p.totalExamsTaken > 0)
    .sort((a, b) => a.averageScore - b.averageScore)
    .slice(0, limit);
};

// Get strongest subjects for a student (highest average scores)
export const getStrongestSubjects = async (studentName: string, limit: number = 3, userId?: string): Promise<StudentProgress[]> => {
  const progress = await getStudentProgress(studentName, userId);

  return progress
    .filter(p => p.totalExamsTaken > 0)
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, limit);
};

// Get topic-level analysis by cross-referencing exam results with question sections
export const getTopicAnalysis = async (userId: string): Promise<TopicAnalysis[]> => {
  requireDatabase();

  // Fetch exam results and questions in parallel
  const [examResults, allQuestions] = await Promise.all([
    dbResults.getByUser(userId),
    getQuestions()
  ]);

  if (examResults.length === 0) return [];

  // Build a lookup map: questionId -> question
  const questionMap = new Map(allQuestions.map(q => [q.id, q]));

  // Aggregate per subject+topic
  const topicStats = new Map<string, { subject: string; topic: string; total: number; correct: number }>();

  for (const result of examResults) {
    for (const answer of result.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      const topic = question.section || 'Algemeen';
      const key = `${question.subject}::${topic}`;

      if (!topicStats.has(key)) {
        topicStats.set(key, { subject: question.subject, topic, total: 0, correct: 0 });
      }

      const stats = topicStats.get(key)!;
      stats.total++;

      // Check correctness for MC questions
      if (question.type === 'MULTIPLE_CHOICE' && typeof answer.value === 'number') {
        if (answer.value === question.correctIndex) {
          stats.correct++;
        }
      }
      // For open questions we can't reliably determine correctness here,
      // so they contribute to total but not to correct count unless we
      // store grades. Skip them for now - they still show as topics.
    }
  }

  return Array.from(topicStats.values())
    .filter(s => s.total >= 2) // Only show topics with enough data
    .map(s => ({
      subject: s.subject,
      topic: s.topic,
      totalQuestions: s.total,
      correctCount: s.correct,
      scorePercent: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
    }))
    .sort((a, b) => a.scorePercent - b.scorePercent); // Weakest first
};
