# ============================================================
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
      - pkg: nginx_install
