#
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
end
