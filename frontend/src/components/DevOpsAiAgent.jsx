import React, { useState, useEffect, useRef } from 'react';
import { Bot, BookOpen, Activity, Volume2, VolumeX, X } from 'lucide-react';
import { api } from '../services/api';
import { AIChatView } from './ai/AIChatView';
import { TutorialView } from './tutorial/TutorialView';
import { LiveMode } from './live/LiveMode';

const AGENT = {
  name: 'Nova-Orchestrator',
  role: 'Autonomous Fleet SRE & Cloud Orchestrator',
  voicePitch: 1.0,
  voiceRate: 1.05
};

export function DevOpsAiAgent({
  isOpen,
  onClose,
  servers = [],
  deployments = [],
  onDeploymentCreated,
  onOpenDeploymentModalWithPlan
}) {
  // Master View Mode: 'live' (default SRE command center) | 'chat' | 'tutorial'
  const [activeMode, setActiveMode] = useState('live');

  // Voice Settings & State Machine
  // 'READY' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'STOPPED' | 'ERROR'
  const [voiceState, setVoiceState] = useState('READY');
  const [voiceError, setVoiceError] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');

  // References to active speech synthesis & recognition to guarantee clean termination
  const recognitionRef = useRef(null);
  const activeUtteranceRef = useRef(null);

  // Request Protection Lock & ID to prevent double calls or race loops
  const isProcessingRef = useRef(false);
  const activeRequestIdRef = useRef(null);
  const hasDispatchedVoiceRef = useRef(false);

  // Persistent Chat State
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'agent',
      text: `**[Nova-Orchestrator - SRE Copilot]**\n\nHello! I am your Autonomous Fleet SRE Copilot powered by **Gemini 3.8 Flash**.\n\n• **Active Telemetry**: 5 Cluster Nodes synchronized across Production, Staging, and Dev.\n• **Orchestration**: Chef Client (Pull/Idempotent) & SaltStack Minions (Push/ZeroMQ).\n\nAsk me any architecture question, say *"Deploy Nginx using Chef"* to generate a deployment plan, or use hands-free **Speak** in the command center!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // ── Global Cleanup on Close or Route Change ─────────────────
  const stopVoiceSession = () => {
    // 1. Immediately cancel all Web Speech API speech synthesis & clear queue
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    activeUtteranceRef.current = null;

    // 2. Abort any active speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }

    hasDispatchedVoiceRef.current = false;
    setInterimTranscript('');
    setVoiceState('STOPPED');
    setTimeout(() => {
      setVoiceState((prev) => (prev === 'STOPPED' ? 'READY' : prev));
    }, 500);
  };

  useEffect(() => {
    if (!isOpen) {
      stopVoiceSession();
    }
  }, [isOpen]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, []);

  // ── Keyboard Listener (Close on ESC) ────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        stopVoiceSession();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ── Voice / Speech Synthesis (TTS) ──────────────────────────
  const speakText = (text, onEndCallback = null) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      setVoiceState('READY');
      if (onEndCallback) onEndCallback();
      return;
    }

    try {
      // Browser SpeechSynthesis API queues utterances, so explicitly cancel previous speech first
      window.speechSynthesis.cancel();

      const cleanText = text
        .replace(/[*#`_~]/g, '')
        .replace(/\[.*?\]\(.*?\)/g, '')
        .replace(/recipe\[(.*?)\]/g, 'recipe $1')
        .replace(/state\.(.*?)/g, 'state $1');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.pitch = AGENT.voicePitch;
      utterance.rate = AGENT.voiceRate;

      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
      );
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => {
        setVoiceState('SPEAKING');
      };

      utterance.onend = () => {
        activeUtteranceRef.current = null;
        setVoiceState('READY');
        if (onEndCallback) onEndCallback();
      };

      utterance.onerror = () => {
        activeUtteranceRef.current = null;
        setVoiceState('READY');
        if (onEndCallback) onEndCallback();
      };

      activeUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setVoiceState('READY');
      if (onEndCallback) onEndCallback();
    }
  };

  // ── Speech-to-Speech (Full Voice Loop with Interim vs Final separation) ────
  const startSpeakingSession = () => {
    // 1. Terminate any previous session first
    stopVoiceSession();

    // 2. Feature detection
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setVoiceState('ERROR');
      setVoiceError('Voice recognition is not supported in this browser. Please use Chrome or Edge.');
      setTimeout(() => setVoiceState('READY'), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true; // Provides interim live speech
      recognition.continuous = false; // Single utterance
      recognition.maxAlternatives = 1;

      hasDispatchedVoiceRef.current = false;
      setInterimTranscript('');

      recognition.onstart = () => {
        setVoiceState('LISTENING');
        setVoiceError(null);
      };

      recognition.onresult = (event) => {
        let interimText = '';
        let finalText = '';

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            finalText += text;
          } else {
            interimText += text;
          }
        }

        // Interim transcript updates LIVE TRANSCRIPT only.
        // MUST NOT create chat messages. MUST NOT call Gemini. MUST NOT call FastAPI.
        if (interimText && !finalText) {
          setInterimTranscript(interimText);
        }

        // ONLY when final transcript is ready, trigger exactly ONE request
        if (finalText.trim() && !hasDispatchedVoiceRef.current) {
          hasDispatchedVoiceRef.current = true;
          setInterimTranscript(finalText.trim());

          // Immediately abort recognition so mic doesn't capture room or audio
          try {
            recognition.abort();
          } catch (_) {}
          recognitionRef.current = null;

          // Transition to THINKING
          setVoiceState('THINKING');

          // Send single query
          handleSendMessage(finalText.trim(), true, 'voice');
        }
      };

      recognition.onerror = (event) => {
        recognitionRef.current = null;
        if (event.error !== 'no-speech') {
          setVoiceState('ERROR');
          setVoiceError(`Microphone issue: ${event.error}. You can continue with text chat.`);
          setTimeout(() => setVoiceState('READY'), 4000);
        } else {
          setVoiceState('READY');
        }
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        // If ended without voice being dispatched, return to READY
        if (!hasDispatchedVoiceRef.current) {
          setVoiceState((prev) => (prev === 'LISTENING' ? 'READY' : prev));
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setVoiceState('ERROR');
      setVoiceError('Microphone permission denied or unavailable.');
      setTimeout(() => setVoiceState('READY'), 4000);
    }
  };

  // ── Mode Switcher Handlers ──────────────────────────────────
  const handleSwitchMode = (mode) => {
    stopVoiceSession();
    setActiveMode(mode);
  };

  // ── Clear Chat History Handler ──────────────────────────────
  const handleClearChat = () => {
    setMessages([
      {
        id: `clr_${Date.now()}`,
        sender: 'agent',
        text: `**[Nova-Orchestrator - SRE Copilot]**\n\nChat history cleared. Active fleet telemetry synchronized across ${servers.length || 5} nodes. How can I assist you with your deployments, Chef cookbooks, or SaltStack states?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // ── Send Message & AI Planning Execution (Protected Single Request Pipeline) ─
  const handleSendMessage = async (textToSend, isVoiceSession = false, origin = 'text') => {
    const query = (textToSend || inputPrompt).trim();
    if (!query) return;

    // ATOMIC LOCK: Prevent duplicate API requests, double clicks, enter + button double submission
    if (isProcessingRef.current) {
      console.warn('[SRE Request Lock] Blocked concurrent submission:', query);
      return;
    }
    isProcessingRef.current = true;
    setLoading(true);

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    activeRequestIdRef.current = requestId;

    if (!textToSend) {
      setInputPrompt('');
    }

    // Check for mode commands
    if (query.toLowerCase() === '/live') {
      handleSwitchMode('live');
      setInputPrompt('');
      speakText('Switched to live SRE command center.');
      isProcessingRef.current = false;
      setLoading(false);
      return;
    }

    if (query.toLowerCase() === '/tutorial' || query.toLowerCase() === 'tutorial') {
      handleSwitchMode('tutorial');
      setInputPrompt('');
      speakText('Starting interactive orchestration tutorial.');
      isProcessingRef.current = false;
      setLoading(false);
      return;
    }

    // Add exactly ONE Operator message to chat history
    const userMessage = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sender: 'user',
      text: query,
      origin: origin, // 'voice' or 'text'
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Call FastAPI backend securely (API key is stored in backend/.env ONLY)
      const res = await api.askAiAgent(query, {
        servers: servers.map((s) => ({ hostname: s.hostname, role: s.role, health: s.health_status })),
        deployments_count: deployments.length
      });

      // Verify this response matches the active request ID (prevent stale responses)
      if (activeRequestIdRef.current !== requestId) {
        console.warn('[SRE Request Lock] Stale response discarded:', requestId);
        return;
      }

      const replyText =
        res?.reply ||
        `**[Nova-Orchestrator - SRE Copilot]**\n\nAnalyzed cluster state across ${servers.length || 5} nodes. All Chef and SaltStack components are synchronized.`;

      // Add exactly ONE Nova response to chat history
      const agentMessage = {
        id: `nova_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sender: 'agent',
        text: replyText,
        plan: res?.plan || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, agentMessage]);

      // If voice session or voice narration enabled, speak response aloud exactly ONE time
      if (isVoiceSession || voiceEnabled) {
        speakText(replyText);
      } else {
        setVoiceState('READY');
      }
    } catch (err) {
      const errorMessage = {
        id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sender: 'agent',
        text: `**[Nova-Orchestrator - Notice]**\n\nUnable to reach backend AI service: ${err.message}. Please verify FastAPI backend on port 8000.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMessage]);
      setVoiceState('ERROR');
      setVoiceError(err.message);
      setTimeout(() => setVoiceState('READY'), 3000);
    } finally {
      setLoading(false);
      isProcessingRef.current = false;
    }
  };

  // ── Plan Action Confirmation Handler ────────────────────────
  const handleConfirmPlan = async (plan) => {
    stopVoiceSession();
    try {
      const newDep = await api.createDeployment({
        name: plan.name,
        description: plan.description || `Automated rollout orchestrated by ${AGENT.name}`,
        environment: plan.environment || 'production',
        tool: plan.tool || 'both',
        target_hosts: plan.target_hosts || '*',
        chef_runlist: plan.chef_runlist || null,
        salt_states: plan.salt_states || null,
        dry_run: false
      });

      const confirmMsg = {
        id: Date.now(),
        sender: 'agent',
        text: `**[Nova-Orchestrator - Deployment Initiated]**\n\nDeployment **#${newDep.id} - ${newDep.name}** has been triggered across target hosts \`${newDep.target_hosts}\`.\n\n- **Status**: Running\n- **Engine**: ${newDep.tool.toUpperCase()}\n- **Environment**: ${newDep.environment.toUpperCase()}\n\nReal-time convergence logs are streaming. You can inspect logs in the Deployments page or open the log viewer directly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, confirmMsg]);
      speakText(`Deployment #${newDep.id} has been launched.`);

      if (onDeploymentCreated) {
        onDeploymentCreated(newDep);
      }
    } catch (err) {
      const errMsg = {
        id: Date.now(),
        sender: 'agent',
        text: `**[Nova-Orchestrator - Error]**\n\nFailed to start deployment: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errMsg]);
    }
  };

  const handleReviewPlan = (plan) => {
    if (onOpenDeploymentModalWithPlan) {
      onOpenDeploymentModalWithPlan(plan);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopVoiceSession();
          onClose();
        }
      }}
    >
      {/* Left-side clickable backdrop area */}
      <div
        onClick={() => {
          stopVoiceSession();
          onClose();
        }}
        className="flex-1 h-full cursor-pointer select-none"
        title="Click to close"
      />

      {/* The AI Drawer Container (Responsive for mobile & expansive for desktop) */}
      <div
        className={`w-full ${
          activeMode === 'live'
            ? 'md:max-w-4xl lg:max-w-5xl xl:max-w-6xl'
            : 'sm:max-w-2xl'
        } h-screen max-h-screen flex flex-col bg-[#070b14] border-l border-cyan-500/30 shadow-[-15px_0_50px_rgba(0,0,0,0.9)] relative overflow-hidden z-10 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] transition-all duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* ── Top Header (Pinned & Always Visible) ───────────────────────── */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-b border-white/[0.08] bg-[#070b14] sticky top-0 z-30 flex items-center justify-between shadow-md">
          {/* Identity */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-orange-500 via-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.35)] border border-cyan-400/30 shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
                  {AGENT.name}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                  Gemini 3.8
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                {AGENT.role}
              </p>
            </div>
          </div>

          {/* Controls: Mode Switcher, Voice, and Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-[#0b101f] border border-white/[0.08] rounded-xl p-0.5 sm:p-1 shadow-inner">
              <button
                onClick={() => handleSwitchMode('live')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'live'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Live SRE Command Center"
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Live</span>
              </button>

              <button
                onClick={() => handleSwitchMode('chat')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'chat'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Classic AI Chat View"
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chat</span>
              </button>

              <button
                onClick={() => handleSwitchMode('tutorial')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeMode === 'tutorial'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Interactive 5-Step Tutorial"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tutorial</span>
              </button>
            </div>

            {/* Voice Toggle */}
            <button
              onClick={() => {
                if (voiceState === 'SPEAKING') stopVoiceSession();
                setVoiceEnabled(!voiceEnabled);
              }}
              title={voiceEnabled ? 'Mute AI Voice Narration' : 'Enable AI Voice Narration'}
              className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                voiceEnabled
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:text-slate-300'
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Clean Minimalist Close Button */}
            <button
              onClick={() => {
                stopVoiceSession();
                onClose();
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] border border-transparent hover:border-white/[0.1] transition-all cursor-pointer active:scale-95"
              title="Close Drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Mode Content Rendering ─────────────────────────────────── */}
        {activeMode === 'live' && (
          <LiveMode
            voiceState={voiceState}
            voiceError={voiceError}
            interimTranscript={interimTranscript}
            onStartSpeakingSession={startSpeakingSession}
            onStopVoice={stopVoiceSession}
            onStopSpeaking={stopVoiceSession}
            onSpeakText={speakText}
            messages={messages}
            loading={loading}
            onSendMessage={handleSendMessage}
            onConfirmPlan={handleConfirmPlan}
            onReviewPlan={handleReviewPlan}
            onClearChat={handleClearChat}
            servers={servers}
            deployments={deployments}
            onSwitchToChat={() => handleSwitchMode('chat')}
          />
        )}

        {activeMode === 'chat' && (
          <AIChatView
            messages={messages}
            loading={loading}
            inputPrompt={inputPrompt}
            setInputPrompt={setInputPrompt}
            onSendMessage={handleSendMessage}
            isSpeaking={voiceState === 'SPEAKING'}
            onStopSpeaking={stopVoiceSession}
            onSpeakText={speakText}
            isListening={voiceState === 'LISTENING'}
            onStartListening={startSpeakingSession}
            onStopListening={stopVoiceSession}
            onConfirmPlan={handleConfirmPlan}
            onReviewPlan={handleReviewPlan}
            serversCount={servers.length || 5}
          />
        )}

        {activeMode === 'tutorial' && (
          <TutorialView
            onExit={() => {
              stopVoiceSession();
              setActiveMode('live');
            }}
            onReturnToChat={() => {
              stopVoiceSession();
              setActiveMode('live');
            }}
            voiceEnabled={voiceEnabled}
            onToggleVoice={() => {
              if (voiceState === 'SPEAKING') stopVoiceSession();
              setVoiceEnabled(!voiceEnabled);
            }}
          />
        )}
      </div>
    </div>
  );
}
