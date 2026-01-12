import React, { useState, useMemo } from 'react';
import { Button } from './Button';
import { Sparkles, ArrowLeft, Target, ListChecks, Play, Info } from 'lucide-react';
import { StudentLevel } from '../types';
import { getTopicsForSubject } from '../services/examData';
import { getSubjectIcon } from '../utils/subjectIcons';

interface AIGeneratorMenuProps {
  subject: string;
  studentLevel: StudentLevel;
  onBack: () => void;
  onGenerate: (count: number, topic?: string) => void;
}

const QUESTION_COUNTS = [5, 10, 15, 20];

export const AIGeneratorMenu: React.FC<AIGeneratorMenuProps> = ({
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
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-3xl mx-auto">
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

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
              <SubjectIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">AI Examen Generator</h1>
              <p className="text-slate-500 mt-1">
                Stel je eigen {subject} oefentoets samen ({studentLevel})
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Config Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Topic Selection */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Onderwerp</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-500 font-medium block mb-2">
                    Kies een examenonderwerp
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={isGenerating}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-slate-900 font-medium appearance-none cursor-pointer"
                  >
                    <option value="">Algemene examentoets (Alle onderwerpen)</option>
                    {availableTopics.length > 0 && (
                      <optgroup label={`Examenonderwerpen ${studentLevel}`}>
                        {availableTopics.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </optgroup>
                    )}
                    <option value="custom">✨ Eigen onderwerp kiezen...</option>
                  </select>
                </div>

                {topic === 'custom' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-sm text-slate-500 font-medium block mb-2">
                      Waar wil je specifiek op oefenen?
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
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <ListChecks className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Aantal vragen</h3>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {QUESTION_COUNTS.map(count => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    disabled={isGenerating}
                    className={`p-4 rounded-xl border-2 transition-all font-bold text-lg flex flex-col items-center justify-center gap-1 ${
                      questionCount === count
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-[1.02]'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
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

          {/* Sidebar Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 sticky top-6">
              <h3 className="font-bold text-slate-900 mb-4">Samenvatting</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Vak</span>
                  <span className="font-bold text-slate-900">{subject}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Niveau</span>
                  <span className="font-bold text-slate-900">{studentLevel}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Onderwerp</span>
                  <span className="font-bold text-slate-900 max-w-[150px] truncate text-right">
                    {topic === 'custom' ? (customTopic || 'Eigen onderwerp') : (topic || 'Algemeen')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Vragen</span>
                  <span className="font-bold text-slate-900">{questionCount}</span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <p className="text-xs text-blue-800 leading-relaxed">
                    De AI genereert unieke {studentLevel} vragen op basis van de officiële examenstof.
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleStart}
                disabled={isGenerating || (topic === 'custom' && !customTopic.trim())}
                className="w-full justify-center py-4 text-base font-bold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transition-all"
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
