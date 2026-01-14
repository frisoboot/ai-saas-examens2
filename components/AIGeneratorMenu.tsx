import React, { useState, useMemo } from 'react';
import { Button } from './Button';
import { Sparkles, ArrowLeft, Target, ListChecks, Play, Info, Clock, Sliders, CheckSquare, FileText, Zap, Brain, TrendingUp } from 'lucide-react';
import { StudentLevel } from '../types';
import { getTopicsForSubject } from '../services/examData';
import { getSubjectIcon } from '../utils/subjectIcons';

interface AIGeneratorMenuProps {
  subject: string;
  studentLevel: StudentLevel;
  onBack: () => void;
  onGenerate: (count: number, topic?: string, difficulty?: string, questionTypeMix?: string, timeLimit?: number) => void;
}

const QUESTION_COUNTS = [5, 10, 15, 20];
const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Makkelijk', description: 'Basis begrippen en eenvoudige vragen', icon: '🟢' },
  { value: 'medium', label: 'Gemiddeld', description: 'Standaard examenniveau', icon: '🟡' },
  { value: 'hard', label: 'Moeilijk', description: 'Uitdagende vragen en complexe scenario\'s', icon: '🔴' }
];
const QUESTION_TYPE_MIXES = [
  { value: 'balanced', label: 'Gebalanceerd', description: '70% meerkeuze, 30% open vragen' },
  { value: 'mostly_mc', label: 'Vooral Meerkeuze', description: '90% meerkeuze, 10% open vragen' },
  { value: 'mostly_open', label: 'Vooral Open', description: '40% meerkeuze, 60% open vragen' }
];
const TIME_LIMITS = [
  { value: 0, label: 'Geen limiet' },
  { value: 15, label: '15 minuten' },
  { value: 30, label: '30 minuten' },
  { value: 45, label: '45 minuten' },
  { value: 60, label: '1 uur' }
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
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');

  const availableTopics = useMemo(() => getTopicsForSubject(subject, studentLevel), [subject, studentLevel]);
  const SubjectIcon = getSubjectIcon(subject);

  const handleStart = () => {
    setIsGenerating(true);
    const finalTopic = topic === 'custom' ? customTopic : topic;
    onGenerate(questionCount, finalTopic.trim() || undefined, difficulty, questionTypeMix, timeLimit);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-4 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-6 -ml-2 text-slate-500 hover:text-slate-700"
            onClick={onBack}
            disabled={isGenerating}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar opties
          </Button>

          <div className="flex flex-col md:flex-row md:items-center gap-6 bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl shadow-indigo-100/50 border border-white/60">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-indigo-300/50">
              <SubjectIcon className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-1">AI Examen Generator</h1>
              <p className="text-slate-600">
                Stel je eigen {subject} oefentoets samen • {studentLevel} niveau
              </p>
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 rounded-full border border-indigo-100">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-900">AI Powered</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Config Panel */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tabs */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-slate-200/60">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('basic')}
                  disabled={isGenerating}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                    activeTab === 'basic'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Target className="w-4 h-4 inline mr-2" />
                  Basis Instellingen
                </button>
                <button
                  onClick={() => setActiveTab('advanced')}
                  disabled={isGenerating}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                    activeTab === 'advanced'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Sliders className="w-4 h-4 inline mr-2" />
                  Geavanceerd
                </button>
              </div>
            </div>

            {/* Basic Tab Content */}
            {activeTab === 'basic' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Topic Selection */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/60 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl text-indigo-600 border border-indigo-100">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Onderwerp</h3>
                      <p className="text-xs text-slate-500">Kies waar je op wilt oefenen</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-slate-600 font-semibold block mb-2.5">
                        Examenonderwerp
                      </label>
                      <select
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        disabled={isGenerating}
                        className="w-full p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 border-2 border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium appearance-none cursor-pointer hover:border-indigo-300"
                      >
                        <option value="">✨ Algemene examentoets (Alle onderwerpen)</option>
                        {availableTopics.length > 0 && (
                          <optgroup label={`📚 Examenonderwerpen ${studentLevel}`}>
                            {availableTopics.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </optgroup>
                        )}
                        <option value="custom">🎯 Eigen onderwerp kiezen...</option>
                      </select>
                    </div>

                    {topic === 'custom' && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-sm text-slate-600 font-semibold block mb-2.5">
                          Jouw specifieke onderwerp
                        </label>
                        <input
                          type="text"
                          value={customTopic}
                          onChange={(e) => setCustomTopic(e.target.value)}
                          disabled={isGenerating}
                          placeholder="Bijv. Tweede Wereldoorlog, Differentiëren, Cellen..."
                          className="w-full p-4 bg-white border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-slate-900 placeholder:text-slate-400 font-medium shadow-sm"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Question Count Selection */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/60 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl text-indigo-600 border border-indigo-100">
                      <ListChecks className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Aantal vragen</h3>
                      <p className="text-xs text-slate-500">Hoeveel vragen wil je maken?</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {QUESTION_COUNTS.map(count => (
                      <button
                        key={count}
                        onClick={() => setQuestionCount(count)}
                        disabled={isGenerating}
                        className={`p-5 rounded-xl border-2 transition-all font-bold text-xl flex flex-col items-center justify-center gap-1.5 ${
                          questionCount === count
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-600 shadow-xl shadow-indigo-300/50 scale-105'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-gradient-to-br hover:from-slate-50 hover:to-indigo-50/30 hover:scale-105'
                        }`}
                      >
                        <span>{count}</span>
                        <span className={`text-[10px] font-normal uppercase tracking-wider ${
                          questionCount === count ? 'text-indigo-200' : 'text-slate-400'
                        }`}>Vragen</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab Content */}
            {activeTab === 'advanced' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Difficulty Level */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/60 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl text-orange-600 border border-orange-100">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Moeilijkheidsgraad</h3>
                      <p className="text-xs text-slate-500">Pas het niveau binnen je studie aan</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {DIFFICULTY_LEVELS.map(level => (
                      <button
                        key={level.value}
                        onClick={() => setDifficulty(level.value)}
                        disabled={isGenerating}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                          difficulty === level.value
                            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-400 shadow-md'
                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-2xl">{level.icon}</span>
                        <div className="flex-1">
                          <div className="font-bold text-slate-900">{level.label}</div>
                          <div className="text-xs text-slate-500">{level.description}</div>
                        </div>
                        {difficulty === level.value && (
                          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                            <CheckSquare className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Type Mix */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/60 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl text-green-600 border border-green-100">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Vraagtype Mix</h3>
                      <p className="text-xs text-slate-500">Verdeling tussen meerkeuze en open vragen</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {QUESTION_TYPE_MIXES.map(mix => (
                      <button
                        key={mix.value}
                        onClick={() => setQuestionTypeMix(mix.value)}
                        disabled={isGenerating}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          questionTypeMix === mix.value
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400 shadow-md'
                            : 'bg-white border-slate-200 hover:border-green-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{mix.label}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{mix.description}</div>
                          </div>
                          {questionTypeMix === mix.value && (
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                              <CheckSquare className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Limit */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-slate-200/60 hover:shadow-xl transition-shadow">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl text-blue-600 border border-blue-100">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">Tijdslimiet</h3>
                      <p className="text-xs text-slate-500">Oefen onder tijdsdruk (optioneel)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {TIME_LIMITS.map(limit => (
                      <button
                        key={limit.value}
                        onClick={() => setTimeLimit(limit.value)}
                        disabled={isGenerating}
                        className={`p-4 rounded-xl border-2 transition-all font-semibold text-sm ${
                          timeLimit === limit.value
                            ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
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

          {/* Sidebar Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-white via-white to-indigo-50/30 rounded-2xl p-6 shadow-xl border border-indigo-100 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <Brain className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">Toets Overzicht</h3>
              </div>

              <div className="space-y-3 mb-6">
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <div className="text-xs text-slate-500 font-semibold mb-1">Vak & Niveau</div>
                  <div className="font-bold text-slate-900">{subject}</div>
                  <div className="text-sm text-indigo-600">{studentLevel}</div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <div className="text-xs text-slate-500 font-semibold mb-1">Onderwerp</div>
                  <div className="font-bold text-slate-900 text-sm break-words">
                    {topic === 'custom' ? (customTopic || 'Eigen onderwerp') : (topic || 'Alle onderwerpen')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-slate-100">
                    <div className="text-xs text-slate-500 font-semibold mb-1">Vragen</div>
                    <div className="text-2xl font-bold text-indigo-600">{questionCount}</div>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-slate-100">
                    <div className="text-xs text-slate-500 font-semibold mb-1">Tijd</div>
                    <div className="text-lg font-bold text-slate-900">
                      {timeLimit === 0 ? '∞' : `${timeLimit}m`}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <div className="text-xs text-slate-500 font-semibold mb-1">Niveau</div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {DIFFICULTY_LEVELS.find(d => d.value === difficulty)?.icon}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {DIFFICULTY_LEVELS.find(d => d.value === difficulty)?.label}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <div className="text-xs text-slate-500 font-semibold mb-1">Vraagtypen</div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {QUESTION_TYPE_MIXES.find(m => m.value === questionTypeMix)?.label}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
                <div className="flex gap-3">
                  <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-1">AI Gegenereerd</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Unieke {studentLevel} vragen gebaseerd op officiële examenstof en aangepast aan jouw voorkeuren.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleStart}
                disabled={isGenerating || (topic === 'custom' && !customTopic.trim())}
                className="w-full justify-center py-4 text-base font-bold shadow-xl shadow-indigo-300/50 hover:shadow-2xl hover:shadow-indigo-400/50 transition-all bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                    Genereren...
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
      </div>
    </div>
  );
};
