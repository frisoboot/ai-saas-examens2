import React, { useState, useMemo } from 'react';
import { Button } from './Button';
import { Sparkles, ArrowLeft, Target, ListChecks, Play, ChevronDown, ChevronUp, Zap, GraduationCap } from 'lucide-react';
import { StudentLevel } from '../types';
import { getTopicsForSubject } from '../services/examData';
import { getSubjectIcon } from '../utils/subjectIcons';
import { isGrokConfigured } from '../services/grokService';

export type AIProvider = 'gemini' | 'grok';

interface AIGeneratorMenuProps {
  subject: string;
  studentLevel: StudentLevel;
  onBack: () => void;
  onGenerate: (count: number, topic?: string, difficulty?: string, questionTypeMix?: string, timeLimit?: number, provider?: AIProvider) => void;
}

const QUESTION_COUNTS = [5, 10, 15, 20];
const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Makkelijk' },
  { value: 'medium', label: 'Gemiddeld' },
  { value: 'hard', label: 'Moeilijk' }
];
const QUESTION_TYPE_MIXES = [
  { value: 'balanced', label: 'Mix', description: '70% meerkeuze, 30% open' },
  { value: 'mostly_mc', label: 'Meerkeuze', description: '90% meerkeuze' },
  { value: 'mostly_open', label: 'Open vragen', description: '60% open' }
];
const TIME_LIMITS = [
  { value: 0, label: 'Geen limiet' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' }
];

export const AIGeneratorMenu: React.FC<AIGeneratorMenuProps> = ({
  subject,
  studentLevel,
  onBack,
  onGenerate
}) => {
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [questionTypeMix, setQuestionTypeMix] = useState('balanced');
  const [timeLimit, setTimeLimit] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('gemini');

  const grokAvailable = isGrokConfigured();

  const availableTopics = useMemo(() => getTopicsForSubject(subject, studentLevel), [subject, studentLevel]);
  const SubjectIcon = getSubjectIcon(subject);

  const handleStart = () => {
    setIsGenerating(true);
    const finalTopic = topic === 'custom' ? customTopic : topic;
    onGenerate(questionCount, finalTopic.trim() || undefined, difficulty, questionTypeMix, timeLimit, provider);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Button
          variant="ghost"
          className="mb-8 text-slate-600 hover:text-slate-900"
          onClick={onBack}
          disabled={isGenerating}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>

        <div className="bg-white border border-slate-200 mb-6">
          <div className="p-6">
            <h1 className="text-xl font-semibold text-slate-900 mb-1">AI Examen Generator</h1>
            <p className="text-sm text-slate-600">{subject} • {studentLevel}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-5">
          {/* Provider Selection */}
          <div className="bg-white border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Examentype</h3>
            </div>

            <div className="divide-y divide-slate-200">
              {/* Gemini - AI Examen */}
              <button
                onClick={() => setProvider('gemini')}
                disabled={isGenerating}
                className={`w-full p-6 text-left transition-colors ${
                  provider === 'gemini'
                    ? 'bg-slate-50'
                    : 'bg-white hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-5">
                  <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    provider === 'gemini'
                      ? 'border-slate-900'
                      : 'border-slate-300'
                  }`}>
                    {provider === 'gemini' && (
                      <div className="w-2 h-2 rounded-full bg-slate-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 mb-2">
                      <h4 className="font-semibold text-slate-900">AI Examen</h4>
                      <span className="text-xs text-slate-500">Gemini</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Voor het <span className="font-medium text-slate-900">oefenen en leren</span> van nieuwe stof. De AI genereert gevarieerde vragen die je helpen concepten te begrijpen. Ideaal voor algemene voorbereiding.
                    </p>
                  </div>
                </div>
              </button>

              {/* Grok - Look-alike Examen */}
              <button
                onClick={() => grokAvailable && setProvider('grok')}
                disabled={isGenerating || !grokAvailable}
                className={`w-full p-6 text-left transition-colors ${
                  provider === 'grok'
                    ? 'bg-slate-50'
                    : grokAvailable
                      ? 'bg-white hover:bg-slate-50/50'
                      : 'bg-slate-50/50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-5">
                  <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    provider === 'grok'
                      ? 'border-slate-900'
                      : grokAvailable
                        ? 'border-slate-300'
                        : 'border-slate-200'
                  }`}>
                    {provider === 'grok' && (
                      <div className="w-2 h-2 rounded-full bg-slate-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3 mb-2">
                      <h4 className={`font-semibold ${grokAvailable ? 'text-slate-900' : 'text-slate-400'}`}>Look-alike Examen</h4>
                      <span className={`text-xs ${grokAvailable ? 'text-slate-500' : 'text-slate-400'}`}>Grok</span>
                    </div>
                    <p className={`text-sm leading-relaxed ${grokAvailable ? 'text-slate-600' : 'text-slate-400'}`}>
                      {grokAvailable ? (
                        <>
                          Voor <span className="font-medium text-slate-900">realistische examensimulatie</span>. Vragen die qua stijl en structuur nauw aansluiten bij echte eindexamens. Perfect voor de laatste fase van je voorbereiding.
                        </>
                      ) : (
                        'Deze optie is niet beschikbaar (API key niet geconfigureerd).'
                      )}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Topic Selection */}
          <div className="bg-white border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Onderwerp</h3>
            </div>
            <div className="p-6">

              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
                className="w-full p-3 bg-white border border-slate-300 focus:border-slate-900 focus:outline-none text-slate-900 transition-colors"
              >
                <option value="">Alle onderwerpen</option>
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
                  className="w-full p-3 mt-3 bg-white border border-slate-300 focus:border-slate-900 focus:outline-none text-slate-900 transition-colors"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Question Count */}
          <div className="bg-white border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Aantal vragen</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-4 gap-2">
                {QUESTION_COUNTS.map(count => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    disabled={isGenerating}
                    className={`p-4 border font-semibold text-lg transition-colors ${
                      questionCount === count
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Options - Collapsible */}
          <div className="bg-white border border-slate-200">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isGenerating}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-200"
            >
              <span className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Meer opties</span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-slate-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {showAdvanced && (
              <div className="divide-y divide-slate-200">
                {/* Difficulty */}
                <div className="p-6">
                  <label className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-4 block">Moeilijkheidsgraad</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DIFFICULTY_LEVELS.map(level => (
                      <button
                        key={level.value}
                        onClick={() => setDifficulty(level.value)}
                        disabled={isGenerating}
                        className={`p-3 border font-medium text-sm transition-colors ${
                          difficulty === level.value
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Mix */}
                <div className="p-6">
                  <label className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-4 block">Type vragen</label>
                  <div className="grid grid-cols-3 gap-2">
                    {QUESTION_TYPE_MIXES.map(mix => (
                      <button
                        key={mix.value}
                        onClick={() => setQuestionTypeMix(mix.value)}
                        disabled={isGenerating}
                        className={`p-3 border text-sm transition-colors text-left ${
                          questionTypeMix === mix.value
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-medium">{mix.label}</div>
                        <div className={`text-xs mt-1 ${questionTypeMix === mix.value ? 'text-slate-300' : 'text-slate-500'}`}>{mix.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Limit */}
                <div className="p-6">
                  <label className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-4 block">Tijdslimiet</label>
                  <div className="grid grid-cols-5 gap-2">
                    {TIME_LIMITS.map(limit => (
                      <button
                        key={limit.value}
                        onClick={() => setTimeLimit(limit.value)}
                        disabled={isGenerating}
                        className={`p-3 border font-medium text-sm transition-colors ${
                          timeLimit === limit.value
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {limit.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Start Button */}
          <Button
            variant="primary"
            onClick={handleStart}
            disabled={isGenerating || (topic === 'custom' && !customTopic.trim())}
            className="w-full justify-center py-4 text-base font-semibold bg-slate-900 hover:bg-slate-800 text-white border border-slate-900"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-3" />
                Bezig met genereren...
              </>
            ) : (
              <>
                Start Toets
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
