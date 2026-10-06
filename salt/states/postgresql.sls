# ============================================================
# PostgreSQL Salt State
# Installs PostgreSQL, creates database and user, configures auth
# ============================================================

{% set pg_version = pillar.get('postgresql:version', '15') %}
{% set db_name = pillar.get('postgresql:db_name', 'deployment_tools') %}
{% set db_user = pillar.get('postgresql:db_user', 'deploy') %}
{% set db_password = pillar.get('postgresql:db_password', 'changeme') %}

# ── Install ──────────────────────────────────────────────

postgresql_packages:
  pkg.installed:
    - pkgs:
      - postgresql-{{ pg_version }}
      - postgresql-client-{{ pg_version }}
      - libpq-dev
      - python3-psycopg2

# ── Service ──────────────────────────────────────────────

postgresql_service:
  service.running:
    - name: postgresql
    - enable: True
    - require:
      - pkg: postgresql_packages

# ── Configuration ────────────────────────────────────────

pg_hba_conf:
  file.managed:
    - name: /etc/postgresql/{{ pg_version }}/main/pg_hba.conf
    - source: salt://postgresql/files/pg_hba.conf
    - user: postgres
    - group: postgres
    - mode: '0640'
    - template: jinja
    - require:
      - pkg: postgresql_packages
    - watch_in:
      - service: postgresql_service

postgresql_conf:
  file.managed:
    - name: /etc/postgresql/{{ pg_version }}/main/postgresql.conf
    - source: salt://postgresql/files/postgresql.conf
    - user: postgres
    - group: postgres
    - mode: '0644'
    - template: jinja
    - defaults:
        listen_addresses: {{ pillar.get('postgresql:listen_addresses', 'localhost') }}
        max_connections: {{ pillar.get('postgresql:max_connections', 100) }}
        shared_buffers: {{ pillar.get('postgresql:shared_buffers', '128MB') }}
    - require:
      - pkg: postgresql_packages
    - watch_in:
      - service: postgresql_service

# ── Create Database User ────────────────────────────────

create_db_user:
  cmd.run:
    - name: psql -c "CREATE ROLE {{ db_user }} WITH LOGIN PASSWORD '{{ db_password }}';"
    - runas: postgres
    - unless: psql -c "SELECT 1 FROM pg_roles WHERE rolname='{{ db_user }}'" | grep -q 1
    - require:
      - service: postgresql_service

# ── Create Database ─────────────────────────────────────

create_database:
  cmd.run:
    - name: createdb --owner={{ db_user }} {{ db_name }}
    - runas: postgres
    - unless: psql -lqt | cut -d \| -f 1 | grep -qw {{ db_name }}
    - require:
      - cmd: create_db_user

# ── Grant Privileges ────────────────────────────────────

grant_privileges:
  cmd.run:
    - name: psql -c "GRANT ALL PRIVILEGES ON DATABASE {{ db_name }} TO {{ db_user }};"
    - runas: postgres
    - require:
      - cmd: create_database

# ── Firewall ─────────────────────────────────────────────

postgresql_firewall:
  cmd.run:
    - name: ufw allow 5432/tcp
    - unless: ufw status | grep -q "5432/tcp.*ALLOW"
