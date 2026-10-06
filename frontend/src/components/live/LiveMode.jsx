import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Mic,
  Square,
  Volume2,
  Terminal,
  Activity,
  Zap,
  AlertCircle,
  AlertTriangle,
  Bot,
  User,
  Radio,
  Send,
  Trash2,
  ArrowDown,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { AIMessage } from '../ai/AIMessage';
import { LiveMetrics } from './LiveMetrics';

const SIMULATED_LOGS = [
  '[ZeroMQ] Salt Master published state.highstate to 5 minions across ports 4505/4506',
  '[Chef-Client] Node web-prod-01 synchronized cookbook: nginx (version 1.24.0)',
  '[Diagnostics] TCP Socket Probe: port 22 (SSH) responsive in 1.4ms',
  '[Diagnostics] TCP Socket Probe: port 80 (HTTP) responsive in 2.1ms',
  '[Diagnostics] TCP Socket Probe: port 5432 (PostgreSQL) responsive in 1.8ms',
  '[Salt-Returner] All 5 minions returned exit_code=0: State changes: 0 (Already Converged)',
  '[Idempotency] Chef converged 12 resources: 0 updated, 12 up-to-date',
  '[Audit] Fleet drift status: 0.00% across production cluster'
];

const EMPTY_STATE_PROMPTS = [
  'How do I deploy Nginx using Chef?',
  'Show me the production deployment plan.',
  'Explain this Chef recipe.',
  'Check the production cluster.'
];

const QUICK_TEXT_PROMPTS = [
  'How do I deploy Nginx using Chef?',
  'Show me the production deployment plan.',
  'Write an Nginx reload recipe in Chef with zero downtime',
  'What is the difference between Salt grains and pillar?',
  'Diagnose degraded socket ports on cluster servers'
];

