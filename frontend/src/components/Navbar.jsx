import React from 'react';
import { Bot, Menu, Plus } from 'lucide-react';

export function Navbar({
  activeEnv,
  setActiveEnv,
  onNewDeployment,
  onOpenAiAgent,
  onToggleMobileSidebar
}) {
  const envs = [
    { id: 'all', label: 'All Envs' },
    { id: 'production', label: 'Production' },
    { id: 'staging', label: 'Staging' },
    { id: 'development', label: 'Dev' },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/[0.08] bg-[#070b14]/90 backdrop-blur-xl px-3 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Hamburger & Brand or Desktop Env Filter */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:text-white transition cursor-pointer"
          aria-label="Toggle mobile navigation menu"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Title */}
        <div className="md:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-500 to-cyan-400 p-[1px] shadow-sm">
            <div className="w-full h-full bg-[#070b14] rounded-[7px] flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-tr from-orange-400 to-cyan-400 text-xs">
              DT
            </div>
          </div>
          <span className="text-xs font-bold text-white tracking-wide">
            Deployment Tools
          </span>
        </div>

        {/* Desktop Environment Filter Pills */}
        <div className="hidden md:flex items-center bg-[#0b101d] border border-white/[0.08] rounded-xl p-1 shadow-inner">
          {envs.map((env) => {
            const isActive = activeEnv === env.id;
            return (
              <button
                key={env.id}
                onClick={() => setActiveEnv(env.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wide transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {env.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Engine Telemetry Status Badges (Large screens) */}
        <div className="hidden lg:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-[#0b101d] border border-white/[0.08] text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316] animate-pulse"></span>
            <span>Chef: <strong className="text-orange-400 font-semibold">Active</strong></span>
          </div>
          <span className="text-white/20">|</span>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse"></span>
            <span>SaltStack: <strong className="text-cyan-400 font-semibold">Active</strong></span>
          </div>
        </div>

        {/* AI DevOps Agent Trigger */}
        <button
          onClick={onOpenAiAgent}
          className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold px-3 sm:px-3.5 py-2 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.3)] active:scale-95 transition-all border border-violet-400/30 cursor-pointer"
          title="Open Gemini 3.8 Flash Autonomous DevOps Agent"
        >
          <Bot className="w-3.5 h-3.5 text-violet-200" />
          <span className="hidden sm:inline">Ask AI Agent</span>
          <span className="sm:hidden text-xs">AI</span>
          <span className="hidden sm:inline text-[10px] px-1.5 py-0.2 rounded bg-white/20 font-mono font-bold">3.8</span>
        </button>

        {/* Action Trigger: New Deployment */}
        <button
          onClick={onNewDeployment}
          className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-cyan-500 hover:opacity-95 text-white text-xs font-extrabold px-3 sm:px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Deployment</span>
          <span className="sm:hidden">Deploy</span>
        </button>
      </div>
    </header>
  );
}
