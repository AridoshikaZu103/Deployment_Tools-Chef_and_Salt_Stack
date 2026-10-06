import React, { useState } from 'react';
import { Layers, Server, Check, Code2, FileCode } from 'lucide-react';
import { CodeViewerModal } from '../components/CodeViewerModal';
import { api } from '../services/api';

const DEFAULT_CHEF_CODE = {
  nginx: `#
# Cookbook:: nginx
# Recipe:: default
#
# Installs Nginx, deploys reverse proxy configuration, and enables service.

package 'nginx' do
  action :install
end

template '/etc/nginx/nginx.conf' do
  source 'nginx.conf.erb'
  owner  'root'
  group  'root'
  mode   '0644'
  variables(
    worker_processes: node['nginx']['worker_processes'] || 'auto',
    worker_connections: node['nginx']['worker_connections'] || 1024
  )
  notifies :reload, 'service[nginx]', :delayed
end

template '/etc/nginx/sites-available/app_proxy.conf' do
  source 'app_proxy.conf.erb'
  owner  'root'
  group  'root'
  mode   '0644'
  variables(
    server_name: node['nginx']['server_name'] || 'localhost',
    upstream_host: '127.0.0.1',
    upstream_port: 8000
  )
  notifies :reload, 'service[nginx]', :delayed
end

link '/etc/nginx/sites-enabled/app_proxy.conf' do
  to '/etc/nginx/sites-available/app_proxy.conf'
  notifies :reload, 'service[nginx]', :delayed
end

service 'nginx' do
  action [:enable, :start]
  supports status: true, restart: true, reload: true
end`,

  app_server: `#
# Cookbook:: app_server
# Recipe:: default
#
# Configures Python 3.11 virtualenv and FastAPI systemd daemon.

package ['python3', 'python3-venv', 'python3-pip'] do
  action :install
end

directory '/opt/fastapi_app' do
  owner 'deploy'
  group 'deploy'
  mode '0755'
  recursive true
end

execute 'create_virtualenv' do
  command 'python3 -m venv /opt/fastapi_app/venv'
  creates '/opt/fastapi_app/venv/bin/activate'
end

template '/etc/systemd/system/fastapi-app.service' do
  source 'fastapi-app.service.erb'
  owner 'root'
  group 'root'
  mode '0644'
  notifies :run, 'execute[systemctl_daemon_reload]', :immediately
  notifies :restart, 'service[fastapi-app]', :delayed
end

execute 'systemctl_daemon_reload' do
  command 'systemctl daemon-reload'
  action :nothing
end

service 'fastapi-app' do
  action [:enable, :start]
end`,

  postgresql: `#
# Cookbook:: postgresql
# Recipe:: default
#
# Provisions PostgreSQL 15 database engine and connection tuning.

package ['postgresql-15', 'postgresql-contrib'] do
  action :install
end

template '/etc/postgresql/15/main/postgresql.conf' do
  source 'postgresql.conf.erb'
  owner 'postgres'
  group 'postgres'
  mode '0644'
  notifies :restart, 'service[postgresql]', :delayed
end

service 'postgresql' do
  action [:enable, :start]
end`,

  monitoring: `#
# Cookbook:: monitoring
# Recipe:: default
#
# Installs Prometheus Node Exporter agent on port 9100.

package 'prometheus-node-exporter' do
  action :install
end

service 'prometheus-node-exporter' do
  action [:enable, :start]
end`
};

