import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { ArrowLeft, RotateCcw, Check, X, Sparkles, Trophy, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { Flashcard, FlashcardSession, FlashcardProgress, StudentProfile } from '../types';
import { getSubjectIcon, getSubjectColor } from '../utils/subjectIcons';
import { saveFlashcardProgress, getFlashcardProgress } from '../services/flashcardService';

interface FlashcardStudyProps {
  session: FlashcardSession;
  student: StudentProfile;
  onBack: () => void;
  onComplete: () => void;
}

export const FlashcardStudy: React.FC<FlashcardStudyProps> = ({
  session,
  student,
  onBack,
  onComplete
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set(session.knownCards));
  const [unknownCards, setUnknownCards] = useState<Set<string>>(new Set(session.unknownCards));
  const [isComplete, setIsComplete] = useState(false);
  const [studyMode, setStudyMode] = useState<'all' | 'unknown'>('all');

  const SubjectIcon = getSubjectIcon(session.subject);
  const subjectColorClass = getSubjectColor(session.subject);

  // Get cards to study based on mode
  const cardsToStudy = studyMode === 'all'
    ? session.cards
    : session.cards.filter(c => unknownCards.has(c.id) || (!knownCards.has(c.id) && !unknownCards.has(c.id)));

  const currentCard = cardsToStudy[currentIndex];
  const progress = ((knownCards.size + unknownCards.size) / session.cards.length) * 100;

  // Save progress when session ends
  const saveProgress = async () => {
    const progressData: FlashcardProgress = {
      id: `fp-${student.name}-${session.subject}-${session.level}`,
      studentName: student.name,
      subject: session.subject,
      level: session.level,
      cardsStudied: knownCards.size + unknownCards.size,
      cardsMastered: knownCards.size,
      totalCards: session.cards.length,
      lastStudied: new Date().toISOString(),
    };
    await saveFlashcardProgress(progressData);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKnown = () => {
    if (!currentCard) return;

    const newKnown = new Set(knownCards);
    newKnown.add(currentCard.id);
    setKnownCards(newKnown);

    // Remove from unknown if it was there
    const newUnknown = new Set(unknownCards);
    newUnknown.delete(currentCard.id);
    setUnknownCards(newUnknown);

    goToNext();
  };

  const handleUnknown = () => {
    if (!currentCard) return;

    const newUnknown = new Set(unknownCards);
    newUnknown.add(currentCard.id);
    setUnknownCards(newUnknown);

    // Remove from known if it was there
    const newKnown = new Set(knownCards);
    newKnown.delete(currentCard.id);
    setKnownCards(newKnown);

    goToNext();
  };

  const goToNext = () => {
    setIsFlipped(false);
    if (currentIndex < cardsToStudy.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Check if all cards have been reviewed
      if (knownCards.size + unknownCards.size >= session.cards.length - 1 ||
          (studyMode === 'unknown' && currentIndex === cardsToStudy.length - 1)) {
        setIsComplete(true);
        // Save progress with error handling to prevent silent failures
        saveProgress().catch(error => {
          console.error('Failed to save flashcard progress:', error);
        });
      } else {
        setCurrentIndex(0);
      }
    }
  };

  const goToPrevious = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleStudyUnknown = () => {
    setStudyMode('unknown');
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsComplete(false);
  };

  const handleRestart = () => {
    setKnownCards(new Set());
    setUnknownCards(new Set());
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsComplete(false);
    setStudyMode('all');
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isComplete) return;

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          handleFlip();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          if (isFlipped) {
            handleKnown();
          } else {
            goToNext();
          }
          break;
        case '1':
        case 'k':
          if (isFlipped) handleKnown();
          break;
        case '2':
        case 'u':
          if (isFlipped) handleUnknown();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isFlipped, isComplete]);

  // Complete screen
  if (isComplete) {
    const masteryRate = Math.round((knownCards.size / session.cards.length) * 100);
    const unknownCount = unknownCards.size;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50/40 to-pink-50/30 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-indigo-200/50 border border-white/60 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
              <Trophy className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-2">Sessie Voltooid!</h2>
            <p className="text-slate-600 mb-8">{session.subject} flashcards</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                <div className="text-4xl font-bold text-green-600 mb-1">{knownCards.size}</div>
                <div className="text-sm text-green-700 font-medium">Geweten</div>
              </div>
              <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
                <div className="text-4xl font-bold text-amber-600 mb-1">{unknownCount}</div>
                <div className="text-sm text-amber-700 font-medium">Nog oefenen</div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-200">
              <div className="text-sm text-slate-600 mb-2">Beheersingsgraad</div>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-slate-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                    style={{ width: `${masteryRate}%` }}
                  />
                </div>
                <span className="text-2xl font-bold text-slate-900">{masteryRate}%</span>
              </div>
            </div>

            <div className="space-y-3">
              {unknownCount > 0 && (
                <Button
                  variant="primary"
                  onClick={handleStudyUnknown}
                  className="w-full justify-center py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  <Target className="w-5 h-5 mr-2" />
                  Oefen onbekende kaarten ({unknownCount})
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={handleRestart}
                className="w-full justify-center py-4"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Opnieuw beginnen
              </Button>
              <Button
                variant="ghost"
                onClick={onComplete}
                className="w-full justify-center py-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Terug naar vak
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50/40 to-pink-50/30 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Geen kaarten beschikbaar</p>
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50/40 to-pink-50/30 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 hover:bg-white/60"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Stoppen
          </Button>

          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${subjectColorClass} flex items-center justify-center`}>
              <SubjectIcon className="w-5 h-5" />
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-900">{session.subject}</div>
              <div className="text-xs text-slate-500">
                {studyMode === 'unknown' ? 'Herhaling' : 'Alle kaarten'}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span>Kaart {currentIndex + 1} van {cardsToStudy.length}</span>
            <span className="flex items-center gap-4">
              <span className="text-green-600 font-medium">{knownCards.size} geweten</span>
              <span className="text-amber-600 font-medium">{unknownCards.size} oefenen</span>
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full flex">
              <div
                className="bg-green-500 transition-all duration-300"
                style={{ width: `${(knownCards.size / session.cards.length) * 100}%` }}
              />
              <div
                className="bg-amber-500 transition-all duration-300"
                style={{ width: `${(unknownCards.size / session.cards.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Flashcard */}
        <div
          className="relative perspective-1000 cursor-pointer mb-8"
          onClick={handleFlip}
          style={{ perspective: '1000px' }}
        >
          <div
            className={`relative w-full min-h-[400px] transition-transform duration-500 transform-style-preserve-3d ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}
          >
            {/* Front of card */}
            <div
              className="absolute inset-0 backface-hidden bg-white rounded-3xl p-8 shadow-2xl shadow-indigo-200/50 border border-white/60 flex flex-col items-center justify-center"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4">
                Vraag
              </div>
              <p className="text-2xl md:text-3xl font-medium text-slate-900 text-center leading-relaxed">
                {currentCard.front}
              </p>
              {currentCard.topic && (
                <div className="mt-6 px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-600">
                  {currentCard.topic}
                </div>
              )}
              <div className="absolute bottom-6 text-sm text-slate-400">
                Klik of druk op spatie om te draaien
              </div>
            </div>

            {/* Back of card */}
            <div
              className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 shadow-2xl shadow-indigo-200/50 border border-indigo-200/60 flex flex-col items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-4">
                Antwoord
              </div>
              <p className="text-xl md:text-2xl font-medium text-slate-900 text-center leading-relaxed whitespace-pre-wrap">
                {currentCard.back}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-4">
          {isFlipped ? (
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="secondary"
                onClick={handleUnknown}
                className="py-5 justify-center bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 hover:border-amber-300"
              >
                <X className="w-5 h-5 mr-2" />
                Nog oefenen
              </Button>
              <Button
                variant="primary"
                onClick={handleKnown}
                className="py-5 justify-center bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Check className="w-5 h-5 mr-2" />
                Geweten!
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={handleFlip}
              className="w-full py-5 justify-center bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Toon antwoord
            </Button>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="text-slate-600"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Vorige
            </Button>
            <span className="text-sm text-slate-500">
              Gebruik pijltjestoetsen om te navigeren
            </span>
            <Button
              variant="ghost"
              onClick={() => { setIsFlipped(false); goToNext(); }}
              disabled={currentIndex === cardsToStudy.length - 1}
              className="text-slate-600"
            >
              Volgende
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
