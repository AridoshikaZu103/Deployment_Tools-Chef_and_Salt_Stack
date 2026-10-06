# Production Environment Overrides
nginx:
  worker_processes: 8
  worker_connections: 4096
  server_name: app.production.company.com

app_server:
  workers: 8

postgresql:
  db_name: deployment_tools_prod
  max_connections: 300
  shared_buffers: 2GB
  listen_addresses: '*'

monitoring:
  scrape_interval: 10s
