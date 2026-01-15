import React, { useState, useMemo } from 'react';
import { Button } from './Button';
import { ArrowLeft, Target, Play, Sparkles, Zap, Brain, Clock } from 'lucide-react';
import { StudentLevel } from '../types';
import { getTopicsForSubject } from '../services/examData';
import { getSubjectIcon } from '../utils/subjectIcons';

interface XAIGeneratorMenuProps {
  subject: string;
  studentLevel: StudentLevel;
  onBack: () => void;
  onGenerate: (count: number, topic?: string, timeLimit?: number) => void;
}

const TIME_LIMITS = [
  { label: '30 min', value: 30, questions: 10 },
  { label: '45 min', value: 45, questions: 15 },
  { label: '60 min', value: 60, questions: 20 },
  { label: '90 min', value: 90, questions: 30 }
];

export const XAIGeneratorMenu: React.FC<XAIGeneratorMenuProps> = ({
  subject,
  studentLevel,
  onBack,
  onGenerate
}) => {
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTime, setSelectedTime] = useState(TIME_LIMITS[1]); // Default 45 min
  const [isGenerating, setIsGenerating] = useState(false);

  const availableTopics = useMemo(() => getTopicsForSubject(subject, studentLevel), [subject, studentLevel]);
  const SubjectIcon = getSubjectIcon(subject);

  const handleStart = () => {
    setIsGenerating(true);
    const finalTopic = topic === 'custom' ? customTopic : topic;
    onGenerate(selectedTime.questions, finalTopic.trim() || undefined, selectedTime.value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50/40 to-emerald-50/30 p-4 md:p-8 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-gradient-to-br from-cyan-200/30 to-teal-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-gradient-to-br from-teal-200/30 to-emerald-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 mb-6 shadow-2xl shadow-cyan-200/50 border border-white/60 hover:shadow-cyan-300/60 transition-all duration-500">
          <div className="flex items-center gap-5 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl blur-md opacity-50 animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-lg">
                <SubjectIcon className="w-8 h-8" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
                  Look-alike Toets
                </h1>
                <span className="px-2 py-0.5 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 rounded-full text-xs font-bold text-cyan-600 border border-cyan-500/30">
                  xAI
                </span>
              </div>
              <p className="text-sm text-slate-600 font-medium">{subject} • {studentLevel}</p>
            </div>
          </div>

          {/* Info banner */}
          <div className="bg-gradient-to-r from-cyan-50 to-emerald-50 rounded-xl p-4 border border-cyan-200">
            <div className="flex items-start gap-3">
              <Brain className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-700 font-medium">
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
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-7 shadow-xl shadow-slate-200/50 border border-white/60 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-200/50">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Onderwerp</h3>
            </div>

            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              className="w-full p-4 bg-gradient-to-br from-slate-50 to-cyan-50/30 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 outline-none text-slate-900 font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer"
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
                className="w-full p-4 mt-4 bg-white border-2 border-cyan-300 rounded-xl focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 outline-none text-slate-900 font-medium transition-all shadow-sm placeholder:text-slate-400"
                autoFocus
              />
            )}
          </div>

          {/* Time Duration - determines both time and question count */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-7 shadow-xl shadow-slate-200/50 border border-white/60 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-200/50">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Tijdsduur</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TIME_LIMITS.map((timeOption) => (
                <button
                  key={timeOption.value}
                  onClick={() => setSelectedTime(timeOption)}
                  disabled={isGenerating}
                  className={`relative p-5 rounded-2xl font-bold transition-all duration-300 ${
                    selectedTime.value === timeOption.value
                      ? 'bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-2xl shadow-cyan-300/50 scale-105'
                      : 'bg-gradient-to-br from-slate-50 to-cyan-50/20 text-slate-600 hover:bg-gradient-to-br hover:from-cyan-50 hover:to-teal-50 hover:scale-102 hover:shadow-lg border border-slate-200 hover:border-cyan-200'
                  }`}
                >
                  {selectedTime.value === timeOption.value && (
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-emerald-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
                  )}
                  <div className="relative">
                    <div className="text-xl">{timeOption.label}</div>
                    <div className={`text-xs mt-1 ${selectedTime.value === timeOption.value ? 'text-white/80' : 'text-slate-400'}`}>
                      {timeOption.questions} vragen
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Features list */}
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 border border-white/60">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <span className="text-sm font-semibold text-slate-600">Wat maakt look-alike vragen speciaal?</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Echte examenstijl en structuur',
                'Realistische afleiders',
                'Authentieke bronteksten',
                'CITO/CvTE niveau'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
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
              className="relative w-full justify-center py-6 text-lg font-bold shadow-2xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:via-teal-500 hover:to-emerald-500 border-2 border-white/20 transition-all duration-300 hover:scale-102 active:scale-98"
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
