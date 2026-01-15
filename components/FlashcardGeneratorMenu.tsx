import React, { useState, useMemo } from 'react';
import { Button } from './Button';
import { Sparkles, ArrowLeft, Target, ListChecks, Play, Layers } from 'lucide-react';
import { StudentLevel } from '../types';
import { getTopicsForSubject } from '../services/examData';
import { getSubjectIcon } from '../utils/subjectIcons';

interface FlashcardGeneratorMenuProps {
  subject: string;
  studentLevel: StudentLevel;
  onBack: () => void;
  onGenerate: (count: number, topic?: string) => void;
}

const CARD_COUNTS = [5, 10, 15, 20];

export const FlashcardGeneratorMenu: React.FC<FlashcardGeneratorMenuProps> = ({
  subject,
  studentLevel,
  onBack,
  onGenerate
}) => {
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [cardCount, setCardCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  const availableTopics = useMemo(() => getTopicsForSubject(subject, studentLevel), [subject, studentLevel]);
  const SubjectIcon = getSubjectIcon(subject);

  const handleStart = () => {
    setIsGenerating(true);
    const finalTopic = topic === 'custom' ? customTopic : topic;
    onGenerate(cardCount, finalTopic.trim() || undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/40 to-yellow-50/30 p-4 md:p-8 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-gradient-to-br from-orange-200/30 to-yellow-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 mb-6 shadow-2xl shadow-amber-200/50 border border-white/60 hover:shadow-amber-300/60 transition-all duration-500">
          <div className="flex items-center gap-5 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl blur-md opacity-50 animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 text-white flex items-center justify-center shadow-lg">
                <Layers className="w-8 h-8" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-700 via-orange-700 to-yellow-700 bg-clip-text text-transparent">
                AI Flashcard Generator
              </h1>
              <p className="text-sm text-slate-600 font-medium mt-1">{subject} - {studentLevel}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-5">
          {/* Info Card */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-7 shadow-xl shadow-slate-200/50 border border-white/60">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-900">Hoe werkt het?</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              De AI genereert flashcards op basis van de examenstof voor {subject} ({studentLevel}).
              Elke kaart heeft een vraag aan de voorkant en het antwoord aan de achterkant.
              Kies een onderwerp voor gerichte kaarten, of laat het leeg voor een mix van onderwerpen.
            </p>
          </div>

          {/* Topic Selection */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-7 shadow-xl shadow-slate-200/50 border border-white/60 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/50">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Onderwerp</h3>
            </div>

            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
              className="w-full p-4 bg-gradient-to-br from-slate-50 to-amber-50/30 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none text-slate-900 font-semibold transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              <option value="">Alle onderwerpen (mix)</option>
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
                className="w-full p-4 mt-4 bg-white border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none text-slate-900 font-medium transition-all shadow-sm placeholder:text-slate-400"
                autoFocus
              />
            )}
          </div>

          {/* Card Count */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-7 shadow-xl shadow-slate-200/50 border border-white/60 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-orange-200/50">
                <ListChecks className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Aantal kaarten</h3>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {CARD_COUNTS.map(count => (
                <button
                  key={count}
                  onClick={() => setCardCount(count)}
                  disabled={isGenerating}
                  className={`relative p-5 rounded-2xl font-bold text-2xl transition-all duration-300 ${
                    cardCount === count
                      ? 'bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 text-white shadow-2xl shadow-amber-300/50 scale-105'
                      : 'bg-gradient-to-br from-slate-50 to-amber-50/20 text-slate-600 hover:bg-gradient-to-br hover:from-amber-50 hover:to-orange-50 hover:scale-102 hover:shadow-lg border border-slate-200 hover:border-amber-200'
                  }`}
                >
                  {cardCount === count && (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
                  )}
                  <span className="relative">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
            <Button
              variant="primary"
              onClick={handleStart}
              disabled={isGenerating || (topic === 'custom' && !customTopic.trim())}
              className="relative w-full justify-center py-6 text-lg font-bold shadow-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 hover:from-amber-500 hover:via-orange-500 hover:to-yellow-500 border-2 border-white/20 transition-all duration-300 hover:scale-102 active:scale-98"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent mr-3" />
                  Kaarten worden gegenereerd...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6 mr-2" />
                  Genereer Flashcards
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
