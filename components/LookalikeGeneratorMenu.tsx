import React, { useState, useMemo } from 'react';
import { Button } from './Button';
import { ArrowLeft, Target, ListChecks, Play, ChevronDown, ChevronUp, Clock, FileText, GraduationCap, BookOpen } from 'lucide-react';
import { StudentLevel } from '../types';
import { getTopicsForSubject } from '../services/examData';
import { getSubjectIcon } from '../utils/subjectIcons';

interface LookalikeGeneratorMenuProps {
  subject: string;
  studentLevel: StudentLevel;
  onBack: () => void;
  onGenerate: (count: number, topic?: string, examStyle?: string, timeLimit?: number) => void;
}

const QUESTION_COUNTS = [5, 10, 15, 20];

const EXAM_STYLES = [
  { value: 'mixed', label: 'Mix', description: 'Beide tijdvakken' },
  { value: 'tijdvak1', label: 'Tijdvak 1', description: 'Mei/Juni stijl' },
  { value: 'tijdvak2', label: 'Tijdvak 2', description: 'Iets moeilijker' }
];

const TIME_LIMITS = [
  { value: 0, label: 'Geen timer', description: 'Oefenen zonder tijdsdruk' },
  { value: 15, label: '15 min', description: 'Korte oefensessie' },
  { value: 30, label: '30 min', description: 'Halve toets' },
  { value: 45, label: '45 min', description: 'Volledige simulatie' },
  { value: 60, label: '60 min', description: 'Uitgebreide toets' }
];

