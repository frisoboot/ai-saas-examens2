import React from 'react';
import { BrainCircuit, CheckCircle } from 'lucide-react';

interface ExamSubmittingProps {
  questionCount: number;
}

export const ExamSubmitting: React.FC<ExamSubmittingProps> = ({ questionCount }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-400/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="text-center relative z-10">
        {/* Animated circles background */}
        <div className="relative mb-10">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-4 border-white/10 animate-ping" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-white/20 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-white/30 animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          <div className="relative w-24 h-24 mx-auto bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl shadow-black/20 border border-white/30">
            <BrainCircuit className="w-12 h-12 text-white animate-pulse" />
          </div>
        </div>

        {/* Loading text */}
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
          Toets wordt verwerkt...
        </h2>
        <p className="text-white/90 text-lg md:text-xl mb-10 max-w-md mx-auto drop-shadow">
          Je antwoorden worden opgeslagen en geanalyseerd door de AI
        </p>

        {/* Progress indicators */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-4 h-4 bg-white rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0ms' }} />
          <div className="w-4 h-4 bg-white rounded-full animate-bounce shadow-lg" style={{ animationDelay: '150ms' }} />
          <div className="w-4 h-4 bg-white rounded-full animate-bounce shadow-lg" style={{ animationDelay: '300ms' }} />
        </div>

        {/* Info card */}
        <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 max-w-md mx-auto border border-white/30 shadow-2xl">
          <div className="flex items-center gap-4 text-white text-base">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="text-left">
              <div className="font-bold text-lg mb-1">{questionCount} vragen</div>
              <div className="text-white/80 text-sm">Succesvol beantwoord</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
