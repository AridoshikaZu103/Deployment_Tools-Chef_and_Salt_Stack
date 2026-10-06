import React from 'react';
import { HelpCircle, Layers, Server, ArrowRight, ShieldCheck, CheckCircle2, Cpu } from 'lucide-react';
import { CodeViewer } from '../shared/CodeViewer';

export function TutorialStep({ step }) {
  if (!step) return null;

  const isChef = step.tool === 'chef';
  const isSalt = step.tool === 'salt';
  const isBoth = step.tool === 'both';

  const badgeTheme = isChef
    ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
    : isSalt
    ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
    : 'border-violet-500/40 bg-gradient-to-r from-orange-500/15 to-cyan-500/15 text-white';

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 animate-fade-in">
      {/* Step Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full border ${badgeTheme}`}>
            {step.badge}
          </span>
          <span className="text-xs font-mono text-slate-400">Step 0{step.step}</span>
        </div>

        <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-wide">
          {step.title}
        </h2>

        <p className="text-xs sm:text-sm font-semibold text-slate-300 leading-relaxed">
          {step.summary}
        </p>

        <p className="text-xs text-slate-400 leading-relaxed">
          {step.description}
        </p>
      </div>

      {/* Visual Content: Architecture Diagrams & Interactive Previews */}
      {step.step === 1 && (
        <div className="p-3.5 rounded-xl bg-[#070b18] border border-orange-500/20 space-y-3">
          <span className="text-[10px] font-mono text-orange-400 uppercase tracking-wider font-bold">
            Pull-Based Convergence Flow
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-[#0d1424] border border-orange-500/30 flex flex-col items-center justify-center">
              <Server className="w-4 h-4 text-orange-400 mb-1" />
              <span className="text-white font-bold">Chef Infra Server</span>
              <span className="text-[10px] text-slate-400">Cookbook Repository</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0d1424] border border-orange-500/30 flex flex-col items-center justify-center">
              <Layers className="w-4 h-4 text-amber-400 mb-1" />
              <span className="text-white font-bold">Node Run-List</span>
              <span className="text-[10px] text-slate-400">nginx::default</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0d1424] border border-orange-500/30 flex flex-col items-center justify-center">
              <Cpu className="w-4 h-4 text-orange-400 mb-1" />
              <span className="text-white font-bold">chef-client Daemon</span>
              <span className="text-[10px] text-slate-400">Local State Idempotency</span>
            </div>
          </div>
        </div>
      )}

      {step.step === 2 && (
        <div className="p-3.5 rounded-xl bg-[#070b18] border border-cyan-500/20 space-y-3">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
            ZeroMQ Event-Driven Push Bus
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-[#0d1424] border border-cyan-500/30 flex flex-col items-center justify-center">
              <Server className="w-4 h-4 text-cyan-400 mb-1" />
              <span className="text-white font-bold">Salt Master</span>
              <span className="text-[10px] text-slate-400">Port 4505 Publisher</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0d1424] border border-cyan-500/30 flex flex-col items-center justify-center">
              <ArrowRight className="w-4 h-4 text-cyan-300 mb-1" />
              <span className="text-white font-bold">ZeroMQ Bus</span>
              <span className="text-[10px] text-slate-400">Encrypted AES Payloads</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0d1424] border border-cyan-500/30 flex flex-col items-center justify-center">
              <Cpu className="w-4 h-4 text-cyan-400 mb-1" />
              <span className="text-white font-bold">Salt Minions (*)</span>
              <span className="text-[10px] text-slate-400">Parallel Execution</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: 50/50 Side-by-Side Comparison Grid */}
      {step.step === 3 && step.comparisonGrid && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold">
            <div className="p-2.5 rounded-xl bg-orange-950/20 border border-orange-500/40 text-orange-300 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>Chef (Pull / Ruby)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>SaltStack (Push / YAML)</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#070b14] overflow-hidden text-xs">
            {step.comparisonGrid.map((row, idx) => (
              <div
                key={idx}
                className={`p-3 border-b border-white/[0.06] last:border-0 ${
                  idx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-[#0a0f1d]'
                }`}
              >
                <div className="text-[10px] font-mono uppercase font-bold text-slate-400 mb-1.5">
                  {row.attribute}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans">
                  <div className="p-2 rounded-lg bg-orange-500/[0.06] border border-orange-500/20 text-orange-200 text-xs">
                    {row.chef}
                  </div>
                  <div className="p-2 rounded-lg bg-cyan-500/[0.06] border border-cyan-500/20 text-cyan-200 text-xs">
                    {row.salt}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code Snippet Viewer */}
      {step.codeSnippet && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Example Code Implementation</span>
            <span className="text-[11px] text-slate-500">Click Copy to test locally</span>
          </div>
          <CodeViewer
            code={step.codeSnippet}
            language={step.codeLanguage}
            tool={step.codeTool}
            highlightLines={step.highlightLines}
            title={step.codeTitle}
          />
        </div>
      )}

      {/* Step 5: Socket Diagnostics Grid */}
      {step.step === 5 && step.diagram?.metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {step.diagram.metrics.map((m, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-[#090e1b] border border-emerald-500/30 flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] font-mono text-slate-400">Port {m.port}</span>
                <div className="text-white font-bold">{m.name}</div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{m.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tip Callout */}
      {step.actionTip && (
        <div className="p-3 rounded-xl bg-[#0a101f] border border-white/[0.08] flex items-start gap-2.5 text-xs">
          <HelpCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-slate-300 leading-relaxed">
            <strong className="text-white">Pro Tip: </strong>
            {step.actionTip}
          </div>
        </div>
      )}
    </div>
  );
}
