import React from 'react';
import { User, Bot, Volume2, ShieldCheck, Play, Eye, AlertTriangle, Mic, Terminal } from 'lucide-react';
import { FormattedAiMessage } from '../FormattedAiMessage';

export function AIMessage({ message, onSpeak, isSpeaking, onConfirmPlan, onReviewPlan }) {
  const isUser = message.sender === 'user';

  if (isUser) {
    return (
      <div className="flex flex-col items-end animate-fade-in w-full">
        <div className="max-w-[85%] p-3.5 rounded-2xl rounded-tr-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_4px_20px_rgba(139,92,246,0.25)] border border-violet-400/30">
          <div className="flex items-center justify-between gap-3 mb-1 pb-1 border-b border-white/10 text-[10px] font-mono text-violet-200">
            <span className="font-bold flex items-center gap-1.5">
              <User className="w-3 h-3 text-violet-200" />
              <span>Operator</span>
              {message.origin === 'voice' && (
                <span className="px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-200 border border-rose-400/40 text-[9px] flex items-center gap-1 font-sans font-semibold">
                  <Mic className="w-2.5 h-2.5" />
                  <span>Voice</span>
                </span>
              )}
              {message.origin === 'text' && (
                <span className="px-1.5 py-0.5 rounded bg-white/15 text-slate-200 border border-white/20 text-[9px] flex items-center gap-1 font-sans font-semibold">
                  <Terminal className="w-2.5 h-2.5" />
                  <span>Text</span>
                </span>
              )}
            </span>
            <span>{message.timestamp}</span>
          </div>
          <div className="text-xs leading-relaxed font-normal whitespace-pre-wrap select-text">
            {message.text}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start w-full animate-fade-in">
      <div className="w-full max-w-[96%] p-4 rounded-2xl rounded-tl-sm bg-[#0a0f1d] border border-cyan-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.06)] relative overflow-hidden group">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/[0.03] rounded-full blur-2xl pointer-events-none" />

        {/* Nova Message Header */}
        <div className="flex items-center justify-between gap-3 mb-2.5 pb-2 border-b border-white/[0.08] text-[11px] font-mono">
          <div className="flex items-center gap-2 text-cyan-300 font-extrabold tracking-wide">
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-sm">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Nova-Orchestrator — SRE Copilot</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-[10px]">
            <span>{message.timestamp}</span>
          </div>
        </div>

        {/* Message Content Rendered with FormattedAiMessage */}
        <FormattedAiMessage
          text={message.text}
          isSpeaking={isSpeaking}
          onSpeak={() => onSpeak(message.text)}
        />

        {/* ── Actionable SRE Deployment Plan Confirmation Card ────── */}
        {message.plan && (
          <div className="mt-3.5 p-3.5 rounded-xl bg-[#060b17] border border-cyan-500/30 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>Proposed Deployment Plan</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Confirmation Required</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.06]">
              <div>
                <span className="text-slate-500">Plan:</span>{' '}
                <span className="text-white font-bold">{message.plan.name}</span>
              </div>
              <div>
                <span className="text-slate-500">Environment:</span>{' '}
                <span className="text-emerald-400 font-bold capitalize">{message.plan.environment}</span>
              </div>
              <div>
                <span className="text-slate-500">Engine:</span>{' '}
                <span className="text-orange-400 font-bold uppercase">{message.plan.tool}</span>
              </div>
              <div>
                <span className="text-slate-500">Targets:</span>{' '}
                <span className="text-cyan-400 font-bold">{message.plan.target_hosts}</span>
              </div>
            </div>

            {message.plan.chef_runlist && (
              <div className="text-[11px] font-mono text-slate-300 bg-orange-950/20 border border-orange-500/30 p-2 rounded-lg">
                <strong className="text-orange-400">Chef Runlist: </strong>
                <span>{message.plan.chef_runlist}</span>
              </div>
            )}

            {message.plan.salt_states && (
              <div className="text-[11px] font-mono text-slate-300 bg-cyan-950/20 border border-cyan-500/30 p-2 rounded-lg">
                <strong className="text-cyan-400">Salt States: </strong>
                <span>{message.plan.salt_states}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {onConfirmPlan && (
                <button
                  onClick={() => onConfirmPlan(message.plan)}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-cyan-500 hover:opacity-95 text-white font-mono text-xs font-extrabold shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Confirm & Deploy</span>
                </button>
              )}

              {onReviewPlan && (
                <button
                  onClick={() => onReviewPlan(message.plan)}
                  className="py-2 px-3 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white font-mono text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Card Bottom Meta & Actions */}
        <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-white/[0.06] text-[10px] text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60"></span>
            <span>{message.timestamp}</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400/80 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              <span>Verified SRE Telemetry</span>
            </span>
          </div>

          <button
            onClick={() => onSpeak(message.text)}
            title="Read message aloud"
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-cyan-500/20 border border-white/[0.06] hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 transition text-[11px] cursor-pointer"
          >
            <Volume2 className="w-3 h-3" />
            <span>Narrate</span>
          </button>
        </div>
      </div>
    </div>
  );
}
