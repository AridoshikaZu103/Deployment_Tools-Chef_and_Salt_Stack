import React from 'react';

export function LiveNeuralVisualizer({ isSpeaking, isListening, onStartListening, onStopSpeaking, onStartTutorial }) {
  // 24 animated frequency audio visualizer bars
  const bars = [8, 14, 22, 16, 28, 20, 32, 18, 26, 36, 24, 40, 28, 34, 22, 38, 20, 30, 16, 26, 12, 22, 14, 8];

  return (
    <div className="relative p-6 my-2 rounded-2xl bg-gradient-to-b from-[#0c1326] to-[#070b14] border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.15)] overflow-hidden animate-fade-in">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-violet-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* Live Badge */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></span>
          </span>
          <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-cyan-300">
            GEMINI 3.8 FLASH • LIVE SESSION
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
          {isSpeaking ? 'VOICE STREAMING' : isListening ? 'LISTENING (MIC)' : 'STANDBY'}
        </span>
      </div>

      {/* Central Rotating Holographic Orb */}
      <div className="flex flex-col items-center justify-center py-4 relative z-10">
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Outer Rotating Cyan Ring */}
          <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/50 animate-spin-slow shadow-[0_0_20px_rgba(6,182,212,0.3)]" />

          {/* Inner Counter-Rotating Violet Ring */}
          <div className="absolute inset-2 rounded-full border border-violet-400/50 animate-spin-reverse shadow-[0_0_15px_rgba(139,92,246,0.3)]" />

          {/* Central Pulsing Sphere */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-violet-600 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-neural-pulse">
            🤖
          </div>
        </div>

        {/* Live Audio Spectrum Equalizer */}
        <div className="flex items-center justify-center gap-1 mt-5 h-10 w-full max-w-xs px-4">
          {bars.map((height, i) => {
            const dynamicScale = isSpeaking ? 1.2 : isListening ? 0.9 : 0.4;
            const computedHeight = Math.max(4, Math.round(height * dynamicScale));
            return (
              <span
                key={i}
                style={{ height: `${computedHeight}px` }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  i % 3 === 0
                    ? 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]'
                    : i % 3 === 1
                    ? 'bg-violet-400 shadow-[0_0_6px_#a855f7]'
                    : 'bg-blue-400 shadow-[0_0_6px_#60a5fa]'
                } ${isSpeaking ? 'animate-pulse' : ''}`}
              />
            );
          })}
        </div>

        <p className="text-xs text-slate-300 font-medium mt-3 text-center">
          {isSpeaking
            ? 'Nova-Orchestrator is speaking aloud with speech synthesis...'
            : isListening
            ? 'Listening to your microphone voice command...'
            : 'Speak via microphone or explore interactive guided tutorials.'}
        </p>

        {/* Interactive Action Pills in Live Mode */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          <button
            onClick={onStartTutorial}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-extrabold text-xs shadow-[0_0_15px_rgba(249,115,22,0.35)] transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <span>🎓</span>
            <span>Start Interactive Tutorial</span>
          </button>

          {isSpeaking && (
            <button
              onClick={onStopSpeaking}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
            >
              <span>⏹️</span>
              <span>Stop Voice</span>
            </button>
          )}

          <button
            onClick={onStartListening}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse'
                : 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border-white/[0.12]'
            }`}
          >
            <span>{isListening ? '🔴' : '🎙️'}</span>
            <span>{isListening ? 'Listening...' : 'Talk with Voice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
