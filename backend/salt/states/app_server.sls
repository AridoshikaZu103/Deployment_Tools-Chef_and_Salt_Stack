# ============================================================
# FastAPI App Server Salt State
# Deploys the application with Python virtualenv and systemd
# ============================================================

{% set app_user = pillar.get('app_server:user', 'deploy') %}
{% set app_dir = pillar.get('app_server:app_dir', '/opt/deployment-tools') %}
{% set venv_dir = app_dir ~ '/venv' %}
{% set app_port = pillar.get('app_server:port', 8000) %}

# ── System Dependencies ─────────────────────────────────

app_server_packages:
  pkg.installed:
    - pkgs:
      - python3
      - python3-pip
      - python3-venv
      - git
      - build-essential

# ── Application User ────────────────────────────────────

app_user:
  user.present:
    - name: {{ app_user }}
    - system: True
    - shell: /bin/bash
    - createhome: True

# ── Application Directory ───────────────────────────────

app_directory:
  file.directory:
    - name: {{ app_dir }}
    - user: {{ app_user }}
    - group: {{ app_user }}
    - mode: '0755'
    - makedirs: True

app_log_dir:
  file.directory:
    - name: {{ app_dir }}/logs
    - user: {{ app_user }}
    - group: {{ app_user }}
    - mode: '0755'

# ── Virtual Environment ─────────────────────────────────

create_virtualenv:
  cmd.run:
    - name: python3 -m venv {{ venv_dir }}
    - runas: {{ app_user }}
    - creates: {{ venv_dir }}/bin/activate
    - require:
      - file: app_directory
      - pkg: app_server_packages

# ── Install Python Dependencies ─────────────────────────

install_requirements:
  cmd.run:
    - name: {{ venv_dir }}/bin/pip install --upgrade pip && {{ venv_dir }}/bin/pip install -r {{ app_dir }}/backend/requirements.txt
    - runas: {{ app_user }}
    - cwd: {{ app_dir }}
    - onlyif: test -f {{ app_dir }}/backend/requirements.txt
    - require:
      - cmd: create_virtualenv

# ── Systemd Service ─────────────────────────────────────

app_server_service_file:
  file.managed:
    - name: /etc/systemd/system/deployment-tools.service
    - source: salt://app_server/files/deployment-tools.service
    - user: root
    - group: root
    - mode: '0644'
    - template: jinja
    - defaults:
        user: {{ app_user }}
        app_dir: {{ app_dir }}
        venv_dir: {{ venv_dir }}
        host: {{ pillar.get('app_server:host', '0.0.0.0') }}
        port: {{ app_port }}
        workers: {{ pillar.get('app_server:workers', 4) }}

systemd_reload_app:
  module.run:
    - name: service.systemctl_reload
    - onchanges:
      - file: app_server_service_file

app_server_service:
  service.running:
    - name: deployment-tools
    - enable: True
    - require:
      - file: app_server_service_file
    - watch:
      - file: app_server_service_file

# ── Firewall ─────────────────────────────────────────────

app_server_firewall:
  cmd.run:
    - name: ufw allow {{ app_port }}/tcp
    - unless: ufw status | grep -q "{{ app_port }}/tcp.*ALLOW"
