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
  { value: 'easy', label: 'Makkelijk', icon: '🟢' },
  { value: 'medium', label: 'Gemiddeld', icon: '🟡' },
  { value: 'hard', label: 'Moeilijk', icon: '🔴' }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Button
          variant="ghost"
          className="mb-6 text-slate-600 hover:text-slate-900"
          onClick={onBack}
          disabled={isGenerating}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>

        <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-slate-200">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center">
              <SubjectIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">AI Examen Generator</h1>
              <p className="text-sm text-slate-600">{subject} • {studentLevel}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-5">
          {/* Provider Selection */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Type examen</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gemini - AI Examen */}
              <button
                onClick={() => setProvider('gemini')}
                disabled={isGenerating}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  provider === 'gemini'
                    ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-500 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    provider === 'gemini'
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`font-bold ${provider === 'gemini' ? 'text-indigo-900' : 'text-slate-900'}`}>
                      AI Examen
                    </div>
                    <div className="text-xs text-slate-500">Powered by Gemini</div>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Standaard AI-gegenereerde oefenvragen op jouw niveau.
                </p>
              </button>

              {/* Grok - Look-alike Examen */}
              <button
                onClick={() => grokAvailable && setProvider('grok')}
                disabled={isGenerating || !grokAvailable}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  provider === 'grok'
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-500 shadow-md'
                    : grokAvailable
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    provider === 'grok'
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`font-bold ${provider === 'grok' ? 'text-amber-900' : 'text-slate-900'}`}>
                      Look-alike Examen
                    </div>
                    <div className="text-xs text-slate-500">Powered by Grok</div>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  {grokAvailable
                    ? 'Vragen die lijken op echte eindexamens.'
                    : 'Niet beschikbaar (API key niet geconfigureerd)'}
                </p>
              </button>
            </div>
          </div>

          {/* Topic Selection */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Onderwerp</h3>
            </div>

            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-slate-900 font-medium"
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
                className="w-full p-3 mt-3 bg-white border-2 border-indigo-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-slate-900"
                autoFocus
              />
            )}
          </div>

          {/* Question Count */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <ListChecks className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Aantal vragen</h3>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {QUESTION_COUNTS.map(count => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  disabled={isGenerating}
                  className={`p-4 rounded-xl font-bold text-2xl transition-all ${
                    questionCount === count
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options - Collapsible */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isGenerating}
              className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <span className="font-bold text-slate-900">Meer opties</span>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-6 pt-0 space-y-5 border-t border-slate-100">
                {/* Difficulty */}
                <div>
                  <label className="font-semibold text-slate-900 mb-3 block">Moeilijkheidsgraad</label>
                  <div className="grid grid-cols-3 gap-3">
                    {DIFFICULTY_LEVELS.map(level => (
                      <button
                        key={level.value}
                        onClick={() => setDifficulty(level.value)}
                        disabled={isGenerating}
                        className={`p-3 rounded-xl border-2 font-semibold transition-all ${
                          difficulty === level.value
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xl mb-1">{level.icon}</div>
                        <div className="text-sm">{level.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Mix */}
                <div>
                  <label className="font-semibold text-slate-900 mb-3 block">Type vragen</label>
                  <div className="grid grid-cols-3 gap-3">
                    {QUESTION_TYPE_MIXES.map(mix => (
                      <button
                        key={mix.value}
                        onClick={() => setQuestionTypeMix(mix.value)}
                        disabled={isGenerating}
                        className={`p-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                          questionTypeMix === mix.value
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div>{mix.label}</div>
                        <div className="text-xs text-slate-500 mt-1">{mix.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Limit */}
                <div>
                  <label className="font-semibold text-slate-900 mb-3 block">Tijdslimiet</label>
                  <div className="grid grid-cols-5 gap-2">
                    {TIME_LIMITS.map(limit => (
                      <button
                        key={limit.value}
                        onClick={() => setTimeLimit(limit.value)}
                        disabled={isGenerating}
                        className={`p-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                          timeLimit === limit.value
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
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
            className="w-full justify-center py-5 text-lg font-bold shadow-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                Bezig met genereren...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2 fill-current" />
                Start Toets
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
