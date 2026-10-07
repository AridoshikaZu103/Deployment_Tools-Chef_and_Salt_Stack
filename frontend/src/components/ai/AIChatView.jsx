import React, { useRef, useEffect } from 'react';
import { Bot, Volume2, Square, Server, Radio, ShieldCheck } from 'lucide-react';
import { AIMessage } from './AIMessage';
import { AIInput } from './AIInput';

export function AIChatView({
  messages,
  loading,
  inputPrompt,
  setInputPrompt,
  onSendMessage,
  isSpeaking,
  onStopSpeaking,
  onSpeakText,
  isListening,
  onStartListening,
  onStopListening,
  onConfirmPlan,
  onReviewPlan,
  aiBadgeStatus = 'Live: Gemini 3.8 Flash',
  serversCount = 6
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const isLive = aiBadgeStatus.startsWith('Live');

  return (
    <div className="flex-1 flex flex-col h-full bg-[#05070d] overflow-hidden select-none">
      {/* Fleet Telemetry Status Strip */}
      <div className="px-4 py-2 bg-[#090d19] border-b border-cyan-500/15 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>
          <span className="text-emerald-300 font-bold">{serversCount}/{serversCount} Nodes Active</span>
          <span className="text-slate-600">|</span>
          <span>Chef & SaltStack Synchronized</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
              isLive
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{aiBadgeStatus}</span>
          </span>
          <span className="text-cyan-400/90 hidden sm:flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>Real-time</span>
          </span>
        </div>
      </div>

      {/* Speaking Soundwave Indicator */}
      {isSpeaking && (
        <div className="px-4 py-2 bg-gradient-to-r from-cyan-950/40 via-blue-950/40 to-transparent border-b border-cyan-500/30 flex items-center justify-between text-xs text-cyan-300 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 h-4">
              <span className="w-1 bg-cyan-400 rounded-full animate-soundwave-1"></span>
              <span className="w-1 bg-cyan-400 rounded-full animate-soundwave-2"></span>
              <span className="w-1 bg-cyan-400 rounded-full animate-soundwave-3"></span>
              <span className="w-1 bg-cyan-400 rounded-full animate-soundwave-1"></span>
              <span className="w-1 bg-cyan-400 rounded-full animate-soundwave-2"></span>
            </div>
            <span className="font-mono text-[11px] font-bold tracking-wide text-cyan-200">
              Nova-Orchestrator is narrating response...
            </span>
          </div>
          <button
            onClick={onStopSpeaking}
            className="text-[10px] px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Square className="w-2.5 h-2.5" />
            <span>Stop Audio</span>
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans select-text">
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

        {loading && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0b101d] border border-cyan-500/30 w-fit text-xs text-cyan-300 font-mono shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-pulse">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span>Nova-Orchestrator is analyzing cluster state via Gemini 3.8 Flash...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <AIInput
        inputPrompt={inputPrompt}
        setInputPrompt={setInputPrompt}
        onSendMessage={onSendMessage}
        loading={loading}
        isListening={isListening}
        onStartListening={onStartListening}
        onStopListening={onStopListening}
      />
    </div>
  );
}
