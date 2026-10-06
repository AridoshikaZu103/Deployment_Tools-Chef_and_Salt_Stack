/**
 * Bundled Static Data for Chef Cookbooks & SaltStack States.
 * Allows the application to run seamlessly with full code inspection,
 * syntax highlighting, and verified metadata without requiring an active local backend.
 */

export const STATIC_CHEF_COOKBOOKS = [
  {
    name: 'app_server',
    version: '1.0.0',
    description: 'Deploys the FastAPI application server with systemd',
    path: 'chef/cookbooks/app_server',
    recipes: ['default'],
    verified: true,
    language: 'ruby',
    filename: 'app_server/recipes/default.rb',
    size_bytes: 2748,
    content: `#
# Cookbook:: app_server
# Recipe:: default
#
# Sets up Python, creates a virtualenv, installs the FastAPI app,
# and configures a systemd service.
#

app_user = node['app_server']['user'] || 'deploy'
app_dir  = node['app_server']['app_dir'] || '/opt/deployment-tools'
venv_dir = "#{app_dir}/venv"

# ── System Dependencies ─────────────────────────────────

%w[python3 python3-pip python3-venv git].each do |pkg|
  package pkg do
    action :install
  end
end

# ── Application User ────────────────────────────────────

user app_user do
  system true
  shell  '/bin/bash'
  home   "/home/#{app_user}"
  manage_home true
  action :create
end

# ── Application Directory ───────────────────────────────

directory app_dir do
  owner     app_user
  group     app_user
  mode      '0755'
  recursive true
end

# ── Virtual Environment ─────────────────────────────────

execute 'create-virtualenv' do
  command "python3 -m venv #{venv_dir}"
  user    app_user
  creates "#{venv_dir}/bin/activate"
end

# ── Install Dependencies ────────────────────────────────

execute 'install-requirements' do
  command "#{venv_dir}/bin/pip install --upgrade pip && #{venv_dir}/bin/pip install -r #{app_dir}/backend/requirements.txt"
  user    app_user
  cwd     app_dir
  only_if { ::File.exist?("#{app_dir}/backend/requirements.txt") }
end

# ── Systemd Service ─────────────────────────────────────

template '/etc/systemd/system/deployment-tools.service' do
  source 'deployment-tools.service.erb'
  owner  'root'
  group  'root'
  mode   '0644'
  variables(
    user: app_user,
    app_dir: app_dir,
    venv_dir: venv_dir,
    host: node['app_server']['host'] || '0.0.0.0',
    port: node['app_server']['port'] || 8000,
    workers: node['app_server']['workers'] || 4
  )
  notifies :run, 'execute[systemctl-daemon-reload]', :immediately
  notifies :restart, 'service[deployment-tools]', :delayed
end

execute 'systemctl-daemon-reload' do
  command 'systemctl daemon-reload'
  action  :nothing
end

service 'deployment-tools' do
  supports status: true, restart: true
  action [:enable, :start]
end

# ── Log Directory ────────────────────────────────────────

directory "#{app_dir}/logs" do
  owner app_user
  group app_user
  mode  '0755'
end`
  },
  {
    name: 'monitoring',
    version: '1.0.0',
    description: 'Installs Prometheus and Node Exporter for monitoring',
    path: 'chef/cookbooks/monitoring',
    recipes: ['default'],
    verified: true,
    language: 'ruby',
    filename: 'monitoring/recipes/default.rb',
    size_bytes: 3853,
    content: `#
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
end`
  },
  {
    name: 'nginx',
    version: '1.0.0',
    description: 'Installs and configures Nginx as a reverse proxy',
    path: 'chef/cookbooks/nginx',
    recipes: ['default'],
    verified: true,
    language: 'ruby',
    filename: 'nginx/recipes/default.rb',
    size_bytes: 2100,
    content: `#
# Cookbook:: nginx
# Recipe:: default
#
# Installs Nginx, deploys configuration, and enables the service.
#

# ── Install ──────────────────────────────────────────────

package 'nginx' do
  action :install
end

# ── Configuration ────────────────────────────────────────

# Main nginx.conf
template '/etc/nginx/nginx.conf' do
  source 'nginx.conf.erb'
  owner  'root'
  group  'root'
  mode   '0644'
  variables(
    worker_processes: node['nginx']['worker_processes'] || 'auto',
    worker_connections: node['nginx']['worker_connections'] || 1024,
    keepalive_timeout: node['nginx']['keepalive_timeout'] || 65
  )
  notifies :reload, 'service[nginx]', :delayed
end

# Reverse proxy for the FastAPI application server
template '/etc/nginx/sites-available/app_proxy.conf' do
  source 'app_proxy.conf.erb'
  owner  'root'
  group  'root'
  mode   '0644'
  variables(
    server_name: node['nginx']['server_name'] || 'localhost',
    upstream_host: node['nginx']['upstream_host'] || '127.0.0.1',
    upstream_port: node['nginx']['upstream_port'] || 8000
  )
  notifies :reload, 'service[nginx]', :delayed
end

# Enable the site
link '/etc/nginx/sites-enabled/app_proxy.conf' do
  to '/etc/nginx/sites-available/app_proxy.conf'
  notifies :reload, 'service[nginx]', :delayed
end

# Remove default site
file '/etc/nginx/sites-enabled/default' do
  action :delete
  notifies :reload, 'service[nginx]', :delayed
end

# ── Log directory ────────────────────────────────────────

directory '/var/log/nginx' do
  owner 'www-data'
  group 'adm'
  mode  '0755'
  recursive true
end

# ── Service ──────────────────────────────────────────────

service 'nginx' do
  supports status: true, restart: true, reload: true
  action [:enable, :start]
end`
  },
  {
    name: 'postgresql',
    version: '1.0.0',
    description: 'Installs and configures PostgreSQL database server',
    path: 'chef/cookbooks/postgresql',
    recipes: ['default'],
    verified: true,
    language: 'ruby',
    filename: 'postgresql/recipes/default.rb',
    size_bytes: 2720,
    content: `#
# Cookbook:: postgresql
# Recipe:: default
#
# Installs PostgreSQL, creates the application database and user,
# and configures authentication.
#

pg_version = node['postgresql']['version'] || '15'
db_name    = node['postgresql']['db_name'] || 'deployment_tools'
db_user    = node['postgresql']['db_user'] || 'deploy'
db_pass    = node['postgresql']['db_password'] || 'changeme'

# ── Install ──────────────────────────────────────────────

%W[postgresql-#{pg_version} postgresql-client-#{pg_version} libpq-dev].each do |pkg|
  package pkg do
    action :install
  end
end

# ── Service ──────────────────────────────────────────────

service 'postgresql' do
  supports status: true, restart: true, reload: true
  action [:enable, :start]
end

# ── Configuration ────────────────────────────────────────

template "/etc/postgresql/#{pg_version}/main/pg_hba.conf" do
  source 'pg_hba.conf.erb'
  owner  'postgres'
  group  'postgres'
  mode   '0640'
  notifies :reload, 'service[postgresql]', :delayed
end

template "/etc/postgresql/#{pg_version}/main/postgresql.conf" do
  source 'postgresql.conf.erb'
  owner  'postgres'
  group  'postgres'
  mode   '0644'
  variables(
    listen_addresses: node['postgresql']['listen_addresses'] || 'localhost',
    max_connections: node['postgresql']['max_connections'] || 100,
    shared_buffers: node['postgresql']['shared_buffers'] || '128MB'
  )
  notifies :restart, 'service[postgresql]', :delayed
end

# ── Create Database User ────────────────────────────────

execute "create-pg-user-#{db_user}" do
  command "psql -c \\"CREATE ROLE #{db_user} WITH LOGIN PASSWORD '#{db_pass}';\\""
  user    'postgres'
  not_if  "psql -c \\"SELECT 1 FROM pg_roles WHERE rolname='#{db_user}'\\" | grep -q 1", user: 'postgres'
end

# ── Create Database ─────────────────────────────────────

execute "create-pg-database-#{db_name}" do
  command "createdb --owner=#{db_user} #{db_name}"
  user    'postgres'
  not_if  "psql -lqt | cut -d \\\\| -f 1 | grep -qw #{db_name}", user: 'postgres'
end

# ── Grant Privileges ────────────────────────────────────

execute "grant-all-on-#{db_name}" do
  command "psql -c \\"GRANT ALL PRIVILEGES ON DATABASE #{db_name} TO #{db_user};\\""
  user    'postgres'
end`
  }
];

