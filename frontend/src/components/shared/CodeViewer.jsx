import React, { useState } from 'react';
import { Copy, Check, Code as CodeIcon, Terminal } from 'lucide-react';

export function CodeViewer({
  code = '',
  language = 'ruby',
  tool = 'chef', // 'chef' | 'salt' | 'shell'
  highlightLines = [],
  title = ''
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isChef = tool === 'chef';
  const isSalt = tool === 'salt';

  const accentBorder = isChef
    ? 'border-orange-500/30 hover:border-orange-500/50'
    : isSalt
    ? 'border-cyan-500/30 hover:border-cyan-500/50'
    : 'border-white/[0.12]';

  const badgeStyle = isChef
    ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
    : isSalt
    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
    : 'bg-slate-800 text-slate-300 border-white/10';

  const lines = code.split('\n');

  return (
    <div className={`rounded-xl border bg-[#05070d] overflow-hidden shadow-2xl transition-all ${accentBorder}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#090d18] border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>

          <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ml-1 ${badgeStyle}`}>
            {isChef ? 'Chef Ruby' : isSalt ? 'Salt YAML' : language.toUpperCase()}
          </span>

          {title && (
            <span className="text-[11px] font-mono text-slate-400 font-medium hidden sm:inline">
              {title}
            </span>
          )}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-[11px] font-mono text-slate-300 hover:text-white transition active:scale-95"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area with Line Numbers */}
      <div className="p-3 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed select-text">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isHighlighted = highlightLines.includes(lineNum);
              return (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    isHighlighted ? 'line-highlight bg-white/[0.03]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <td className="w-8 pr-3 text-right text-slate-600 select-none text-[11px] font-mono align-top py-0.5">
                    {lineNum}
                  </td>
                  <td className="pl-2 font-mono whitespace-pre py-0.5 text-slate-200">
                    {/* Basic syntax coloring */}
                    {formatSyntax(line, tool)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Lightweight syntax highlight helper for Chef Ruby and Salt YAML
function formatSyntax(line, tool) {
  if (line.trim().startsWith('#')) {
    return <span className="text-slate-500 italic">{line}</span>;
  }

  if (tool === 'chef') {
    // Ruby Chef highlights
    if (line.includes('do') || line.includes('end') || line.includes('def ')) {
      return (
        <span>
          {line.split(/\b(do|end|action|supports|include_recipe)\b/g).map((part, i) =>
            ['do', 'end', 'action', 'supports', 'include_recipe'].includes(part) ? (
              <span key={i} className="text-orange-400 font-semibold">{part}</span>
            ) : (
              part
            )
          )}
        </span>
      );
    }
  }

  if (tool === 'salt') {
    // YAML Salt highlights
    if (line.includes(':')) {
      const colonIdx = line.indexOf(':');
      const key = line.slice(0, colonIdx);
      const rest = line.slice(colonIdx);
      return (
        <span>
          <span className="text-cyan-400 font-semibold">{key}</span>
          <span className="text-slate-300">{rest}</span>
        </span>
      );
    }
  }

  return <span>{line}</span>;
}
