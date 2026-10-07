# PostgreSQL default attributes
default['postgresql']['version']          = '15'
default['postgresql']['db_name']          = 'deployment_tools'
default['postgresql']['db_user']          = 'deploy'
default['postgresql']['db_password']      = 'changeme'
default['postgresql']['listen_addresses'] = 'localhost'
default['postgresql']['max_connections']  = 100
default['postgresql']['shared_buffers']   = '128MB'
