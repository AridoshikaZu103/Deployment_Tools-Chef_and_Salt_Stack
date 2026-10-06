import React, { useEffect } from 'react';
import {
  LayoutDashboard,
  Rocket,
  Server,
  BookOpen,
  History,
  Bot,
  X
} from 'lucide-react';

export function Sidebar({
  currentTab,
  setCurrentTab,
  isMobileOpen = false,
  onCloseMobile,
  onOpenAiAgent
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      id: 'deployments',
      label: 'Deployments',
      icon: <Rocket className="w-4 h-4" />
    },
    {
      id: 'servers',
      label: 'Servers & Health',
      icon: <Server className="w-4 h-4" />
    },
    {
      id: 'configs',
      label: 'Cookbooks & States',
      icon: <BookOpen className="w-4 h-4" />
    },
    {
      id: 'history',
      label: 'Audit History',
      icon: <History className="w-4 h-4" />
    }
  ];

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  const handleNavClick = (tabId) => {
    setCurrentTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 via-amber-500 to-cyan-400 p-[1.5px] shadow-[0_0_20px_rgba(249,115,22,0.3)]">
              <div className="w-full h-full bg-[#070b14] rounded-[10px] flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-tr from-orange-400 to-cyan-400 text-sm">
                DT
              </div>
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-wide leading-tight">
                Deployment Tools
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono text-orange-400 font-semibold">Chef</span>
                <span className="text-[10px] text-slate-600 font-bold">•</span>
                <span className="text-[10px] font-mono text-cyan-400 font-semibold">SaltStack</span>
              </div>
            </div>
          </div>

          {/* Mobile Close Button */}
          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/5 text-cyan-300 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <span className={isActive ? 'text-cyan-400' : 'text-slate-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* AI Copilot Quick Navigation */}
          {onOpenAiAgent && (
            <button
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
                onOpenAiAgent();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-violet-300 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 transition-all cursor-pointer mt-3"
            >
              <Bot className="w-4 h-4 text-violet-400" />
              <span>Nova AI Copilot</span>
            </button>
          )}
        </nav>
      </div>

      {/* Target Infrastructure Stack Pod */}
      <div className="p-4 m-3 rounded-2xl bg-[#0b101d] border border-white/[0.07] text-xs shadow-card">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            Target Stack
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse"></span>
        </div>
        <div className="space-y-2 text-slate-300">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_5px_#f97316]"></span>
              Nginx Proxy
            </span>
            <span className="text-[10px] font-mono text-slate-500">Port 80</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_5px_#f97316]"></span>
              FastAPI Server
            </span>
            <span className="text-[10px] font-mono text-slate-500">Port 8000</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#06b6d4]"></span>
              PostgreSQL DB
            </span>
            <span className="text-[10px] font-mono text-slate-500">Port 5432</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#06b6d4]"></span>
              Prometheus Mon
            </span>
            <span className="text-[10px] font-mono text-slate-500">Port 9090</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-white/[0.08] bg-[#070b14] flex-col justify-between shrink-0 select-none">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Surface */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#070b14] border-r border-cyan-500/30 shadow-2xl flex flex-col z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
