# Nginx default attributes
default['nginx']['worker_processes']  = 'auto'
default['nginx']['worker_connections'] = 1024
default['nginx']['keepalive_timeout']  = 65
default['nginx']['server_name']        = 'localhost'
default['nginx']['upstream_host']      = '127.0.0.1'
default['nginx']['upstream_port']      = 8000
