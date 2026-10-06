# ============================================================
# Monitoring Salt State (Prometheus + Node Exporter)
# ============================================================

{% set prometheus_version = pillar.get('monitoring:prometheus_version', '2.48.0') %}
{% set node_exporter_version = pillar.get('monitoring:node_exporter_version', '1.7.0') %}
{% set prometheus_user = 'prometheus' %}

# ── System User ──────────────────────────────────────────

prometheus_user:
  user.present:
    - name: {{ prometheus_user }}
    - system: True
    - shell: /usr/sbin/nologin
    - createhome: False

# ── Directories ──────────────────────────────────────────

{% for dir in ['/etc/prometheus', '/var/lib/prometheus', '/opt/prometheus'] %}
prometheus_dir_{{ loop.index }}:
  file.directory:
    - name: {{ dir }}
    - user: {{ prometheus_user }}
    - group: {{ prometheus_user }}
    - mode: '0755'
    - makedirs: True
{% endfor %}

# ── Prometheus Install ───────────────────────────────────

download_prometheus:
  archive.extracted:
    - name: /opt/prometheus
    - source: https://github.com/prometheus/prometheus/releases/download/v{{ prometheus_version }}/prometheus-{{ prometheus_version }}.linux-amd64.tar.gz
    - skip_verify: True
    - options: --strip-components=1
    - if_missing: /opt/prometheus/prometheus

prometheus_bin_link:
  file.symlink:
    - name: /usr/local/bin/prometheus
    - target: /opt/prometheus/prometheus

promtool_bin_link:
  file.symlink:
    - name: /usr/local/bin/promtool
    - target: /opt/prometheus/promtool

# ── Prometheus Configuration ─────────────────────────────

prometheus_config:
  file.managed:
    - name: /etc/prometheus/prometheus.yml
    - source: salt://monitoring/files/prometheus.yml
    - user: {{ prometheus_user }}
    - group: {{ prometheus_user }}
    - mode: '0644'
    - template: jinja
    - defaults:
        scrape_interval: {{ pillar.get('monitoring:scrape_interval', '15s') }}
        app_host: {{ pillar.get('monitoring:app_host', 'localhost') }}
        app_port: {{ pillar.get('monitoring:app_port', 8000) }}
    - watch_in:
      - service: prometheus_service

# ── Prometheus Systemd Service ───────────────────────────

prometheus_service_file:
  file.managed:
    - name: /etc/systemd/system/prometheus.service
    - source: salt://monitoring/files/prometheus.service
    - user: root
    - group: root
    - mode: '0644'
    - template: jinja
    - defaults:
        user: {{ prometheus_user }}

prometheus_systemd_reload:
  module.run:
    - name: service.systemctl_reload
    - onchanges:
      - file: prometheus_service_file

prometheus_service:
  service.running:
    - name: prometheus
    - enable: True
    - require:
      - file: prometheus_service_file

# ── Node Exporter Install ────────────────────────────────

download_node_exporter:
  archive.extracted:
    - name: /opt/prometheus
    - source: https://github.com/prometheus/node_exporter/releases/download/v{{ node_exporter_version }}/node_exporter-{{ node_exporter_version }}.linux-amd64.tar.gz
    - skip_verify: True
    - options: --strip-components=1
    - if_missing: /opt/prometheus/node_exporter

node_exporter_bin_link:
  file.symlink:
    - name: /usr/local/bin/node_exporter
    - target: /opt/prometheus/node_exporter

node_exporter_service_file:
  file.managed:
    - name: /etc/systemd/system/node_exporter.service
    - source: salt://monitoring/files/node_exporter.service
    - user: root
    - group: root
    - mode: '0644'
    - template: jinja
    - defaults:
        user: {{ prometheus_user }}

node_exporter_systemd_reload:
  module.run:
    - name: service.systemctl_reload
    - onchanges:
      - file: node_exporter_service_file

node_exporter_service:
  service.running:
    - name: node_exporter
    - enable: True
    - require:
      - file: node_exporter_service_file

# ── Firewall ─────────────────────────────────────────────

prometheus_firewall:
  cmd.run:
    - name: ufw allow 9090/tcp
    - unless: ufw status | grep -q "9090/tcp.*ALLOW"

node_exporter_firewall:
  cmd.run:
    - name: ufw allow 9100/tcp
    - unless: ufw status | grep -q "9100/tcp.*ALLOW"
