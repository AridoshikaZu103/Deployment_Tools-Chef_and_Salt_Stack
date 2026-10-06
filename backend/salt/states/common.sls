# ============================================================
# Common State — Applied to ALL minions
# Base packages, timezone, NTP, firewall essentials
# ============================================================

# ── Base Packages ────────────────────────────────────────

common_packages:
  pkg.installed:
    - pkgs:
      - curl
      - wget
      - vim
      - htop
      - git
      - unzip
      - net-tools
      - ca-certificates

# ── Timezone ─────────────────────────────────────────────

set_timezone:
  timezone.system:
    - name: {{ pillar.get('common:timezone', 'UTC') }}

# ── NTP / Time Sync ─────────────────────────────────────

chrony_package:
  pkg.installed:
    - name: chrony

chrony_service:
  service.running:
    - name: chrony
    - enable: True
    - require:
      - pkg: chrony_package

# ── Firewall (UFW) ──────────────────────────────────────

ufw_package:
  pkg.installed:
    - name: ufw

ufw_default_deny:
  cmd.run:
    - name: ufw default deny incoming
    - unless: ufw status | grep -q "Default.*deny"
    - require:
      - pkg: ufw_package

ufw_allow_ssh:
  cmd.run:
    - name: ufw allow ssh
    - unless: ufw status | grep -q "22/tcp.*ALLOW"
    - require:
      - cmd: ufw_default_deny

ufw_enable:
  cmd.run:
    - name: echo "y" | ufw enable
    - unless: ufw status | grep -q "Status.*active"
    - require:
      - cmd: ufw_allow_ssh

# ── Sysctl Tuning ───────────────────────────────────────

net.core.somaxconn:
  sysctl.present:
    - value: 65535

vm.swappiness:
  sysctl.present:
    - value: 10

# ── Log Rotation ────────────────────────────────────────

logrotate_package:
  pkg.installed:
    - name: logrotate
