#
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
end
