# Base pillar defaults for all minions
common:
  timezone: UTC
  admin_email: devops@example.com

nginx:
  worker_processes: auto
  worker_connections: 1024
  server_name: localhost
  upstream_host: 127.0.0.1
  upstream_port: 8000

app_server:
  user: deploy
  app_dir: /opt/deployment-tools
  host: 0.0.0.0
  port: 8000
  workers: 4

postgresql:
  version: '15'
  db_name: deployment_tools
  db_user: deploy
  db_password: 'ChangeMeInPillarSecret!'
  listen_addresses: 'localhost'
  max_connections: 100
  shared_buffers: 128MB

monitoring:
  prometheus_version: '2.48.0'
  node_exporter_version: '1.7.0'
  scrape_interval: 15s
  app_host: localhost
  app_port: 8000
