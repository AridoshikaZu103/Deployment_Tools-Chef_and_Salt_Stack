import React, { useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Sparkles, Terminal } from 'lucide-react';

const QUICK_PROMPTS = [
  'Write an Nginx reload recipe in Chef with zero downtime',
  'What is the difference between Salt grains and pillar?',
  'How should I target web proxy minions vs app server nodes?',
  'Diagnose degraded socket ports on cluster servers'
];

export function AIInput({
  inputPrompt,
  setInputPrompt,
  onSendMessage,
  loading,
  isListening,
  onStartListening,
  onStopListening
}) {
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputPrompt.trim() || loading) return;
    onSendMessage(inputPrompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-shrink-0 bg-[#070b14] border-t border-white/[0.08] p-3 sm:p-4 space-y-3">
      {/* Quick DevOps Prompt Suggestions */}
      <div className="overflow-x-auto whitespace-nowrap flex gap-2 pb-1 no-scrollbar">
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(prompt)}
            className="text-[11px] px-3 py-1.5 rounded-lg bg-[#0b101d] hover:bg-[#12192c] border border-white/[0.08] hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition shrink-0 flex items-center gap-1.5 cursor-pointer font-sans"
          >
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Input Field with Mic & Send */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Nova about Chef cookbooks, Salt states, or cluster diagnostics..."
            disabled={loading}
            className="w-full bg-[#0b101d] border border-white/[0.1] focus:border-cyan-400/60 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition shadow-inner"
          />

          {/* Speech-to-Text Microphone Button */}
          <button
            type="button"
            onClick={isListening ? onStopListening : onStartListening}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition cursor-pointer ${
              isListening
                ? 'bg-rose-500/20 text-rose-400 animate-pulse border border-rose-500/40'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-white/[0.04]'
            }`}
            title={isListening ? 'Stop listening' : 'Dictate with Microphone'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputPrompt.trim() || loading}
          className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-40 disabled:pointer-events-none transition active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
