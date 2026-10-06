#
# Cookbook:: monitoring
# Recipe:: default
#
# Installs Prometheus and Node Exporter for system monitoring.
#

prometheus_version = node['monitoring']['prometheus_version'] || '2.48.0'
node_exporter_version = node['monitoring']['node_exporter_version'] || '1.7.0'
prometheus_user = 'prometheus'

# ── System User ──────────────────────────────────────────

user prometheus_user do
  system true
  shell  '/usr/sbin/nologin'
  home   '/var/lib/prometheus'
  manage_home false
  action :create
end

# ── Directories ──────────────────────────────────────────

%w[
  /etc/prometheus
  /var/lib/prometheus
  /opt/prometheus
].each do |dir|
  directory dir do
    owner prometheus_user
    group prometheus_user
    mode  '0755'
    recursive true
  end
end

# ── Download & Install Prometheus ────────────────────────

prometheus_archive = "prometheus-#{prometheus_version}.linux-amd64"

remote_file "/tmp/#{prometheus_archive}.tar.gz" do
  source "https://github.com/prometheus/prometheus/releases/download/v#{prometheus_version}/#{prometheus_archive}.tar.gz"
  action :create_if_missing
end

execute 'extract-prometheus' do
  command "tar -xzf /tmp/#{prometheus_archive}.tar.gz -C /opt/prometheus --strip-components=1"
  creates '/opt/prometheus/prometheus'
end

# Symlink binaries
%w[prometheus promtool].each do |bin|
  link "/usr/local/bin/#{bin}" do
    to "/opt/prometheus/#{bin}"
  end
end

# ── Prometheus Configuration ─────────────────────────────

template '/etc/prometheus/prometheus.yml' do
  source 'prometheus.yml.erb'
  owner  prometheus_user
  group  prometheus_user
  mode   '0644'
  variables(
    scrape_interval: node['monitoring']['scrape_interval'] || '15s',
    app_host: node['monitoring']['app_host'] || 'localhost',
    app_port: node['monitoring']['app_port'] || 8000
  )
  notifies :restart, 'service[prometheus]', :delayed
end

# ── Prometheus Systemd Service ───────────────────────────

template '/etc/systemd/system/prometheus.service' do
  source 'prometheus.service.erb'
  owner  'root'
  group  'root'
  mode   '0644'
  variables(user: prometheus_user)
  notifies :run, 'execute[systemctl-daemon-reload-monitoring]', :immediately
end

execute 'systemctl-daemon-reload-monitoring' do
  command 'systemctl daemon-reload'
  action  :nothing
end

service 'prometheus' do
  supports status: true, restart: true
  action [:enable, :start]
end

# ── Download & Install Node Exporter ─────────────────────

node_exporter_archive = "node_exporter-#{node_exporter_version}.linux-amd64"

remote_file "/tmp/#{node_exporter_archive}.tar.gz" do
  source "https://github.com/prometheus/node_exporter/releases/download/v#{node_exporter_version}/#{node_exporter_archive}.tar.gz"
  action :create_if_missing
end

execute 'extract-node-exporter' do
  command "tar -xzf /tmp/#{node_exporter_archive}.tar.gz -C /opt/prometheus --strip-components=1"
  creates '/opt/prometheus/node_exporter'
end

link '/usr/local/bin/node_exporter' do
  to '/opt/prometheus/node_exporter'
end

# ── Node Exporter Systemd Service ────────────────────────

template '/etc/systemd/system/node_exporter.service' do
  source 'node_exporter.service.erb'
  owner  'root'
  group  'root'
  mode   '0644'
  variables(user: prometheus_user)
  notifies :run, 'execute[systemctl-daemon-reload-monitoring]', :immediately
end

service 'node_exporter' do
  supports status: true, restart: true
  action [:enable, :start]
end
