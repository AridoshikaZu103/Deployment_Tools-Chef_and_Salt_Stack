#
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
  command "psql -c \"CREATE ROLE #{db_user} WITH LOGIN PASSWORD '#{db_pass}';\""
  user    'postgres'
  not_if  "psql -c \"SELECT 1 FROM pg_roles WHERE rolname='#{db_user}'\" | grep -q 1", user: 'postgres'
end

# ── Create Database ─────────────────────────────────────

execute "create-pg-database-#{db_name}" do
  command "createdb --owner=#{db_user} #{db_name}"
  user    'postgres'
  not_if  "psql -lqt | cut -d \\| -f 1 | grep -qw #{db_name}", user: 'postgres'
end

# ── Grant Privileges ────────────────────────────────────

execute "grant-all-on-#{db_name}" do
  command "psql -c \"GRANT ALL PRIVILEGES ON DATABASE #{db_name} TO #{db_user};\""
  user    'postgres'
end
