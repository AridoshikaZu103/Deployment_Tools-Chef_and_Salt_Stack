import React, { useState } from 'react';
import { Copy, Check, HelpCircle, AlertTriangle } from 'lucide-react';

export function FormattedAiMessage({ text, onSpeak, isSpeaking }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to parse and render formatted markdown elements
  const renderFormattedContent = () => {
    if (!text) return null;

    // Split content by code blocks: ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let blockCount = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Content before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
          key: `text-${lastIndex}`
        });
      }

      // The code block itself
      parts.push({
        type: 'code',
        language: match[1] || 'bash',
        code: match[2].trim(),
        key: `code-${blockCount++}`
      });

      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last code block
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
        key: `text-${lastIndex}`
      });
    }

    return parts.map((part, pIdx) => {
      if (part.type === 'code') {
        const isChef = part.language.toLowerCase().includes('ruby') || part.code.includes('recipe[') || part.code.includes('service ');
        const isSalt = part.language.toLowerCase().includes('yaml') || part.language.toLowerCase().includes('sls') || part.code.includes('service.running');
        
        const badgeColor = isChef 
          ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' 
          : isSalt 
            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

        const borderGlow = isChef
          ? 'hover:border-orange-500/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]'
          : isSalt
            ? 'hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]'
            : 'hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]';

        return (
          <div key={part.key} className={`my-3.5 rounded-xl border border-white/[0.12] bg-[#05070d] overflow-hidden shadow-2xl transition-all ${borderGlow}`}>
            {/* Terminal Window Header */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#090d18] border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
                </div>
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ml-1 ${badgeColor}`}>
                  {part.language || (isChef ? 'CHEF RUBY' : isSalt ? 'SALT YAML' : 'SHELL')}
                </span>
              </div>

              <button
                onClick={() => handleCopyCode(part.code, pIdx)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-[11px] font-mono text-slate-300 hover:text-white transition active:scale-95"
              >
                {copiedIndex === pIdx ? (
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

            {/* Code Content */}
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed select-text">
              <code>{part.code}</code>
            </pre>
          </div>
        );
      }

      // Regular text parsing (headers, lists, bold, inline code, tips)
      return (
        <div key={part.key} className="space-y-2">
          {renderTextLines(part.content)}
        </div>
      );
    });
  };

  // Parses lines of text, identifying agent headers, lists, and inline formatting
  const renderTextLines = (rawText) => {
    const lines = rawText.split('\n');

    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-1.5" />;

      // 1. Agent Title Header (e.g., **[Nova-Orchestrator - SRE Copilot]**)
      if (trimmed.startsWith('**[') && trimmed.includes('Copilot]**')) {
        const titleMatch = trimmed.match(/\*\*\[(.*?)\]\*\*/);
        const titleText = titleMatch ? titleMatch[1] : trimmed.replace(/[*[\]]/g, '');
        return (
          <div key={idx} className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-cyan-500/20">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="font-extrabold text-xs tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 font-mono">
                {titleText}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono">
              Live Fleet Copilot
            </span>
          </div>
        );
      }

      // 2. Callout / Tip Banner (e.g., Tip: ... or Warning: ...)
      if (trimmed.startsWith('💡') || trimmed.startsWith('⚠️') || trimmed.toLowerCase().startsWith('tip:') || trimmed.toLowerCase().startsWith('notice:')) {
        const isWarn = trimmed.startsWith('⚠️') || trimmed.toLowerCase().startsWith('notice:');
        const cleanContent = trimmed.replace(/^[💡⚠️]\s*/, '').replace(/^(tip|notice):\s*/i, '');
        return (
          <div
            key={idx}
            className={`p-3 my-2 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
              isWarn
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                : 'bg-violet-950/25 border-violet-500/30 text-violet-200 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
            }`}
          >
            {isWarn ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <HelpCircle className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              {renderInlineSpans(cleanContent)}
            </div>
          </div>
        );
      }

      // 3. Bullet points (• or - or *)
      if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const cleanBullet = trimmed.replace(/^[•\-*]\s*/, '');
        return (
          <div key={idx} className="flex items-start gap-2.5 py-1 px-1 rounded-lg hover:bg-white/[0.02] transition">
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 mt-1.5 flex-shrink-0 shadow-[0_0_6px_#06b6d4]"></span>
            <div className="flex-1 text-xs text-slate-200 leading-relaxed font-normal">
              {renderInlineSpans(cleanBullet)}
            </div>
          </div>
        );
      }

      // 4. Section headings (### or ##)
      if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
        const headingText = trimmed.replace(/^#+\s*/, '');
        return (
          <h4 key={idx} className="text-xs font-bold text-cyan-300 pt-2 pb-0.5 tracking-wide flex items-center gap-1.5 font-mono uppercase">
            <span className="text-cyan-500">#</span>
            {renderInlineSpans(headingText)}
          </h4>
        );
      }

      // 5. Standard paragraph
      return (
        <p key={idx} className="text-xs text-slate-200 leading-relaxed font-normal">
          {renderInlineSpans(trimmed)}
        </p>
      );
    });
  };

  // Helper to parse inline `code`, **bold**, *italic*
  const renderInlineSpans = (text) => {
    // Regex for inline code `...` and bold **...**
    const parts = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Check for inline code `...`
      const codeMatch = remaining.match(/`([^`]+)`/);
      // Check for bold **...**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

      let earliestMatch = null;
      let matchType = null;

      if (codeMatch && (!boldMatch || codeMatch.index < boldMatch.index)) {
        earliestMatch = codeMatch;
        matchType = 'code';
      } else if (boldMatch) {
        earliestMatch = boldMatch;
        matchType = 'bold';
      }

      if (!earliestMatch) {
        parts.push(<span key={keyIdx++}>{remaining}</span>);
        break;
      }

      // Preceding text
      if (earliestMatch.index > 0) {
        parts.push(
          <span key={keyIdx++}>
            {remaining.slice(0, earliestMatch.index)}
          </span>
        );
      }

      // Formatted match
      if (matchType === 'code') {
        parts.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-semibold shadow-[0_0_8px_rgba(6,182,212,0.15)] inline-block select-all"
          >
            {earliestMatch[1]}
          </code>
        );
      } else if (matchType === 'bold') {
        const boldVal = earliestMatch[1];
        // Special highlighting for key labels like Grains, Pillar, Targeting
        const isKeyLabel = ['Grains', 'Pillar', 'Targeting', 'Chef Recipes', 'Salt Minions', 'Managed Fleet'].some(k => boldVal.includes(k));

        parts.push(
          <strong
            key={keyIdx++}
            className={
              isKeyLabel
                ? 'font-bold text-white bg-white/[0.08] px-1 py-0.5 rounded border border-white/[0.1] text-[11px] font-mono mr-1'
                : 'font-bold text-white tracking-tight'
            }
          >
            {boldVal}
          </strong>
        );
      }

      remaining = remaining.slice(earliestMatch.index + earliestMatch[0].length);
    }

    return parts;
  };

  return (
    <div className="formatted-ai-response space-y-1">
      {renderFormattedContent()}
    </div>
  );
}
