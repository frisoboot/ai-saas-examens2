import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Even geduld..."
}) => {
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Layered gradient background - deep blue to teal to warm amber */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56, 189, 248, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 100% 100%, rgba(251, 191, 36, 0.2) 0%, transparent 40%),
            radial-gradient(ellipse 50% 50% at 0% 100%, rgba(20, 184, 166, 0.15) 0%, transparent 40%),
            linear-gradient(to bottom, #0f172a 0%, #1e293b 50%, #0f172a 100%)
          `
        }}
      />

      {/* Animated mesh grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          animation: 'meshMove 20s linear infinite'
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-cyan-500/20 to-transparent blur-3xl animate-float-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br from-amber-500/15 to-transparent blur-3xl animate-float-medium" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-teal-500/10 to-transparent blur-3xl animate-float-fast" />

      {/* Content container */}
      <div className="relative z-10 text-center px-6">

        {/* Animated logo/icon container */}
        <div className="relative w-32 h-32 mx-auto mb-10">
          {/* Outer rotating ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
            style={{
              animation: 'spin 8s linear infinite'
            }}
          />

          {/* Middle pulsing ring */}
          <div
            className="absolute inset-2 rounded-full border border-teal-400/40"
            style={{
              animation: 'pulse 2s ease-in-out infinite'
            }}
          />

          {/* Inner counter-rotating ring with gradient */}
          <div
            className="absolute inset-4 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(56, 189, 248, 0.5), transparent)',
              animation: 'spin 3s linear infinite reverse'
            }}
          />

          {/* Center icon container */}
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-2xl border border-white/10">
            {/* AI Brain icon */}
            <svg
              className="w-10 h-10 text-cyan-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.5))'
              }}
            >
              {/* Brain paths */}
              <path
                d="M12 2C9.5 2 7.5 3.5 7 5.5C5 5.5 3.5 7.5 4 9.5C3 10.5 3 12.5 4 13.5C3.5 15 4.5 17 6.5 17.5C7 19.5 9 21 11 21H13C15 21 17 19.5 17.5 17.5C19.5 17 20.5 15 20 13.5C21 12.5 21 10.5 20 9.5C20.5 7.5 19 5.5 17 5.5C16.5 3.5 14.5 2 12 2Z"
                className="animate-draw-path"
                strokeDasharray="100"
                strokeDashoffset="0"
              />
              {/* Neural connections */}
              <circle cx="9" cy="9" r="1" fill="currentColor" className="animate-pulse-delayed-1" />
              <circle cx="15" cy="9" r="1" fill="currentColor" className="animate-pulse-delayed-2" />
              <circle cx="12" cy="13" r="1" fill="currentColor" className="animate-pulse-delayed-3" />
              <line x1="9" y1="9" x2="12" y2="13" strokeWidth="0.5" className="animate-pulse-delayed-1" />
              <line x1="15" y1="9" x2="12" y2="13" strokeWidth="0.5" className="animate-pulse-delayed-2" />
            </svg>
          </div>
        </div>

        {/* Title with gradient text */}
        <h1
          className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-200 to-teal-200 bg-clip-text text-transparent"
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '-0.02em'
          }}
        >
          AI Examentrainer
        </h1>

        {/* Loading message */}
        <p className="text-slate-400 text-lg mb-8 font-medium">
          {message}
        </p>

        {/* Animated progress bar */}
        <div className="w-48 h-1 mx-auto bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-500 rounded-full"
            style={{
              width: '40%',
              animation: 'progressSlide 1.5s ease-in-out infinite',
              backgroundSize: '200% 100%'
            }}
          />
        </div>

        {/* Motivational subtext */}
        <p className="text-slate-500 text-sm mt-6 animate-fade-in-delayed">
          Klaar om te presteren ✨
        </p>
      </div>

      {/* Inline styles for custom animations */}
      <style>{`
        @keyframes meshMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -30px) scale(1.1); }
        }

        @keyframes float-medium {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 20px) scale(1.05); }
        }

        @keyframes float-fast {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.15); }
        }

        @keyframes progressSlide {
          0% { transform: translateX(-100%); background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { transform: translateX(350%); background-position: 0% 50%; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        @keyframes fadeInDelayed {
          0%, 50% { opacity: 0; }
          100% { opacity: 1; }
        }

        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }

        .animate-float-medium {
          animation: float-medium 6s ease-in-out infinite;
        }

        .animate-float-fast {
          animation: float-fast 4s ease-in-out infinite;
        }

        .animate-pulse-delayed-1 {
          animation: pulse 2s ease-in-out infinite;
        }

        .animate-pulse-delayed-2 {
          animation: pulse 2s ease-in-out infinite 0.3s;
        }

        .animate-pulse-delayed-3 {
          animation: pulse 2s ease-in-out infinite 0.6s;
        }

        .animate-fade-in-delayed {
          animation: fadeInDelayed 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
