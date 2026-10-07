# ============================================================
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
    - monitoring