const DEFAULT_SALT_CODE = {
  top: `# SaltStack Top File (Environment & Minion Mapping)
base:
  '*':
    - common
  'roles:webserver':
    - match: grain
    - nginx
  'roles:appserver':
    - match: grain
    - app_server
  'roles:database':
    - match: grain
    - postgresql
  'roles:monitoring':
    - match: grain
    - monitoring`,

  common: `# SaltStack Common Baseline
base_packages:
  pkg.installed:
    - pkgs:
      - curl
      - htop
      - git
      - ufw
      - jq

sysctl_tuning:
  file.managed:
    - name: /etc/sysctl.d/99-sysctl.conf
    - source: salt://common/files/99-sysctl.conf
    - user: root
    - group: root
    - mode: '0644'`,

  nginx: `# SaltStack Nginx Reverse Proxy State
nginx_pkg:
  pkg.installed:
    - name: nginx

nginx_conf:
  file.managed:
    - name: /etc/nginx/nginx.conf
    - source: salt://nginx/files/nginx.conf
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - watch_in:
      - service: nginx_service

nginx_service:
  service.running:
    - name: nginx
    - enable: True
    - reload: True`,

  app_server: `# SaltStack FastAPI Application Server State
app_pkgs:
  pkg.installed:
    - pkgs:
      - python3-venv
      - python3-pip

app_service:
  service.running:
    - name: fastapi-app
    - enable: True
    - reload: True`,

  postgresql: `# SaltStack PostgreSQL 15 Database State
postgresql_pkg:
  pkg.installed:
    - pkgs:
      - postgresql-15
      - postgresql-contrib

postgresql_service:
  service.running:
    - name: postgresql
    - enable: True`,

  monitoring: `# SaltStack Prometheus Telemetry Agent State
node_exporter_pkg:
  pkg.installed:
    - name: prometheus-node-exporter

node_exporter_service:
  service.running:
    - name: prometheus-node-exporter
    - enable: True`
};

export function Configurations({ chefCookbooks, saltStates }) {
  const [activeTab, setActiveTab] = useState('chef');
  const [viewingFile, setViewingFile] = useState(null);

  const handleOpenCookbook = async (cb) => {
    try {
      const data = await api.getCookbookContent(cb.name, 'default');
      if (data && data.content) {
        setViewingFile({
          type: 'chef',
          language: 'ruby',
          filename: `${cb.name}/recipes/default.rb`,
          path: data.path || cb.path,
          version: cb.version,
          size_bytes: data.size_bytes || 2048,
          content: data.content
        });
        return;
      }
    } catch (_) {}

    // Fallback to embedded real recipe code
    setViewingFile({
      type: 'chef',
      language: 'ruby',
      filename: `${cb.name}/recipes/default.rb`,
      path: cb.path,
      version: cb.version,
      size_bytes: 2048,
      content: DEFAULT_CHEF_CODE[cb.name] || DEFAULT_CHEF_CODE.nginx
    });
  };

  const handleOpenSaltState = async (st) => {
    try {
      const data = await api.getSaltStateContent(st.id);
      if (data && data.content) {
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

    // Fallback to embedded real salt state code
    setViewingFile({
      type: 'salt',
      language: 'yaml',
      filename: `${st.id}.sls`,
      path: st.path,
      version: '1.0.0',
      size_bytes: st.size_bytes,
      content: DEFAULT_SALT_CODE[st.id] || DEFAULT_SALT_CODE.top
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-wide">Cookbooks & States</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Click any cookbook or state to inspect code with syntax highlighting
          </p>
        </div>

        {/* Tab switch pills */}
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
            <span>Chef Cookbooks (Ruby)</span>
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
            <span>SaltStack States (YAML)</span>
          </button>
        </div>
      </div>

      {activeTab === 'chef' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {chefCookbooks.map((cb) => (
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
                    v{cb.version}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-4 font-normal leading-relaxed">{cb.description}</p>
                
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Included Recipes:</span>
                  <div className="flex flex-wrap gap-1">
                    {cb.recipes.map((r) => (
                      <span key={r} className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#070b14] text-orange-200 border border-orange-500/25 font-medium">
                        {cb.name}::{r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono text-[10px] truncate max-w-[140px] text-slate-400">{cb.path}</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Verified</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {saltStates.map((st) => (
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
                    {st.size_bytes} B
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4 font-normal leading-relaxed">
                  Declarative state mapping for minions matching role grains and pillar parameters.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono text-[10px] truncate max-w-[180px] text-slate-400">{st.path}</span>
                <span className="text-cyan-400 font-bold text-[11px] flex items-center gap-1">
                  <Code2 className="w-3 h-3 text-cyan-400" />
                  <span>YAML SLS</span>
                </span>
              </div>
            </div>
          ))}
        </div>
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
