import React, { useState, useEffect, useRef } from 'react';
import { TUTORIAL_STEPS } from './tutorialData';
import { TutorialProgress } from './TutorialProgress';
import { TutorialStep } from './TutorialStep';
import { TutorialControls } from './TutorialControls';
import { CheckCircle2, RotateCcw, MessageSquare, BookOpen, Layers } from 'lucide-react';

export function TutorialView({ onExit, onReturnToChat, voiceEnabled = true, onToggleVoice }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Keep ref to avoid stale state in interval
  const stepIndexRef = useRef(currentStepIndex);
  stepIndexRef.current = currentStepIndex;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const stepDuration = currentStep?.duration || 12;

  // Remaining seconds calculation
  const remainingSeconds = Math.max(
    0,
    Math.ceil(stepDuration * (1 - progressPercent / 100))
  );

  // ── Safe Text-to-Speech (Non-Blocking) ─────────────────────────
  const speakCurrentStep = (textToSpeak) => {
    if (!voiceEnabled || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const text = textToSpeak || currentStep?.voiceText;
      if (!text) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.0;
      utterance.rate = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
      );
      if (englishVoice) utterance.voice = englishVoice;

      utterance.onerror = () => {
        // Silently handle error, timer will continue
      };
      utterance.onend = () => {
        // Speech ended, timer will continue smoothly
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      // Speech synthesis failed or blocked; continue without audio
    }
  };

  const cancelSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // ── Speak on Step Change ──────────────────────────────────────
  useEffect(() => {
    if (!isComplete) {
      speakCurrentStep(TUTORIAL_STEPS[currentStepIndex]?.voiceText);
    }
    return () => cancelSpeech();
  }, [currentStepIndex, voiceEnabled, isComplete]);

  // ── Reliable Auto-Advance State Machine Ticker ────────────────
  useEffect(() => {
    if (isComplete) return;

    const intervalTime = 100; // tick every 100ms
    const stepIncrement = 100 / (stepDuration * (1000 / intervalTime));

    const ticker = setInterval(() => {
      if (isPausedRef.current) return;

      setProgressPercent((prev) => {
        const next = prev + stepIncrement;
        if (next >= 100) {
          // Advance to next step
          if (stepIndexRef.current < TUTORIAL_STEPS.length - 1) {
            setCurrentStepIndex((idx) => idx + 1);
            return 0;
          } else {
            // Completed all steps
            setIsComplete(true);
            cancelSpeech();
            return 100;
          }
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(ticker);
  }, [currentStepIndex, stepDuration, isComplete]);

  // Clean up all speech on unmount
  useEffect(() => {
    return () => cancelSpeech();
  }, []);

  // ── Manual Navigation Handlers ────────────────────────────────
  const handleNext = () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      setProgressPercent(0);
    } else {
      setIsComplete(true);
      cancelSpeech();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      setProgressPercent(0);
    }
  };

  const handleStepClick = (index) => {
    setCurrentStepIndex(index);
    setProgressPercent(0);
  };

  const handleTogglePlayPause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleSkip = () => {
    setIsComplete(true);
    cancelSpeech();
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setProgressPercent(0);
    setIsComplete(false);
    setIsPaused(false);
  };

  return (
    <div className="w-full h-full flex flex-col tutorial-blueprint-bg relative overflow-hidden select-none">
      {/* Ambient 50/50 Dual Glows (Chef Orange Left, Salt Cyan Right) */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mt-20" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Tutorial Header Frame */}
      <div className="flex-shrink-0 px-4 py-3 bg-[#080d1a]/95 border-b border-white/[0.08] flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-cyan-500 p-[1px] shadow-[0_0_15px_rgba(249,115,22,0.3)]">
            <div className="w-full h-full bg-[#070b14] rounded-[11px] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                Interactive Orchestration Tutorial
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono font-bold">
                Auto-Advancing
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              5-Step guided walkthrough of Chef and SaltStack orchestration
            </p>
          </div>
        </div>

        <button
          onClick={onReturnToChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back to Chat</span>
        </button>
      </div>

      {/* Main Content Area */}
      {isComplete ? (
        /* Completion View */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 animate-fade-in space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
            <CheckCircle2 className="w-9 h-9 text-white" />
          </div>

          <div className="max-w-md space-y-2">
            <h3 className="text-xl font-extrabold text-white">
              Tutorial Successfully Completed
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              You are now fully trained on Chef cookbooks, SaltStack states, fleet targeting, and live health diagnostics.
            </p>
          </div>

          {/* Key Takeaway Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg text-left text-xs font-mono">
            <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-500/30">
              <span className="text-orange-400 font-bold block mb-1">Chef Infra (Orange)</span>
              <p className="text-[11px] text-slate-300 font-sans">
                Pull-based idempotent convergence using Ruby DSL cookbooks.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30">
              <span className="text-cyan-400 font-bold block mb-1">SaltStack (Cyan)</span>
              <p className="text-[11px] text-slate-300 font-sans">
                Push-based real-time state orchestration over ZeroMQ bus.
              </p>
            </div>
          </div>

          {/* Completion Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleRestart}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.04] text-xs font-bold text-slate-300 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Tutorial</span>
            </button>

            <button
              onClick={onReturnToChat}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-cyan-500 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:opacity-95 transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Return to AI Chat</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Step Presentation */
        <>
          <TutorialProgress
            currentStepIndex={currentStepIndex}
            onStepClick={handleStepClick}
            progressPercent={progressPercent}
            remainingSeconds={remainingSeconds}
            isPaused={isPaused}
          />

          <div className="flex-1 overflow-hidden flex flex-col">
            <TutorialStep step={currentStep} />
          </div>

          <TutorialControls
            currentStepIndex={currentStepIndex}
            totalSteps={TUTORIAL_STEPS.length}
            isPaused={isPaused}
            onPrev={handlePrev}
            onNext={handleNext}
            onTogglePlayPause={handleTogglePlayPause}
            onSkip={handleSkip}
            onExit={onExit}
            voiceEnabled={voiceEnabled}
            onToggleVoice={onToggleVoice}
            onListenStep={() => speakCurrentStep()}
          />
        </>
      )}
    </div>
  );
}
