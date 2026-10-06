import React from 'react';
import { Check, Clock, Pause, Play } from 'lucide-react';
import { TUTORIAL_STEPS } from './tutorialData';

export function TutorialProgress({
  currentStepIndex,
  onStepClick,
  progressPercent,
  remainingSeconds,
  isPaused
}) {
  const currentStep = TUTORIAL_STEPS[currentStepIndex];

  return (
    <div className="w-full bg-[#080d1a] border-b border-white/[0.08] p-4 flex flex-col gap-3">
      {/* Top Meta: Step Count & Auto-Advance Status */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-slate-300">
            Step {currentStepIndex + 1} of {TUTORIAL_STEPS.length}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 font-medium hidden sm:inline">
            {currentStep.title}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          {isPaused ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <Pause className="w-3 h-3" />
              <span>Auto-advance Paused</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <Clock className="w-3 h-3 animate-spin-slow" />
              <span>Next in {remainingSeconds}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Step Pills Row */}
      <div className="grid grid-cols-5 gap-2">
        {TUTORIAL_STEPS.map((step, idx) => {
          const isCurrent = idx === currentStepIndex;
          const isPast = idx < currentStepIndex;
          const isChef = step.tool === 'chef';
          const isSalt = step.tool === 'salt';

          let stepTheme = 'border-white/[0.08] bg-[#05070d] text-slate-500';

          if (isCurrent) {
            if (isChef) {
              stepTheme = 'border-orange-500 bg-orange-500/20 text-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.3)]';
            } else if (isSalt) {
              stepTheme = 'border-cyan-500 bg-cyan-500/20 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]';
            } else {
              stepTheme = 'border-violet-500 bg-gradient-to-r from-orange-500/20 to-cyan-500/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]';
            }
          } else if (isPast) {
            stepTheme = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
          }

          return (
            <button
              key={step.id}
              onClick={() => onStepClick(idx)}
              className={`p-2 rounded-xl border transition-all text-left flex flex-col gap-1 cursor-pointer hover:border-white/20 ${stepTheme}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold">0{step.step}</span>
                {isPast ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isChef ? 'bg-orange-500' : isSalt ? 'bg-cyan-400' : 'bg-gradient-to-r from-orange-400 to-cyan-400'
                    }`}
                  />
                )}
              </div>
              <span className="text-[11px] font-semibold truncate leading-tight hidden md:block">
                {step.step === 1
                  ? 'Chef'
                  : step.step === 2
                  ? 'SaltStack'
                  : step.step === 3
                  ? 'Comparison'
                  : step.step === 4
                  ? 'Workflow'
                  : 'Fleet Health'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Sub-Step Countdown Progress Bar */}
      <div className="w-full h-1 bg-[#05070d] rounded-full overflow-hidden relative">
        <div
          className={`h-full transition-all duration-100 ease-linear ${
            currentStep.tool === 'chef'
              ? 'bg-gradient-to-r from-orange-600 to-amber-400 shadow-[0_0_10px_#f97316]'
              : currentStep.tool === 'salt'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-400 shadow-[0_0_10px_#06b6d4]'
              : 'bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400 shadow-[0_0_10px_#8b5cf6]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
