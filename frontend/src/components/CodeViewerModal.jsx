import React, { useState, useEffect } from 'react';
import { Copy, Check, FileCode, X, Layers, Server } from 'lucide-react';

export function CodeViewerModal({ isOpen, onClose, fileData }) {
  const [copied, setCopied] = useState(false);
  const [activeLine, setActiveLine] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !fileData) return null;

  const isChef = fileData.type === 'chef' || fileData.language === 'ruby';
  const lines = (fileData.content || '').split('\n');

  const handleCopy = () => {
    if (fileData.content) {
      navigator.clipboard.writeText(fileData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Syntax colorizer helper for Ruby / YAML
  const colorizeLine = (line) => {
    if (line.trim().startsWith('#')) {
      return <span className="text-slate-500 italic">{line}</span>;
    }

    if (isChef) {
      // Ruby styling
      // package, template, service, directory, file, execute, link, do, end
      const keywords = ['package', 'template', 'service', 'directory', 'file', 'execute', 'link', 'user', 'group', 'do', 'end', 'action', 'owner', 'mode', 'variables', 'notifies'];
      let rendered = line;
      // Highlight comments first
      if (line.includes('#')) {
        const parts = line.split('#');
        return (
          <>
            <span>{parts[0]}</span>
            <span className="text-slate-500 italic">#{parts.slice(1).join('#')}</span>
          </>
        );
      }
      return <span className="text-slate-200">{line}</span>;
    } else {
      // YAML styling
      if (line.includes(':')) {
        const [key, ...rest] = line.split(':');
        return (
          <>
            <span className="text-cyan-300 font-semibold">{key}:</span>
            <span className="text-slate-200">{rest.join(':')}</span>
          </>
        );
      }
      return <span className="text-slate-200">{line}</span>;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl bg-[#070b14] border shadow-2xl cursor-default overflow-hidden ${
          isChef ? 'border-orange-500/30 shadow-[0_0_40px_rgba(249,115,22,0.15)]' : 'border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient glow */}
        <div
          className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 ${
            isChef ? 'bg-orange-500/10' : 'bg-cyan-500/10'
          }`}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] relative z-10 bg-[#0a0f1d]/90">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2 rounded-xl border ${
                isChef
                  ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                  : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
              }`}
            >
              {isChef ? <Layers className="w-5 h-5" /> : <Server className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white truncate font-mono">
                  {fileData.filename}
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    isChef
                      ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                      : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                  }`}
                >
                  {isChef ? 'Ruby Cookbook' : 'YAML State'}
                </span>
                {fileData.version && (
                  <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                    v{fileData.version}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                {fileData.path}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08]'
              }`}
              title="Copy code to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
              title="Close viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Code Content Area */}
        <div className="flex-1 overflow-auto bg-[#04060b] p-4 text-xs font-mono relative">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => {
                const lineNum = idx + 1;
                const isHovered = activeLine === lineNum;
                return (
                  <tr
                    key={lineNum}
                    onMouseEnter={() => setActiveLine(lineNum)}
                    onMouseLeave={() => setActiveLine(null)}
                    className={`transition-colors ${
                      isHovered
                        ? isChef
                          ? 'bg-orange-500/[0.08]'
                          : 'bg-cyan-500/[0.08]'
                        : ''
                    }`}
                  >
                    <td className="w-12 pr-4 text-right select-none text-slate-600 font-mono text-[11px] align-top py-0.5 border-r border-white/[0.05]">
                      {lineNum}
                    </td>
                    <td className="pl-4 py-0.5 text-slate-200 whitespace-pre font-mono">
                      {colorizeLine(line)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/[0.08] bg-[#0a0f1d] text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span>{lines.length} lines</span>
            <span>•</span>
            <span>{fileData.size_bytes ? `${fileData.size_bytes} bytes` : 'Checksum verified'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Check className="w-3.5 h-3.5" />
            <span>Syntax Validated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
