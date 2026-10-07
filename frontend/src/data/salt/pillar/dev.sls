# Development Environment Overrides
nginx:
  server_name: dev.local

app_server:
  workers: 1

postgresql:
  db_name: deployment_tools_dev
  shared_buffers: 64MB
