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

        {/* Hero Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 mb-6 shadow-2xl shadow-indigo-200/50 border border-white/60 hover:shadow-indigo-300/60 transition-all duration-500">
          <div className="flex items-center gap-5 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-md opacity-50 animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg">
                <SubjectIcon className="w-8 h-8" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 bg-clip-text text-transparent">
                  Look-alike Toets
                </h1>
                <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full text-xs font-bold text-indigo-600 border border-indigo-500/30">
                  xAI
                </span>
              </div>
              <p className="text-sm text-slate-600 font-medium">{subject} • {studentLevel}</p>
            </div>
          </div>

          {/* Info banner - uitleg hoe look-alike werkt */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200/50">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-800 font-medium">
                  Hoe werkt het?
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  De AI analyseert echte eindexamens en maakt vragen die qua stijl, structuur en moeilijkheid identiek zijn. Perfect om te oefenen met authentieke examenvragen!
                </p>
              </div>
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

          {/* Features list */}
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 border border-white/60 shadow-lg shadow-slate-200/30">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-slate-700">Wat maakt look-alike vragen speciaal?</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Echte examenstijl en structuur',
                'Realistische afleiders',
                'Authentieke bronteksten',
                'CITO/CvTE niveau'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <Zap className="w-3.5 h-3.5 text-purple-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
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
