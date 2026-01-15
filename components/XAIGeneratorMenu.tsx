import React, { useState, useMemo } from 'react';
import { Button } from './Button';
import { ArrowLeft, Target, ListChecks, Play, Sparkles, Zap, Brain } from 'lucide-react';
import { StudentLevel } from '../types';
import { getTopicsForSubject } from '../services/examData';
import { getSubjectIcon } from '../utils/subjectIcons';

interface XAIGeneratorMenuProps {
  subject: string;
  studentLevel: StudentLevel;
  onBack: () => void;
  onGenerate: (count: number, topic?: string) => void;
}

const QUESTION_COUNTS = [5, 10, 15, 20];

export const XAIGeneratorMenu: React.FC<XAIGeneratorMenuProps> = ({
  subject,
  studentLevel,
  onBack,
  onGenerate
}) => {
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableTopics = useMemo(() => getTopicsForSubject(subject, studentLevel), [subject, studentLevel]);
  const SubjectIcon = getSubjectIcon(subject);

  const handleStart = () => {
    setIsGenerating(true);
    const finalTopic = topic === 'custom' ? customTopic : topic;
    onGenerate(questionCount, finalTopic.trim() || undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan-400/5 to-emerald-400/5 rounded-full blur-3xl" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>
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

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 mb-6 shadow-2xl border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-500">
          <div className="flex items-center gap-5 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl blur-lg opacity-60 animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-xl">
                <SubjectIcon className="w-8 h-8" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                  Look-alike Toets
                </h1>
                <span className="px-2 py-0.5 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded-full text-xs font-bold text-cyan-400 border border-cyan-500/30">
                  xAI
                </span>
              </div>
              <p className="text-sm text-slate-400 font-medium">{subject} • {studentLevel}</p>
            </div>
          </div>

          {/* Info banner */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 rounded-xl p-4 border border-cyan-500/20">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-300 font-medium">
                  Powered by Grok-4 Fast
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Vragen die qua stijl en moeilijkheid niet te onderscheiden zijn van echte eindexamens
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-5">
          {/* Topic Selection */}
          <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-7 shadow-xl border border-slate-700/50 hover:border-cyan-500/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-white text-lg">Onderwerp</h3>
            </div>

            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              className="w-full p-4 bg-slate-900/50 border-2 border-slate-700 rounded-xl focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none text-white font-semibold transition-all cursor-pointer hover:bg-slate-900/70"
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
                className="w-full p-4 mt-4 bg-slate-900/50 border-2 border-cyan-500/50 rounded-xl focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none text-white font-medium transition-all placeholder:text-slate-500"
                autoFocus
              />
            )}
          </div>

          {/* Question Count */}
          <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-7 shadow-xl border border-slate-700/50 hover:border-emerald-500/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <ListChecks className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-white text-lg">Aantal vragen</h3>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {QUESTION_COUNTS.map(count => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  disabled={isGenerating}
                  className={`relative p-5 rounded-2xl font-bold text-2xl transition-all duration-300 ${
                    questionCount === count
                      ? 'bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-2xl shadow-cyan-500/30 scale-105'
                      : 'bg-slate-900/50 text-slate-400 hover:bg-slate-900/70 hover:text-white hover:scale-102 border border-slate-700 hover:border-cyan-500/30'
                  }`}
                >
                  {questionCount === count && (
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-emerald-500 rounded-2xl blur-xl opacity-40 animate-pulse" />
                  )}
                  <span className="relative">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Features list */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/30">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-slate-400">Wat maakt look-alike vragen speciaal?</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Echte examenstijl en structuur',
                'Realistische afleiders',
                'Authentieke bronteksten',
                'CITO/CvTE niveau'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-500">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
            <Button
              variant="primary"
              onClick={handleStart}
              disabled={isGenerating || (topic === 'custom' && !customTopic.trim())}
              className="relative w-full justify-center py-6 text-lg font-bold shadow-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:via-teal-500 hover:to-emerald-500 border-2 border-white/10 transition-all duration-300 hover:scale-102 active:scale-98"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent mr-3" />
                  Bezig met genereren...
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 mr-2 fill-current" />
                  Start Look-alike Toets
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