export const STATIC_SALT_STATES = [
  {
    id: 'top',
    name: 'top.sls',
    version: '1.0.0',
    description: 'SaltStack Top File (Environment & Minion Mapping)',
    path: 'salt/states/top.sls',
    verified: true,
    size_bytes: 592,
    language: 'yaml',
    filename: 'top.sls',
    content: `# ============================================================
# Salt Stack — Top State File
# Maps minions to states based on roles and environments
# ============================================================

base:
  # All minions get base configuration
  '*':
    - common

  # Web servers
  'roles:webserver':
    - match: grain
    - nginx

  # Application servers
  'roles:appserver':
    - match: grain
    - app_server

  # Database servers
  'roles:database':
    - match: grain
    - postgresql

  # Monitoring servers
  'roles:monitoring':
    - match: grain
    - monitoring`
  },
  {
    id: 'common',
    name: 'common.sls',
    version: '1.0.0',
    description: 'Base packages, timezone, chrony NTP, UFW firewall, and sysctl tuning',
    path: 'salt/states/common.sls',
    verified: true,
    size_bytes: 2183,
    language: 'yaml',
    filename: 'common.sls',
    content: `# ============================================================
# Common State — Applied to ALL minions
# Base packages, timezone, NTP, firewall essentials
# ============================================================

# ── Base Packages ────────────────────────────────────────

common_packages:
  pkg.installed:
    - pkgs:
      - curl
      - wget
      - vim
      - htop
      - git
      - unzip
      - net-tools
      - ca-certificates

# ── Timezone ─────────────────────────────────────────────

set_timezone:
  timezone.system:
    - name: {{ pillar.get('common:timezone', 'UTC') }}

# ── NTP / Time Sync ─────────────────────────────────────

chrony_package:
  pkg.installed:
    - name: chrony

chrony_service:
  service.running:
    - name: chrony
    - enable: True
    - require:
      - pkg: chrony_package

# ── Firewall (UFW) ──────────────────────────────────────

ufw_package:
  pkg.installed:
    - name: ufw

ufw_default_deny:
  cmd.run:
    - name: ufw default deny incoming
    - unless: ufw status | grep -q "Default.*deny"
    - require:
      - pkg: ufw_package

ufw_allow_ssh:
  cmd.run:
    - name: ufw allow ssh
    - unless: ufw status | grep -q "22/tcp.*ALLOW"
    - require:
      - cmd: ufw_default_deny

ufw_enable:
  cmd.run:
    - name: echo "y" | ufw enable
    - unless: ufw status | grep -q "Status.*active"
    - require:
      - cmd: ufw_allow_ssh

# ── Sysctl Tuning ───────────────────────────────────────

net.core.somaxconn:
  sysctl.present:
    - value: 65535

vm.swappiness:
  sysctl.present:
    - value: 10

# ── Log Rotation ────────────────────────────────────────

logrotate_package:
  pkg.installed:
    - name: logrotate`
  },
  {
    id: 'nginx',
    name: 'nginx.sls',
    version: '1.0.0',
    description: 'Installs Nginx, configures reverse proxy, and enables service',
    path: 'salt/states/nginx.sls',
    verified: true,
    size_bytes: 2702,
    language: 'yaml',
    filename: 'nginx.sls',
    content: `# ============================================================
# Nginx Salt State
# Installs Nginx, configures reverse proxy, enables service
# ============================================================

nginx_install:
  pkg.installed:
    - name: nginx

# ── Main Configuration ───────────────────────────────────

nginx_config:
  file.managed:
    - name: /etc/nginx/nginx.conf
    - source: salt://nginx/files/nginx.conf
    - user: root
    - group: root
    - mode: '0644'
    - template: jinja
    - defaults:
        worker_processes: {{ pillar.get('nginx:worker_processes', 'auto') }}
        worker_connections: {{ pillar.get('nginx:worker_connections', 1024) }}
    - require:
      - pkg: nginx_install
    - watch_in:
      - service: nginx_service

# ── Reverse Proxy for App Server ─────────────────────────

nginx_proxy_config:
  file.managed:
    - name: /etc/nginx/sites-available/app_proxy.conf
    - source: salt://nginx/files/app_proxy.conf
    - user: root
    - group: root
    - mode: '0644'
    - template: jinja
    - defaults:
        server_name: {{ pillar.get('nginx:server_name', 'localhost') }}
        upstream_host: {{ pillar.get('nginx:upstream_host', '127.0.0.1') }}
        upstream_port: {{ pillar.get('nginx:upstream_port', 8000) }}
    - require:
      - pkg: nginx_install
    - watch_in:
      - service: nginx_service

nginx_proxy_enable:
  file.symlink:
    - name: /etc/nginx/sites-enabled/app_proxy.conf
    - target: /etc/nginx/sites-available/app_proxy.conf
    - require:
      - file: nginx_proxy_config

nginx_remove_default:
  file.absent:
    - name: /etc/nginx/sites-enabled/default

# ── Firewall ─────────────────────────────────────────────

nginx_firewall_http:
  cmd.run:
    - name: ufw allow 80/tcp
    - unless: ufw status | grep -q "80/tcp.*ALLOW"

nginx_firewall_https:
  cmd.run:
    - name: ufw allow 443/tcp
    - unless: ufw status | grep -q "443/tcp.*ALLOW"

# ── Log Directory ────────────────────────────────────────

nginx_log_dir:
  file.directory:
    - name: /var/log/nginx
    - user: www-data
    - group: adm
    - mode: '0755'

# ── Service ──────────────────────────────────────────────

nginx_service:
  service.running:
    - name: nginx
    - enable: True
    - reload: True
    - require:
      - pkg: nginx_install`
  },
  {
    id: 'app_server',
    name: 'app_server.sls',
    version: '1.0.0',
    description: 'FastAPI application daemon, Python 3 virtualenv, and systemd service',
    path: 'salt/states/app_server.sls',
    verified: true,
    size_bytes: 3439,
    language: 'yaml',
    filename: 'app_server.sls',
    content: `# ============================================================
# FastAPI App Server Salt State
# Deploys the application with Python virtualenv and systemd
# ============================================================

{% set app_user = pillar.get('app_server:user', 'deploy') %}
{% set app_dir = pillar.get('app_server:app_dir', '/opt/deployment-tools') %}
{% set venv_dir = app_dir ~ '/venv' %}
{% set app_port = pillar.get('app_server:port', 8000) %}

# ── System Dependencies ─────────────────────────────────

app_server_packages:
  pkg.installed:
    - pkgs:
      - python3
      - python3-pip
      - python3-venv
      - git
      - build-essential

# ── Application User ────────────────────────────────────

app_user:
  user.present:
    - name: {{ app_user }}
    - system: True
    - shell: /bin/bash
    - createhome: True

# ── Application Directory ───────────────────────────────

app_directory:
  file.directory:
    - name: {{ app_dir }}
    - user: {{ app_user }}
    - group: {{ app_user }}
    - mode: '0755'
    - makedirs: True

app_log_dir:
  file.directory:
    - name: {{ app_dir }}/logs
    - user: {{ app_user }}
    - group: {{ app_user }}
    - mode: '0755'

# ── Virtual Environment ─────────────────────────────────

create_virtualenv:
  cmd.run:
    - name: python3 -m venv {{ venv_dir }}
    - runas: {{ app_user }}
    - creates: {{ venv_dir }}/bin/activate
    - require:
      - file: app_directory
      - pkg: app_server_packages

# ── Install Python Dependencies ─────────────────────────

install_requirements:
  cmd.run:
    - name: {{ venv_dir }}/bin/pip install --upgrade pip && {{ venv_dir }}/bin/pip install -r {{ app_dir }}/backend/requirements.txt
    - runas: {{ app_user }}
    - cwd: {{ app_dir }}
    - onlyif: test -f {{ app_dir }}/backend/requirements.txt
    - require:
      - cmd: create_virtualenv

# ── Systemd Service ─────────────────────────────────────

app_server_service_file:
  file.managed:
    - name: /etc/systemd/system/deployment-tools.service
    - source: salt://app_server/files/deployment-tools.service
    - user: root
    - group: root
    - mode: '0644'
    - template: jinja
    - defaults:
        user: {{ app_user }}
        app_dir: {{ app_dir }}
        venv_dir: {{ venv_dir }}
        host: {{ pillar.get('app_server:host', '0.0.0.0') }}
        port: {{ app_port }}
        workers: {{ pillar.get('app_server:workers', 4) }}

systemd_reload_app:
  module.run:
    - name: service.systemctl_reload
    - onchanges:
      - file: app_server_service_file

app_server_service:
  service.running:
    - name: deployment-tools
    - enable: True
    - require:
      - file: app_server_service_file
    - watch:
      - file: app_server_service_file

# ── Firewall ─────────────────────────────────────────────

app_server_firewall:
  cmd.run:
    - name: ufw allow {{ app_port }}/tcp
    - unless: ufw status | grep -q "{{ app_port }}/tcp.*ALLOW"`
  },
  {
    id: 'postgresql',
    name: 'postgresql.sls',
    version: '1.0.0',
    description: 'PostgreSQL 15 database provisioning, roles, and pg_hba.conf tuning',
    path: 'salt/states/postgresql.sls',
    verified: true,
    size_bytes: 3526,
    language: 'yaml',
    filename: 'postgresql.sls',
    content: `# ============================================================
# PostgreSQL Salt State
# Installs PostgreSQL, creates database and user, configures auth
# ============================================================

{% set pg_version = pillar.get('postgresql:version', '15') %}
{% set db_name = pillar.get('postgresql:db_name', 'deployment_tools') %}
{% set db_user = pillar.get('postgresql:db_user', 'deploy') %}
{% set db_password = pillar.get('postgresql:db_password', 'changeme') %}

# ── Install ──────────────────────────────────────────────

postgresql_packages:
  pkg.installed:
    - pkgs:
      - postgresql-{{ pg_version }}
      - postgresql-client-{{ pg_version }}
      - libpq-dev
      - python3-psycopg2

# ── Service ──────────────────────────────────────────────

postgresql_service:
  service.running:
    - name: postgresql
    - enable: True
    - require:
      - pkg: postgresql_packages

# ── Configuration ────────────────────────────────────────

pg_hba_conf:
  file.managed:
    - name: /etc/postgresql/{{ pg_version }}/main/pg_hba.conf
    - source: salt://postgresql/files/pg_hba.conf
    - user: postgres
    - group: postgres
    - mode: '0640'
    - template: jinja
    - require:
      - pkg: postgresql_packages
    - watch_in:
      - service: postgresql_service

postgresql_conf:
  file.managed:
    - name: /etc/postgresql/{{ pg_version }}/main/postgresql.conf
    - source: salt://postgresql/files/postgresql.conf
    - user: postgres
    - group: postgres
    - mode: '0644'
    - template: jinja
    - defaults:
        listen_addresses: {{ pillar.get('postgresql:listen_addresses', 'localhost') }}
        max_connections: {{ pillar.get('postgresql:max_connections', 100) }}
        shared_buffers: {{ pillar.get('postgresql:shared_buffers', '128MB') }}
    - require:
      - pkg: postgresql_packages
    - watch_in:
      - service: postgresql_service

# ── Create Database User ────────────────────────────────

create_db_user:
  cmd.run:
    - name: psql -c "CREATE ROLE {{ db_user }} WITH LOGIN PASSWORD '{{ db_password }}';"
    - runas: postgres
    - unless: psql -c "SELECT 1 FROM pg_roles WHERE rolname='{{ db_user }}'" | grep -q 1
    - require:
      - service: postgresql_service

# ── Create Database ─────────────────────────────────────

create_database:
  cmd.run:
    - name: createdb --owner={{ db_user }} {{ db_name }}
    - runas: postgres
    - unless: psql -lqt | cut -d \\| -f 1 | grep -qw {{ db_name }}
    - require:
      - cmd: create_db_user

# ── Grant Privileges ────────────────────────────────────

grant_privileges:
  cmd.run:
    - name: psql -c "GRANT ALL PRIVILEGES ON DATABASE {{ db_name }} TO {{ db_user }};"
    - runas: postgres
    - require:
      - cmd: create_database

# ── Firewall ─────────────────────────────────────────────

postgresql_firewall:
  cmd.run:
    - name: ufw allow 5432/tcp
    - unless: ufw status | grep -q "5432/tcp.*ALLOW"`
  },
  {
    id: 'monitoring',
    name: 'monitoring.sls',
    version: '1.0.0',
    description: 'Prometheus telemetry server and Node Exporter monitoring agent',
    path: 'salt/states/monitoring.sls',
    verified: true,
    size_bytes: 4683,
    language: 'yaml',
    filename: 'monitoring.sls',
    content: `# ============================================================
# Monitoring Salt State (Prometheus + Node Exporter)
# ============================================================

{% set prometheus_version = pillar.get('monitoring:prometheus_version', '2.48.0') %}
{% set node_exporter_version = pillar.get('monitoring:node_exporter_version', '1.7.0') %}
{% set prometheus_user = 'prometheus' %}

# ── System User ──────────────────────────────────────────

prometheus_user:
  user.present:
    - name: {{ prometheus_user }}
    - system: True
    - shell: /usr/sbin/nologin
    - createhome: False

# ── Directories ──────────────────────────────────────────

{% for dir in ['/etc/prometheus', '/var/lib/prometheus', '/opt/prometheus'] %}
prometheus_dir_{{ loop.index }}:
  file.directory:
    - name: {{ dir }}
    - user: {{ prometheus_user }}
    - group: {{ prometheus_user }}
    - mode: '0755'
    - makedirs: True
{% endfor %}

# ── Prometheus Install ───────────────────────────────────

download_prometheus:
  archive.extracted:
    - name: /opt/prometheus
    - source: https://github.com/prometheus/prometheus/releases/download/v{{ prometheus_version }}/prometheus-{{ prometheus_version }}.linux-amd64.tar.gz
    - skip_verify: True
    - options: --strip-components=1
    - if_missing: /opt/prometheus/prometheus

prometheus_bin_link:
  file.symlink:
    - name: /usr/local/bin/prometheus
    - target: /opt/prometheus/prometheus

promtool_bin_link:
  file.symlink:
    - name: /usr/local/bin/promtool
    - target: /opt/prometheus/promtool

# ── Prometheus Configuration ─────────────────────────────

prometheus_config:
  file.managed:
    - name: /etc/prometheus/prometheus.yml
    - source: salt://monitoring/files/prometheus.yml
    - user: {{ prometheus_user }}
    - group: {{ prometheus_user }}
    - mode: '0644'
    - template: jinja
    - defaults:
        scrape_interval: {{ pillar.get('monitoring:scrape_interval', '15s') }}
        app_host: {{ pillar.get('monitoring:app_host', 'localhost') }}
        app_port: {{ pillar.get('monitoring:app_port', 8000) }}
    - watch_in:
      - service: prometheus_service

# ── Prometheus Systemd Service ───────────────────────────

prometheus_service_file:
  file.managed:
    - name: /etc/systemd/system/prometheus.service
    - source: salt://monitoring/files/prometheus.service
    - user: root
    - group: root
    - mode: '0644'
    - template: jinja
    - defaults:
        user: {{ prometheus_user }}

prometheus_systemd_reload:
  module.run:
    - name: service.systemctl_reload
    - onchanges:
      - file: prometheus_service_file

prometheus_service:
  service.running:
    - name: prometheus
    - enable: True
    - require:
      - file: prometheus_service_file

# ── Node Exporter Install ────────────────────────────────

download_node_exporter:
  archive.extracted:
    - name: /opt/prometheus
    - source: https://github.com/prometheus/node_exporter/releases/download/v{{ node_exporter_version }}/node_exporter-{{ node_exporter_version }}.linux-amd64.tar.gz
    - skip_verify: True
    - options: --strip-components=1
    - if_missing: /opt/prometheus/node_exporter

node_exporter_bin_link:
  file.symlink:
    - name: /usr/local/bin/node_exporter
    - target: /opt/prometheus/node_exporter

node_exporter_service_file:
  file.managed:
    - name: /etc/systemd/system/node_exporter.service
    - source: salt://monitoring/files/node_exporter.service
    - user: root
    - group: root
    - mode: '0644'
    - template: jinja
    - defaults:
        user: {{ prometheus_user }}

node_exporter_systemd_reload:
  module.run:
    - name: service.systemctl_reload
    - onchanges:
      - file: node_exporter_service_file

node_exporter_service:
  service.running:
    - name: node_exporter
    - enable: True
    - require:
      - file: node_exporter_service_file

# ── Firewall ─────────────────────────────────────────────

prometheus_firewall:
  cmd.run:
    - name: ufw allow 9090/tcp
    - unless: ufw status | grep -q "9090/tcp.*ALLOW"

node_exporter_firewall:
  cmd.run:
    - name: ufw allow 9100/tcp
    - unless: ufw status | grep -q "9100/tcp.*ALLOW"`
  }
];

export function getStaticCookbook(name) {
  return STATIC_CHEF_COOKBOOKS.find((cb) => cb.name === name) || STATIC_CHEF_COOKBOOKS[0];
}

export function getStaticCookbookContent(cookbookName, recipe = 'default') {
  const cb = getStaticCookbook(cookbookName);
  return {
    filename: `${cookbookName}/recipes/${recipe}.rb`,
    path: cb.path,
    language: 'ruby',
    version: cb.version,
    size_bytes: cb.size_bytes,
    content: cb.content
  };
}

export function getStaticSaltState(id) {
  return STATIC_SALT_STATES.find((st) => st.id === id) || STATIC_SALT_STATES[0];
}

export function getStaticSaltStateContent(stateId) {
  const st = getStaticSaltState(stateId);
  return {
    filename: `${stateId}.sls`,
    path: st.path,
    language: 'yaml',
    version: '1.0.0',
    size_bytes: st.size_bytes,
    content: st.content
  };
}
