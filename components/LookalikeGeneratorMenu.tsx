import React, { useState, useMemo } from 'react';
import { Button } from './Button';
import { ArrowLeft, Target, ListChecks, Play, ChevronDown, ChevronUp, Clock, FileText, GraduationCap, BookOpen, AlertTriangle } from 'lucide-react';
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
  { value: 15, label: '15 min', description: 'Korte sessie' },
  { value: 30, label: '30 min', description: 'Halve toets' },
  { value: 45, label: '45 min', description: 'Volledige simulatie' },
  { value: 60, label: '60 min', description: 'Uitgebreid' }
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
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <Button
            variant="ghost"
            className="mb-6 -ml-2 hover:bg-slate-100 transition-all"
            onClick={onBack}
            disabled={isGenerating}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug
          </Button>

          <div className="flex items-center gap-5 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-slate-900">Look-alike Examen</h1>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">
                  Nieuw
                </span>
              </div>
              <p className="text-slate-500 font-medium">{subject} · {studentLevel}</p>
            </div>
          </div>

          {/* Info */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="text-slate-600 text-sm leading-relaxed">
              Authentieke examenvragen die niet te onderscheiden zijn van het centraal examen.
              {isDutch && ' Elke vraag bevat een leestekst met examenvragen over tekstbegrip.'}
              {isLanguageSubject && !isDutch && ' Inclusief Nederlandse bronteksten voor tekstbegrip.'}
            </p>
          </div>

          {/* AI disclaimer */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-800 text-sm leading-relaxed">
              <span className="font-semibold">Let op:</span> deze vragen zijn gegenereerd door AI en kunnen fouten bevatten. Gebruik ze als extra oefenmateriaal en controleer antwoorden altijd met je schoolboek of een officiële antwoordsleutel.
            </p>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-5">
          {/* Topic Selection */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Onderwerp</h3>
            </div>

            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-slate-900 font-medium transition-all cursor-pointer hover:border-slate-300"
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
                className="w-full p-3.5 mt-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-slate-900 font-medium transition-all placeholder:text-slate-400"
                autoFocus
              />
            )}
          </div>

          {/* Question Count */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <ListChecks className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Aantal vragen</h3>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {QUESTION_COUNTS.map(count => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  disabled={isGenerating}
                  className={`p-4 rounded-xl font-bold text-xl transition-all ${
                    questionCount === count
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Timer Selection */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Tijdslimiet</h3>
                <p className="text-slate-500 text-xs">Optioneel: oefen onder tijdsdruk</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {TIME_LIMITS.map(limit => (
                <button
                  key={limit.value}
                  onClick={() => setTimeLimit(limit.value)}
                  disabled={isGenerating}
                  className={`p-3 rounded-xl font-medium transition-all ${
                    timeLimit === limit.value
                      ? 'bg-amber-500 text-white shadow-lg'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <div className="text-sm">{limit.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isGenerating}
              className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="font-medium text-slate-700">Geavanceerde opties</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-6 pt-0 border-t border-slate-100">
                <div className="pt-5">
                  <label className="font-medium text-slate-700 mb-3 block flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    Tijdvak stijl
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {EXAM_STYLES.map(style => (
                      <button
                        key={style.value}
                        onClick={() => setExamStyle(style.value)}
                        disabled={isGenerating}
                        className={`p-3 rounded-xl border transition-all ${
                          examStyle === style.value
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-sm font-medium">{style.label}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{style.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {isDutch && (
                  <div className="mt-5 bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                      <p className="text-slate-600 text-xs leading-relaxed">
                        Elke vraag bevat een authentieke leestekst (250-500 woorden) met daarop gebaseerde examenvragen. Precies zoals bij het echte centraal examen Nederlands.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Start Button */}
          <Button
            variant="primary"
            onClick={handleStart}
            disabled={isGenerating || (topic === 'custom' && !customTopic.trim())}
            className="w-full justify-center py-4 text-base font-semibold bg-emerald-500 hover:bg-emerald-600 shadow-lg transition-all"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                <span>Examenvragen genereren...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2 fill-current" />
                <span>Start examen</span>
                {timeLimit > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                    {timeLimit} min
                  </span>
                )}
              </>
            )}
          </Button>

          {/* Footer */}
          <p className="text-center text-slate-400 text-sm">
            Vragen worden gegenereerd op basis van de eindexamenstof {studentLevel}
          </p>
        </div>
      </div>
    </div>
  );
};
