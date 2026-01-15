import React, { useState, useMemo } from 'react';
import { Button } from './Button';
import { ArrowLeft, Target, ListChecks, Play, ChevronDown, ChevronUp, Zap, GraduationCap } from 'lucide-react';
import { StudentLevel } from '../types';
import { getTopicsForSubject } from '../services/examData';
import { getSubjectIcon } from '../utils/subjectIcons';

interface AIGeneratorMenuProps {
  subject: string;
  studentLevel: StudentLevel;
  onBack: () => void;
  onGenerate: (count: number, topic?: string, difficulty?: string, questionTypeMix?: string) => void;
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const availableTopics = useMemo(() => getTopicsForSubject(subject, studentLevel), [subject, studentLevel]);
  const SubjectIcon = getSubjectIcon(subject);

  const handleStart = () => {
    setIsGenerating(true);
    const finalTopic = topic === 'custom' ? customTopic : topic;
    onGenerate(questionCount, finalTopic.trim() || undefined, difficulty, questionTypeMix);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50/40 to-pink-50/30 p-4 md:p-8 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <Button
          variant="ghost"
          className="mb-6 text-slate-600 hover:text-slate-900 hover:bg-white/60 backdrop-blur-sm transition-all"
          onClick={onBack}
          disabled={isGenerating}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 mb-6 shadow-2xl shadow-indigo-200/50 border border-white/60 hover:shadow-indigo-300/60 transition-all duration-500">
          <div className="flex items-center gap-5 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-md opacity-50 animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg">
                <SubjectIcon className="w-8 h-8" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 bg-clip-text text-transparent">
                AI Examen Generator
              </h1>
              <p className="text-sm text-slate-600 font-medium mt-1">{subject} • {studentLevel}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-5">
          {/* Topic Selection */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-7 shadow-xl shadow-slate-200/50 border border-white/60 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-200/50">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Onderwerp</h3>
            </div>

            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              className="w-full p-4 bg-gradient-to-br from-slate-50 to-indigo-50/30 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none text-slate-900 font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer"
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
                className="w-full p-4 mt-4 bg-white border-2 border-indigo-300 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none text-slate-900 font-medium transition-all shadow-sm placeholder:text-slate-400"
                autoFocus
              />
            )}
          </div>

          {/* Question Count */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-7 shadow-xl shadow-slate-200/50 border border-white/60 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-200/50">
                <ListChecks className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Aantal vragen</h3>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {QUESTION_COUNTS.map(count => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  disabled={isGenerating}
                  className={`relative p-5 rounded-2xl font-bold text-2xl transition-all duration-300 ${
                    questionCount === count
                      ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-2xl shadow-indigo-300/50 scale-105'
                      : 'bg-gradient-to-br from-slate-50 to-indigo-50/20 text-slate-600 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 hover:scale-102 hover:shadow-lg border border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  {questionCount === count && (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
                  )}
                  <span className="relative">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options - Collapsible */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden hover:shadow-2xl transition-all duration-300">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isGenerating}
              className="w-full p-6 flex items-center justify-between hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-slate-900 text-lg">Meer opties</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
              )}
            </button>

            {showAdvanced && (
              <div className="p-7 pt-0 space-y-6 border-t border-slate-200/50">
                {/* Difficulty */}
                <div>
                  <label className="font-bold text-slate-900 mb-4 block flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Moeilijkheidsgraad
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {DIFFICULTY_LEVELS.map(level => (
                      <button
                        key={level.value}
                        onClick={() => setDifficulty(level.value)}
                        disabled={isGenerating}
                        className={`p-4 rounded-xl border-2 font-semibold transition-all duration-300 ${
                          difficulty === level.value
                            ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-500 text-indigo-900 shadow-lg shadow-indigo-200/50 scale-105'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-gradient-to-br hover:from-indigo-50/30 hover:to-purple-50/20 hover:scale-102'
                        }`}
                      >
                        <div className="text-sm">{level.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Mix */}
                <div>
                  <label className="font-bold text-slate-900 mb-4 block flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-purple-500" />
                    Type vragen
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {QUESTION_TYPE_MIXES.map(mix => (
                      <button
                        key={mix.value}
                        onClick={() => setQuestionTypeMix(mix.value)}
                        disabled={isGenerating}
                        className={`p-4 rounded-xl border-2 font-semibold text-sm transition-all duration-300 ${
                          questionTypeMix === mix.value
                            ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-500 text-purple-900 shadow-lg shadow-purple-200/50 scale-105'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-gradient-to-br hover:from-purple-50/30 hover:to-pink-50/20 hover:scale-102'
                        }`}
                      >
                        <div className="font-bold">{mix.label}</div>
                        <div className="text-xs text-slate-500 mt-1 font-normal">{mix.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Start Button */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
            <Button
              variant="primary"
              onClick={handleStart}
              disabled={isGenerating || (topic === 'custom' && !customTopic.trim())}
              className="relative w-full justify-center py-6 text-lg font-bold shadow-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 border-2 border-white/20 transition-all duration-300 hover:scale-102 active:scale-98"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent mr-3" />
                  Bezig met genereren...
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 mr-2 fill-current" />
                  Start Toets
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