export function LiveMode({
  voiceState = 'READY', // 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'STOPPED' | 'ERROR'
  voiceError = null,
  interimTranscript = '',
  onStartSpeakingSession,
  onStopVoice,
  onStopSpeaking,
  onSpeakText,
  messages = [],
  loading = false,
  onSendMessage,
  onConfirmPlan,
  onReviewPlan,
  onClearChat,
  servers = [],
  deployments = [],
  activeEnv = 'all',
  onSwitchToChat
}) {
  const bars = [8, 14, 22, 16, 28, 20, 32, 18, 26, 36, 24, 40, 28, 34, 22, 38, 20, 30, 16, 26, 12, 22, 14, 8];
  const [logIndex, setLogIndex] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const chatScrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);

  // Live streaming log ticker simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setLogIndex((prev) => (prev + 1) % SIMULATED_LOGS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Scroll detection for chat history
  const handleChatScroll = () => {
    if (!chatScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsScrolledUp(distanceFromBottom > 70);
  };

  // Auto-scroll on new messages unless user scrolled up
  useEffect(() => {
    if (!isScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleScrollToBottom = () => {
    setIsScrolledUp(false);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTextSubmit = (e) => {
    e?.preventDefault();
    const query = textInput.trim();
    if (!query || loading) return;
    setTextInput('');
    onSendMessage(query, false, 'text');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit(e);
    }
  };

  const isListening = voiceState === 'LISTENING';
  const isSpeaking = voiceState === 'SPEAKING';
  const isThinking = voiceState === 'THINKING';
  const isError = voiceState === 'ERROR';
  const isStopped = voiceState === 'STOPPED';
  const isReady = voiceState === 'READY';

  // Format environment label
  const envLabel =
    activeEnv === 'all'
      ? 'All Environments'
      : activeEnv.charAt(0).toUpperCase() + activeEnv.slice(1);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050813] select-none overflow-hidden">
      {/* ── 1. Top Header Status Strip (Pinned & Always Visible) ───────────────── */}
      <div className="flex-shrink-0 px-4 py-2.5 bg-[#070c18] border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-sm">
        {/* Left: DEVOPS SRE COMMAND CENTER ● LIVE | NOVA CORE Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></span>
            </span>
            <span className="font-extrabold uppercase tracking-wider text-cyan-300 text-[11px] sm:text-xs">
              DEVOPS SRE COMMAND CENTER
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px] uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              LIVE
            </span>
          </div>

          <span className="text-white/20 hidden sm:inline">|</span>

          {/* Nova Core Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">NOVA CORE:</span>
            <span
              className={`font-bold uppercase flex items-center gap-1 ${
                isListening
                  ? 'text-rose-400'
                  : isSpeaking
                  ? 'text-cyan-300'
                  : isThinking
                  ? 'text-violet-400'
                  : isError
                  ? 'text-rose-400'
                  : isStopped
                  ? 'text-slate-500'
                  : 'text-emerald-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isListening
                    ? 'bg-rose-400 animate-ping'
                    : isSpeaking
                    ? 'bg-cyan-400 animate-pulse'
                    : isThinking
                    ? 'bg-violet-400 animate-ping'
                    : isError
                    ? 'bg-rose-500'
                    : isStopped
                    ? 'bg-slate-600'
                    : 'bg-emerald-400'
                }`}
              ></span>
              {voiceState}
            </span>
          </div>
        </div>

        {/* Right: Managed Fleet Telemetry & Session Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400">
            <span>Managed Fleet: <strong className="text-slate-200">{servers.length || 5} nodes</strong></span>
            <span className="text-white/20">•</span>
            <span>Environment: <strong className="text-cyan-300">{envLabel}</strong></span>
          </div>

          {/* Session Control Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowClearConfirm(true)}
              title="Clear visible chat history"
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-slate-500 text-slate-400 hover:text-slate-200 text-[11px] transition flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>

            <button
              onClick={onStopVoice}
              title="Stop microphone, TTS audio, and reset voice session"
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-[11px] transition flex items-center gap-1 cursor-pointer"
            >
              <Square className="w-3 h-3" />
              <span className="hidden sm:inline">Stop Voice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clear Chat Confirmation Banner */}
      {showClearConfirm && (
        <div className="px-4 py-2.5 bg-[#0e1628] border-b border-amber-500/40 flex items-center justify-between gap-3 text-xs font-mono animate-fade-in">
          <div className="flex items-center gap-2 text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Clear visible chat history? (Infrastructure telemetry and audit logs remain intact)</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onClearChat?.();
                setShowClearConfirm(false);
              }}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition cursor-pointer"
            >
              Confirm Clear
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 font-semibold text-[11px] transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── 2. Master Two-Part Grid: Desktop Balanced 2-Col / Mobile Stacked ───── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-3 sm:p-4 overflow-y-auto lg:overflow-hidden min-h-0">
        {/* ========================================================================= */}
        {/* LEFT / MAIN PANEL: LIVE NOVA SRE COMMAND CENTER (Focal Panel)            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-3 lg:overflow-y-auto no-scrollbar">
          {/* Main Visual Core Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0b1226] to-[#070b16] border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.12)] relative overflow-hidden shrink-0">
            {/* Subtle Ambient Background Halo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col items-center justify-center relative z-10 space-y-3">
              {/* Central Futuristic Nova Core Orb Visual */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                {/* Outer Dashed Cyan Ring */}
                <div
                  className={`absolute inset-0 rounded-full border border-dashed border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all ${
                    isListening || isSpeaking || isThinking ? 'animate-spin-slow' : 'opacity-40'
                  }`}
                />

                {/* Inner Counter-Rotating Dashed Orange Ring */}
                <div
                  className={`absolute inset-2 rounded-full border border-dashed border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all ${
                    isListening || isSpeaking || isThinking ? 'animate-spin-reverse' : 'opacity-40'
                  }`}
                />

                {/* Central Core Orb */}
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-orange-500 via-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all duration-300 ${
                    isSpeaking
                      ? 'animate-neural-pulse scale-105 shadow-[0_0_30px_rgba(6,182,212,0.8)]'
                      : isListening
                      ? 'scale-100 ring-4 ring-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.6)]'
                      : isThinking
                      ? 'animate-pulse shadow-[0_0_25px_rgba(168,85,247,0.6)]'
                      : isStopped
                      ? 'opacity-40 grayscale'
                      : isError
                      ? 'ring-2 ring-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                      : 'opacity-90 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  }`}
                >
                  <Cpu className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>

              {/* Title & Status Titles */}
              <div className="text-center space-y-1">
                <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                  NOVA CORE
                </span>
                <div className="text-xs font-mono font-bold">
                  {isReady && (
                    <div className="space-y-0.5">
                      <div className="text-emerald-400 font-extrabold uppercase tracking-wide">READY</div>
                      <div className="text-slate-400 font-normal text-[11px]">
                        Press Speak to start hands-free voice
                      </div>
                    </div>
                  )}
                  {isListening && (
                    <div className="space-y-0.5">
                      <div className="text-rose-400 font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        LISTENING
                      </div>
                      <div className="text-rose-300 font-normal text-[11px]">
                        Listening...
                      </div>
                    </div>
                  )}
                  {isThinking && (
                    <div className="space-y-0.5">
                      <div className="text-violet-400 font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping"></span>
                        THINKING
                      </div>
                      <div className="text-violet-300 font-normal text-[11px]">
                        Analyzing request...
                      </div>
                    </div>
                  )}
                  {isSpeaking && (
                    <div className="space-y-0.5">
                      <div className="text-cyan-300 font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 animate-pulse">
                        <Volume2 className="w-3.5 h-3.5" />
                        SPEAKING
                      </div>
                      <div className="text-cyan-200 font-normal text-[11px]">
                        Nova is responding...
                      </div>
                    </div>
                  )}
                  {isStopped && (
                    <div className="space-y-0.5">
                      <div className="text-slate-500 font-extrabold uppercase tracking-wide">STOPPED</div>
                      <div className="text-slate-500 font-normal text-[11px]">
                        Voice session stopped
                      </div>
                    </div>
                  )}
                  {isError && (
                    <div className="space-y-0.5">
                      <div className="text-rose-400 font-extrabold uppercase tracking-wide flex items-center justify-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        ERROR
                      </div>
                      <div className="text-rose-300 font-normal text-[11px]">
                        {voiceError || 'Voice service unavailable'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Genuine Reactive Audio Waveform */}
              <div className="flex items-center justify-center gap-1 h-7 w-full max-w-xs px-2">
                {bars.map((height, i) => {
                  let computedHeight = 3;
                  if (isSpeaking) {
                    computedHeight = Math.max(4, Math.round(height * 1.05));
                  } else if (isListening) {
                    computedHeight = Math.max(4, Math.round(height * 0.8));
                  } else if (isThinking) {
                    computedHeight = i % 4 === 0 ? 12 : 4;
                  }

                  return (
                    <span
                      key={i}
                      style={{ height: `${computedHeight}px` }}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isSpeaking
                          ? i % 2 === 0
                            ? 'bg-orange-400 shadow-[0_0_6px_#f97316]'
                            : 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]'
                          : isListening
                          ? 'bg-rose-400 shadow-[0_0_6px_#f43f5e]'
                          : isThinking
                          ? 'bg-violet-400 shadow-[0_0_6px_#a855f7]'
                          : 'bg-slate-700/60'
                      } ${isSpeaking || isListening ? 'animate-pulse' : ''}`}
                    />
                  );
                })}
              </div>

              {/* Primary Voice Action Controls: Speak / Stop Listening / Stop Speaking */}
              <div className="flex items-center gap-2 pt-1 w-full max-w-xs justify-center">
                {isListening ? (
                  <button
                    onClick={onStopVoice}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold shadow-[0_0_20px_rgba(244,63,94,0.4)] transition cursor-pointer active:scale-95"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Listening</span>
                  </button>
                ) : isSpeaking ? (
                  <button
                    onClick={onStopSpeaking || onStopVoice}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold shadow-[0_0_20px_rgba(245,158,11,0.4)] transition cursor-pointer active:scale-95"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Speaking</span>
                  </button>
                ) : (
                  <button
                    onClick={onStartSpeakingSession}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-xs font-extrabold shadow-[0_0_20px_rgba(6,182,212,0.35)] transition cursor-pointer active:scale-95"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Speak</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── LIVE TRANSCRIPT Area (Section 5) ───────────────────────── */}
          <div
            className={`p-3.5 rounded-xl bg-[#070b16] border transition-all shadow-inner ${
              isListening
                ? 'border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
                : 'border-white/[0.08]'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <Radio className={`w-3.5 h-3.5 ${isListening ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="font-extrabold tracking-wider uppercase text-slate-300">
                  LIVE TRANSCRIPT
                </span>
              </div>
              {isListening && (
                <span className="text-[10px] text-cyan-300 font-bold flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  Streaming
                </span>
              )}
            </div>

            <div className="pt-2 text-xs font-mono min-h-[42px] flex items-center select-text">
              {interimTranscript ? (
                <span className="text-cyan-200 leading-relaxed font-semibold italic">
                  &quot;{interimTranscript}&quot;
                </span>
              ) : isListening ? (
                <span className="text-slate-400 italic">Listening... Speak your command</span>
              ) : (
                <span className="text-slate-500 italic">
                  &lt;say &quot;how to deploy nginx using chef&quot;&gt;
                </span>
              )}
            </div>
          </div>

          {/* 50/50 Chef vs SaltStack Real-time Telemetry Meters */}
          <LiveMetrics />

          {/* Live Streaming Terminal Log Ticker */}
          <div className="p-3 rounded-xl bg-[#03060d] border border-white/[0.08] font-mono text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-bold text-slate-300">Live Orchestration Stream</span>
              </div>
              <span className="text-[10px] text-emerald-400">Connected</span>
            </div>

            <div className="text-[11px] text-cyan-300 truncate">
              <span className="text-slate-500 mr-2">&gt;</span>
              {SIMULATED_LOGS[logIndex]}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT / BELOW PANEL: CHAT HISTORY (Persistent Conversation Record)        */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col h-[520px] lg:h-full min-h-[460px] bg-[#070b14] rounded-2xl border border-white/[0.08] shadow-card overflow-hidden relative">
          {/* Chat History Header Bar */}
          <div className="flex-shrink-0 px-4 py-2.5 bg-[#0a0f1d] border-b border-white/[0.08] flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-extrabold uppercase tracking-wider text-slate-200">
                CHAT HISTORY
              </span>
              <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 text-[10px] font-bold">
                {messages.length}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span className="text-cyan-300/80 hidden sm:inline">Verified SRE Telemetry</span>
            </div>
          </div>

          {/* Chat Messages Dedicated Scroll Container (Section 8) */}
          <div
            ref={chatScrollRef}
            onScroll={handleChatScroll}
            className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-4 font-sans select-text min-h-0"
          >
            {/* Empty State suggestions if conversation is empty or only 1 welcome message */}
            {messages.length <= 1 && (
              <div className="p-4 rounded-2xl bg-[#090e1c] border border-cyan-500/20 text-xs font-mono space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span>Nova is ready.</span>
                </div>
                <p className="text-slate-400 text-[11px] font-sans">
                  Execute hands-free voice operations above, or try clicking one of the common SRE actions:
                </p>
                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  {EMPTY_STATE_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(prompt, false, 'text')}
                      className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-left transition flex items-center justify-between cursor-pointer group text-[11px]"
                    >
                      <span className="truncate">&quot;{prompt}&quot;</span>
                      <Terminal className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rendered Messages */}
            {messages.map((msg) => (
              <AIMessage
                key={msg.id}
                message={msg}
                onSpeak={onSpeakText}
                isSpeaking={isSpeaking}
                onConfirmPlan={onConfirmPlan}
                onReviewPlan={onReviewPlan}
              />
            ))}

            {/* Nova Analyzing Request Loading State */}
            {loading && (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-[#0b101d] border border-cyan-500/30 w-fit text-xs text-cyan-300 font-mono shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-pulse">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span>Nova-Orchestrator is analyzing request via Gemini 3.8 Flash...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating "New messages ↓" Pill Button (Section 8) */}
          {isScrolledUp && (
            <button
              onClick={handleScrollToBottom}
              className="absolute bottom-24 right-5 z-20 px-3.5 py-1.5 rounded-full bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-300 text-xs font-mono font-bold shadow-[0_4px_20px_rgba(6,182,212,0.35)] flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            >
              <span>New messages</span>
              <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            </button>
          )}

          {/* ── 3. TEXT CHAT Alternative Input Container (Section 12) ───────── */}
          <div className="flex-shrink-0 bg-[#070b14] border-t border-white/[0.08] p-3 space-y-2.5">
            {/* Quick Prompts Strip */}
            <div className="overflow-x-auto whitespace-nowrap flex gap-1.5 pb-0.5 no-scrollbar">
              {QUICK_TEXT_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(prompt, false, 'text')}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-[#0b101d] hover:bg-[#12192c] border border-white/[0.08] hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition shrink-0 flex items-center gap-1 cursor-pointer font-sans"
                >
                  <Terminal className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>

            {/* Text Chat Input Form */}
            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={textInputRef}
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Nova about deployments, Chef, SaltStack, nodes..."
                  disabled={loading}
                  className="w-full bg-[#0b101d] border border-white/[0.1] focus:border-cyan-400/60 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition shadow-inner font-sans"
                />

                {/* Microphone Toggle Button */}
                <button
                  type="button"
                  onClick={isListening ? onStopVoice : onStartSpeakingSession}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition cursor-pointer ${
                    isListening
                      ? 'bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/40'
                      : 'text-slate-400 hover:text-cyan-300 hover:bg-white/[0.04]'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start hands-free voice'}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!textInput.trim() || loading}
                className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-40 disabled:pointer-events-none transition active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