export const LookalikeGeneratorMenu: React.FC<LookalikeGeneratorMenuProps> = ({
  subject,
  studentLevel,
  onBack,
  onGenerate
}) => {
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [examStyle, setExamStyle] = useState('mixed');
  const [timeLimit, setTimeLimit] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const availableTopics = useMemo(() => getTopicsForSubject(subject, studentLevel), [subject, studentLevel]);
  const SubjectIcon = getSubjectIcon(subject);

  const isLanguageSubject = ['Nederlands', 'Engels', 'Duits', 'Frans', 'Spaans'].includes(subject);
  const isDutch = subject === 'Nederlands';

  const handleStart = () => {
    setIsGenerating(true);
    const finalTopic = topic === 'custom' ? customTopic : topic;
    onGenerate(questionCount, finalTopic.trim() || undefined, examStyle, timeLimit);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8 relative overflow-hidden">
      {/* Exam-style background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-cyan-500/10 to-blue-500/5 rounded-full blur-3xl" />
        {/* Grid pattern like exam paper */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <Button
          variant="ghost"
          className="mb-6 text-slate-400 hover:text-white hover:bg-white/10 backdrop-blur-sm transition-all"
          onClick={onBack}
          disabled={isGenerating}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>

        {/* Main Header Card */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 mb-6 shadow-2xl border border-slate-700/50">
          <div className="flex items-center gap-5 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl blur-lg opacity-60 animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-lg border border-white/20">
                <SubjectIcon className="w-8 h-8" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-white">
                  Look-alike Examenvragen
                </h1>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
                  NIEUW
                </span>
              </div>
              <p className="text-slate-400 font-medium">{subject} • {studentLevel}</p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl p-5 border border-emerald-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold mb-1">Echte Examensimulatie</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Deze vragen zijn niet te onderscheiden van echte centraal examenvragen.
                  {isDutch && ' Elke vraag bevat een authentieke leestekst met examenvragen over tekstbegrip.'}
                  {isLanguageSubject && !isDutch && ' Inclusief Nederlandse bronteksten voor tekstbegrip.'}
                  {' '}Perfect om te oefenen onder examenomstandigheden.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-5">
          {/* Topic Selection */}
          <div className="bg-slate-800/70 backdrop-blur-xl rounded-2xl p-7 shadow-xl border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-white text-lg">Onderwerp</h3>
            </div>

            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              className="w-full p-4 bg-slate-900/80 border-2 border-slate-600 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none text-white font-semibold transition-all shadow-sm hover:border-slate-500 cursor-pointer"
            >
              <option value="">Alle onderwerpen (volledig examen)</option>
              {availableTopics.length > 0 && availableTopics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value="custom">Eigen onderwerp...</option>
            </select>

            {topic === 'custom' && (
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                disabled={isGenerating}
                placeholder="Typ je onderwerp..."
                className="w-full p-4 mt-4 bg-slate-900/80 border-2 border-emerald-500/50 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none text-white font-medium transition-all shadow-sm placeholder:text-slate-500"
                autoFocus
              />
            )}
          </div>

          {/* Question Count */}
          <div className="bg-slate-800/70 backdrop-blur-xl rounded-2xl p-7 shadow-xl border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <ListChecks className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-white text-lg">Aantal examenvragen</h3>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {QUESTION_COUNTS.map(count => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  disabled={isGenerating}
                  className={`relative p-5 rounded-2xl font-bold text-2xl transition-all duration-300 ${
                    questionCount === count
                      ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-2xl shadow-emerald-500/30 scale-105 border-2 border-white/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-700/80 border-2 border-slate-600 hover:border-emerald-500/50'
                  }`}
                >
                  {questionCount === count && (
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl blur-xl opacity-40 animate-pulse" />
                  )}
                  <span className="relative">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Timer Selection */}
          <div className="bg-slate-800/70 backdrop-blur-xl rounded-2xl p-7 shadow-xl border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Tijdslimiet</h3>
                <p className="text-slate-400 text-xs">Oefen onder tijdsdruk zoals bij het echte examen</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {TIME_LIMITS.map(limit => (
                <button
                  key={limit.value}
                  onClick={() => setTimeLimit(limit.value)}
                  disabled={isGenerating}
                  className={`relative p-4 rounded-xl font-semibold transition-all duration-300 ${
                    timeLimit === limit.value
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-xl shadow-amber-500/30 scale-105 border-2 border-white/20'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-700/80 border-2 border-slate-600 hover:border-amber-500/50'
                  }`}
                >
                  <div className="text-base">{limit.label}</div>
                  <div className={`text-xs mt-1 ${timeLimit === limit.value ? 'text-white/80' : 'text-slate-500'}`}>
                    {limit.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options - Collapsible */}
          <div className="bg-slate-800/70 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden hover:border-emerald-500/30 transition-all duration-300">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isGenerating}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-700/30 transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-white text-lg">Examenstijl</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-7 pt-0 space-y-6 border-t border-slate-700/50">
                {/* Exam Style / Tijdvak */}
                <div>
                  <label className="font-bold text-white mb-4 block flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    Tijdvak Stijl
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {EXAM_STYLES.map(style => (
                      <button
                        key={style.value}
                        onClick={() => setExamStyle(style.value)}
                        disabled={isGenerating}
                        className={`p-4 rounded-xl border-2 font-semibold transition-all duration-300 ${
                          examStyle === style.value
                            ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105'
                            : 'bg-slate-900/80 border-slate-600 text-slate-400 hover:border-emerald-500/50 hover:text-white'
                        }`}
                      >
                        <div className="text-sm">{style.label}</div>
                        <div className={`text-xs mt-1 ${examStyle === style.value ? 'text-emerald-300' : 'text-slate-500'}`}>
                          {style.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dutch-specific info */}
                {isDutch && (
                  <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-emerald-300 font-bold text-sm mb-1">Nederlands Examen</h4>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          Elke vraag bevat een authentieke leestekst (250-500 woorden) met daarop gebaseerde
                          examenvragen. Precies zoals bij het echte centraal examen Nederlands.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Start Button */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
            <Button
              variant="primary"
              onClick={handleStart}
              disabled={isGenerating || (topic === 'custom' && !customTopic.trim())}
              className="relative w-full justify-center py-6 text-lg font-bold shadow-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 border-2 border-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent mr-3" />
                  <span>Examenvragen genereren...</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 mr-2 fill-current" />
                  <span>Start Look-alike Examen</span>
                  {timeLimit > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                      {timeLimit} min
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>

          {/* Bottom Info */}
          <div className="text-center text-slate-500 text-sm">
            <p>Vragen worden gegenereerd door AI en zijn gebaseerd op de eindexamenstof {studentLevel}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
