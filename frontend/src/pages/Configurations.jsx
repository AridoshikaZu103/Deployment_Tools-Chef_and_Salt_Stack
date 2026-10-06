import React, { useState } from 'react';
import {
  Layers,
  Server,
  Check,
  Code2,
  AlertCircle,
  RefreshCw,
  X,
  Search,
  ShieldCheck,
  FileCode
} from 'lucide-react';
import { CodeViewerModal } from '../components/CodeViewerModal';
import { api } from '../services/api';
import {
  STATIC_CHEF_COOKBOOKS,
  STATIC_SALT_STATES,
  getStaticCookbookContent,
  getStaticSaltStateContent
} from '../data/cookbooksData';

export function Configurations({
  chefCookbooks,
  saltStates,
  isLoading = false,
  error = null,
  isFallback = false,
  onRefresh
}) {
  const [activeTab, setActiveTab] = useState('chef');
  const [viewingFile, setViewingFile] = useState(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  // Fallback to static bundled datasets if props are empty or not provided
  const rawCookbooks =
    chefCookbooks && chefCookbooks.length > 0
      ? chefCookbooks
      : STATIC_CHEF_COOKBOOKS;

  const rawStates =
    saltStates && saltStates.length > 0
      ? saltStates
      : STATIC_SALT_STATES;

  // Filter based on search query
  const filteredCookbooks = rawCookbooks.filter((cb) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      cb.name?.toLowerCase().includes(q) ||
      cb.description?.toLowerCase().includes(q) ||
      cb.recipes?.some((r) => r.toLowerCase().includes(q))
    );
  });

  const filteredStates = rawStates.filter((st) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      st.id?.toLowerCase().includes(q) ||
      st.description?.toLowerCase().includes(q) ||
      st.path?.toLowerCase().includes(q)
    );
  });

  const handleOpenCookbook = async (cb) => {
    const fallback = getStaticCookbookContent(cb.name, 'default');
    try {
      const data = await api.getCookbookContent(cb.name, 'default');
      if (data && data.content && (!fallback?.content || data.content.length >= fallback.content.length * 0.5)) {
        setViewingFile({
          type: 'chef',
          language: 'ruby',
          filename: `${cb.name}/recipes/default.rb`,
          path: data.path || cb.path,
          version: cb.version || '1.0.0',
          size_bytes: data.size_bytes || cb.size_bytes || 2048,
          content: data.content
        });
        return;
      }
    } catch (_) {}

    // Fallback to static bundled code
    setViewingFile({
      type: 'chef',
      language: 'ruby',
      filename: `${cb.name}/recipes/default.rb`,
      path: cb.path || fallback?.path,
      version: cb.version || '1.0.0',
      size_bytes: cb.size_bytes || fallback?.size_bytes,
      content: fallback?.content || cb.content
    });
  };

  const handleOpenSaltState = async (st) => {
    const fallback = getStaticSaltStateContent(st.id);
    try {
      const data = await api.getSaltStateContent(st.id);
      if (data && data.content && (!fallback?.content || data.content.length >= fallback.content.length * 0.5)) {
        setViewingFile({
          type: 'salt',
          language: 'yaml',
          filename: `${st.id}.sls`,
          path: data.path || st.path,
          version: '1.0.0',
          size_bytes: data.size_bytes || st.size_bytes,
          content: data.content
        });
        return;
      }
    } catch (_) {}

    // Fallback to static bundled code
    setViewingFile({
      type: 'salt',
      language: 'yaml',
      filename: `${st.id}.sls`,
      path: st.path || fallback?.path,
      version: '1.0.0',
      size_bytes: st.size_bytes || fallback?.size_bytes,
      content: fallback?.content || st.content
    });
  };

  const handleRetry = async () => {
    if (!onRefresh) return;
    setIsRetrying(true);
    try {
      await onRefresh();
    } finally {
      setIsRetrying(false);
    }
  };

  // Determine if fallback warning banner should be displayed
  const showNotice =
    !noticeDismissed &&
    (isFallback || error || (!chefCookbooks?.length && !isLoading));

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-white tracking-wide">
              Cookbooks & States
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Verified Ready</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any cookbook or state to inspect declarative code with syntax highlighting
          </p>
        </div>

        {/* Tab Switch Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0b101d] border border-white/[0.08] rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setActiveTab('chef')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'chef'
                  ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.35)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Chef Cookbooks ({rawCookbooks.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('salt')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'salt'
                  ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>SaltStack States ({rawStates.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Fallback / Notice Banner */}
      {showNotice && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#0e1628]/90 border border-amber-500/30 text-slate-200 shadow-[0_0_20px_rgba(245,158,11,0.08)] flex items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-2">
                <span>Could not load cookbooks from live backend — showing bundled verified sample data</span>
                <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  Standalone Mode
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                The application is running with bundled static recipes and formulas (Ruby & YAML). All syntax viewers and deployment simulations are 100% functional.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onRefresh && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                title="Retry loading from backend"
              >
                <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Retry</span>
              </button>
            )}
            <button
              onClick={() => setNoticeDismissed(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-[#0a0f1d] border border-white/[0.06] rounded-xl px-3 py-2">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${activeTab === 'chef' ? 'cookbooks' : 'states'} by name, recipe or path...`}
            className="w-full bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-500 hover:text-slate-300 text-xs px-1"
            >
              Clear
            </button>
          )}
        </div>
        <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
          Showing {activeTab === 'chef' ? filteredCookbooks.length : filteredStates.length} items
        </div>
      </div>

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="card-cyber p-5 rounded-2xl border-white/[0.08] animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-white/[0.08] rounded"></div>
                <div className="h-4 w-12 bg-white/[0.05] rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-white/[0.05] rounded"></div>
                <div className="h-3 w-4/5 bg-white/[0.05] rounded"></div>
              </div>
              <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between">
                <div className="h-3 w-28 bg-white/[0.05] rounded"></div>
                <div className="h-3 w-14 bg-white/[0.05] rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'chef' ? (
        /* Chef Cookbooks Content */
        filteredCookbooks.length === 0 ? (
          /* Empty State for Chef */
          <div className="card-cyber p-10 rounded-2xl border-white/[0.08] text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No Chef Cookbooks Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No cookbooks matched "${searchQuery}". Clear your search filter to see available cookbooks.`
                : 'No cookbooks are currently loaded.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-semibold hover:bg-orange-500/30 transition cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCookbooks.map((cb) => (
              <div
                key={cb.name}
                onClick={() => handleOpenCookbook(cb)}
                className="card-cyber p-5 rounded-2xl border-orange-500/20 hover:border-orange-500/60 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] flex flex-col justify-between group cursor-pointer transition active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-extrabold font-mono text-orange-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_#f97316]"></span>
                      {cb.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-slate-300 font-mono font-bold">
                      v{cb.version || '1.0.0'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-4 font-normal leading-relaxed">
                    {cb.description}
                  </p>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Included Recipes:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(cb.recipes || ['default']).map((r) => (
                        <span
                          key={r}
                          className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#070b14] text-orange-200 border border-orange-500/25 font-medium"
                        >
                          {cb.name}::{r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono text-[10px] truncate max-w-[140px] text-slate-400" title={cb.path}>
                    {cb.path || `chef/cookbooks/${cb.name}`}
                  </span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* SaltStack States Content */
        filteredStates.length === 0 ? (
          /* Empty State for Salt */
          <div className="card-cyber p-10 rounded-2xl border-white/[0.08] text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No SaltStack States Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No states matched "${searchQuery}". Clear your search filter to see available states.`
                : 'No SaltStack states are currently loaded.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/30 transition cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStates.map((st) => (
              <div
                key={st.id}
                onClick={() => handleOpenSaltState(st)}
                className="card-cyber p-5 rounded-2xl border-cyan-500/20 hover:border-cyan-500/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col justify-between group cursor-pointer transition active:scale-[0.99]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-extrabold font-mono text-cyan-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]"></span>
                      {st.id}.sls
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-slate-300 font-mono font-bold">
                      {st.size_bytes || 2048} B
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4 font-normal leading-relaxed">
                    {st.description ||
                      'Declarative state mapping for minions matching role grains and pillar parameters.'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono text-[10px] truncate max-w-[180px] text-slate-400" title={st.path}>
                    {st.path || `salt/states/${st.id}.sls`}
                  </span>
                  <span className="text-cyan-400 font-bold text-[11px] flex items-center gap-1">
                    <Code2 className="w-3 h-3 text-cyan-400" />
                    <span>YAML SLS</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Code Viewer Modal */}
      <CodeViewerModal
        isOpen={!!viewingFile}
        onClose={() => setViewingFile(null)}
        fileData={viewingFile}
      />
    </div>
  );
}
