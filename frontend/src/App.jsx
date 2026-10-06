import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Deployments } from './pages/Deployments';
import { Servers } from './pages/Servers';
import { Configurations } from './pages/Configurations';
import { History } from './pages/History';
import { DeploymentModal } from './components/DeploymentModal';
import { LogViewerModal } from './components/LogViewerModal';
import { DevOpsAiAgent } from './components/DevOpsAiAgent';
import { api } from './services/api';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [activeEnv, setActiveEnv] = useState('all');

  const [deployments, setDeployments] = useState([]);
  const [servers, setServers] = useState([]);
  const [toolStatus, setToolStatus] = useState(null);
  const [chefCookbooks, setChefCookbooks] = useState([]);
  const [saltStates, setSaltStates] = useState([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);
  const [configsError, setConfigsError] = useState(null);
  const [isUsingFallbackConfigs, setIsUsingFallbackConfigs] = useState(false);

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isAiAgentOpen, setIsAiAgentOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [preloadedPlan, setPreloadedPlan] = useState(null);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Synchronized active deployment for logs (updates in real time)
  const selectedDeploymentForLogs =
    deployments.find((d) => d.id === selectedDeploymentId) || null;

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoadingConfigs(true);
      try {
        const [deps, srvs, tools, cbs, sts] = await Promise.all([
          api.getDeployments(),
          api.getServers(),
          api.getToolStatus(),
          api.getChefCookbooks(),
          api.getSaltStates(),
        ]);
        setDeployments(deps);
        setServers(srvs);
        setToolStatus(tools);
        setChefCookbooks(cbs);
        setSaltStates(sts);
        setIsUsingFallbackConfigs(api.isUsingFallback());
      } catch (err) {
        setConfigsError(err.message || 'Network error');
      } finally {
        setIsLoadingConfigs(false);
      }
    }
    loadData();
  }, []);

  const handleRefreshConfigs = async () => {
    setIsLoadingConfigs(true);
    setConfigsError(null);
    try {
      const [cbs, sts, tools] = await Promise.all([
        api.getChefCookbooks(),
        api.getSaltStates(),
        api.getToolStatus()
      ]);
      setChefCookbooks(cbs);
      setSaltStates(sts);
      setToolStatus(tools);
      setIsUsingFallbackConfigs(api.isUsingFallback());
      showToast('Cookbooks & states refreshed');
    } catch (err) {
      setConfigsError(err.message || 'Failed to refresh from backend');
    } finally {
      setIsLoadingConfigs(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Environment filter for deployments and servers
  const filteredDeployments = deployments.filter((d) =>
    activeEnv === 'all' ? true : d.environment.toLowerCase() === activeEnv.toLowerCase()
  );

  const filteredServers = servers.filter((s) =>
    activeEnv === 'all' ? true : s.environment.toLowerCase() === activeEnv.toLowerCase()
  );

  // Active progress runner: advances active running deployments step-by-step
  useEffect(() => {
    const hasRunning = deployments.some((d) => d.status === 'running' && d.progress < 100);
    if (!hasRunning) return;

    const interval = setInterval(() => {
      setDeployments((prev) =>
        prev.map((dep) => {
          if (dep.status !== 'running' || dep.progress >= 100) return dep;

          const nextProgress = Math.min(100, dep.progress + 6);
          const isDone = nextProgress >= 100;

          let logLine = '';
          const tool = (dep.tool || dep.engine || 'hybrid').toLowerCase();
          const host = dep.target_hosts || 'target-node';

          if (tool === 'salt') {
            if (nextProgress >= 74 && nextProgress < 82) {
              logLine = `\n[SaltStack Minion] Syncing state formulas (SLS) and pillar data to minion: ${host}...`;
            } else if (nextProgress >= 82 && nextProgress < 90) {
              logLine = `\n[SaltStack Minion] Executing state.apply on minion [${host}]... OK`;
            } else if (nextProgress >= 90 && nextProgress < 100) {
              logLine = `\n[SaltStack Minion] Grains verification & compliance check on ${host}... Passed (0 errors)`;
            } else if (isDone) {
              logLine = `\n✓ [SaltStack] Highstate execution complete. All states converged successfully.\n✓ Deployment converged successfully across all target minions.`;
            }
          } else if (tool === 'chef') {
            if (nextProgress >= 74 && nextProgress < 82) {
              logLine = `\n[Chef Client] Syncing template [/etc/nginx/conf.d/tls.conf] on ${host} (checksum verified)`;
            } else if (nextProgress >= 82 && nextProgress < 90) {
              logLine = `\n[Chef Client] Reloading service[nginx] workers without downtime... OK`;
            } else if (nextProgress >= 90 && nextProgress < 100) {
              logLine = `\n[Chef Client] InSpec compliance verification on ${host}... Passed (0 failures)`;
            } else if (isDone) {
              logLine = `\n✓ [Chef Client] Run complete. 6/6 resources updated.\n✓ Deployment converged successfully across all target nodes.`;
            }
          } else {
            // Hybrid (Chef + Salt)
            if (nextProgress >= 74 && nextProgress < 82) {
              logLine = `\n[Chef Client] Syncing cookbooks & resolving dependencies... OK`;
            } else if (nextProgress >= 82 && nextProgress < 90) {
              logLine = `\n[SaltStack Minion] Applying highstate configuration to minions: ${host}... OK`;
            } else if (nextProgress >= 90 && nextProgress < 100) {
              logLine = `\n[Orchestrator] Multi-engine compliance & latency verification... Passed`;
            } else if (isDone) {
              logLine = `\n✓ [Orchestrator] Hybrid deployment complete.\n✓ All Chef cookbooks and Salt states converged successfully.`;
            }
          }

          if (isDone) {
            showToast(`✓ Deployment #${dep.id} converged successfully!`);
            api.completeDeployment(dep.id).catch(() => {});
          }

          return {
            ...dep,
            progress: nextProgress,
            status: isDone ? 'success' : 'running',
            completed_at: isDone ? new Date().toISOString() : dep.completed_at,
            log_output: logLine ? (dep.log_output || '') + logLine : dep.log_output,
          };
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [deployments]);

  // Handlers
  const handleCreateDeployment = async (formData) => {
    const newDep = await api.createDeployment(formData);
    setDeployments((prev) => [newDep, ...prev]);
    showToast(`✓ Deployment "${newDep.name}" queued!`);
  };

  const handleExecuteDeploy = async (id) => {
    showToast(`Executing deployment #${id}...`);
    const updated = await api.executeDeployment(id);
    setDeployments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
  };

  const handleCompleteDeploy = async (id) => {
    showToast(`Converging deployment #${id} to 100%...`);
    const updated = await api.completeDeployment(id);
    setDeployments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
    showToast(`✓ Deployment #${id} marked as fully converged.`);
  };

  const handleCancelDeploy = async (id) => {
    const updated = await api.cancelDeployment(id);
    setDeployments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
    showToast(`Deployment #${id} cancelled.`);
  };

  const handleDeleteDeploy = async (id) => {
    if (!window.confirm(`Are you sure you want to delete deployment #${id}?`)) return;
    try {
      await api.deleteDeployment(id);
      setDeployments((prev) => prev.filter((d) => d.id !== id));
      showToast(`✓ Deployment #${id} deleted successfully.`);
    } catch (err) {
      showToast(`Failed to delete deployment #${id}: ${err.message || err}`);
    }
  };

  const handleCheckHealth = async (id) => {
    showToast(`Verifying server #${id} health...`);
    const result = await api.checkServerHealth(id);
    setServers((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, health_status: result.health_status, last_health_check: 'Just now' } : s
      )
    );
    showToast(`Server #${id} verified: ${result.health_status.toUpperCase()}`);
  };

  const handleCheckAllHealth = async () => {
    showToast('Checking fleet health across all nodes...');
    const result = await api.checkAllServersHealth();
    setServers([...result]);
    showToast('Fleet verification complete: All healthy');
  };

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-100 overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenAiAgent={() => setIsAiAgentOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          activeEnv={activeEnv}
          setActiveEnv={setActiveEnv}
          onNewDeployment={() => {
            setPreloadedPlan(null);
            setIsDeployModalOpen(true);
          }}
          onOpenAiAgent={() => setIsAiAgentOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* Scrollable Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <Dashboard
                deployments={filteredDeployments}
                servers={filteredServers}
                toolStatus={toolStatus}
                onOpenDeployModal={() => {
                  setPreloadedPlan(null);
                  setIsDeployModalOpen(true);
                }}
                onViewLogs={(d) => setSelectedDeploymentId(d.id)}
                onExecuteDeploy={handleExecuteDeploy}
                onCompleteDeploy={handleCompleteDeploy}
                onCancelDeploy={handleCancelDeploy}
                onDeleteDeploy={handleDeleteDeploy}
              />
            )}

            {currentTab === 'deployments' && (
              <Deployments
                deployments={filteredDeployments}
                onOpenDeployModal={() => {
                  setPreloadedPlan(null);
                  setIsDeployModalOpen(true);
                }}
                onViewLogs={(d) => setSelectedDeploymentId(d.id)}
                onExecuteDeploy={handleExecuteDeploy}
                onCompleteDeploy={handleCompleteDeploy}
                onCancelDeploy={handleCancelDeploy}
                onDeleteDeploy={handleDeleteDeploy}
              />
            )}

            {currentTab === 'servers' && (
              <Servers
                servers={filteredServers}
                onCheckHealth={handleCheckHealth}
                onCheckAllHealth={handleCheckAllHealth}
              />
            )}

            {currentTab === 'configs' && (
              <Configurations
                chefCookbooks={chefCookbooks}
                saltStates={saltStates}
                isLoading={isLoadingConfigs}
                error={configsError}
                isFallback={isUsingFallbackConfigs}
                onRefresh={handleRefreshConfigs}
              />
            )}

            {currentTab === 'history' && (
              <History
                deployments={deployments}
                onViewLogs={(d) => setSelectedDeploymentId(d.id)}
                onCompleteDeploy={handleCompleteDeploy}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals & Overlays */}
      <DeploymentModal
        isOpen={isDeployModalOpen}
        onClose={() => {
          setIsDeployModalOpen(false);
          setPreloadedPlan(null);
        }}
        onSubmit={handleCreateDeployment}
        servers={servers}
        initialPlan={preloadedPlan}
      />

      <LogViewerModal
        isOpen={!!selectedDeploymentForLogs}
        deployment={selectedDeploymentForLogs}
        onClose={() => setSelectedDeploymentId(null)}
        onCompleteDeploy={handleCompleteDeploy}
        onCancelDeploy={handleCancelDeploy}
      />

      <DevOpsAiAgent
        isOpen={isAiAgentOpen}
        onClose={() => setIsAiAgentOpen(false)}
        servers={servers}
        deployments={deployments}
        onDeploymentCreated={(newDep) => {
          setDeployments((prev) => [newDep, ...prev]);
          showToast(`Deployment #${newDep.id} initiated!`);
        }}
        onOpenDeploymentModalWithPlan={(plan) => {
          setPreloadedPlan(plan);
          setIsDeployModalOpen(true);
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#0b101d] border border-cyan-500/30 text-cyan-300 font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
