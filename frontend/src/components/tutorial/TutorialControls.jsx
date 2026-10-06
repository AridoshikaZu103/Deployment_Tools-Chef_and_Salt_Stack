import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';

export function TutorialControls({
  currentStepIndex,
  totalSteps,
  isPaused,
  onPrev,
  onNext,
  onTogglePlayPause,
  onSkip,
  onExit,
  voiceEnabled,
  onToggleVoice,
  onListenStep
}) {
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;

  return (
    <div className="flex-shrink-0 p-3 sm:p-4 bg-[#080d1a] border-t border-white/[0.08] flex items-center justify-between gap-2">
      {/* Left: Previous & Exit */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={isFirst}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
          title="Previous Step"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <button
          onClick={onExit}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/[0.08] text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
          title="Exit Tutorial"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Exit</span>
        </button>
      </div>

      {/* Center: Play/Pause Auto-Advance & Voice Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlayPause}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
            isPaused
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
              : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
          }`}
          title={isPaused ? 'Resume Auto-Advance' : 'Pause Auto-Advance'}
        >
          {isPaused ? (
            <>
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Play</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pause</span>
            </>
          )}
        </button>

        {onListenStep && (
          <button
            onClick={onListenStep}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/30 transition cursor-pointer"
            title="Narrate Step Aloud"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-mono">Narrate</span>
          </button>
        )}

        <button
          onClick={onToggleVoice}
          className={`p-1.5 rounded-xl border text-xs transition cursor-pointer ${
            voiceEnabled
              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
              : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-slate-300'
          }`}
          title={voiceEnabled ? 'Mute AI Narration' : 'Enable AI Narration'}
        >
          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Right: Skip & Next / Complete */}
      <div className="flex items-center gap-2">
        {!isLast && (
          <button
            onClick={onSkip}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/[0.08] text-xs text-slate-400 hover:text-white transition cursor-pointer"
            title="Skip to End"
          >
            <span className="hidden sm:inline">Skip</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-cyan-500 text-white font-extrabold text-xs shadow-md hover:opacity-95 transition active:scale-95 cursor-pointer"
        >
          <span>{isLast ? 'Complete Tutorial' : 'Next Step'}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
