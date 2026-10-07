/**
 * Bundled Server Inventory - Single Source of Truth
 * All nodes across Production, Staging, and Development.
 */

export const BUNDLED_SERVERS = [
  {
    id: 1,
    hostname: "prod-web-01",
    ip_address: "192.168.10.11",
    fqdn: "web01.production.internal",
    environment: "production",
    role: "webserver",
    os_family: "Ubuntu 22.04 LTS",
    managed_by: "chef",
    is_active: true,
    health_status: "healthy",
    last_health_check: "2026-10-06T15:26:46.313Z",
    chef_node_name: "prod-web-01.node",
    salt_minion_id: null
  },
  {
    id: 2,
    hostname: "prod-app-01",
    ip_address: "192.168.10.21",
    fqdn: "app01.production.internal",
    environment: "production",
    role: "appserver",
    os_family: "Ubuntu 22.04 LTS",
    managed_by: "both",
    is_active: true,
    health_status: "healthy",
    last_health_check: "2026-10-06T15:26:46.313Z",
    chef_node_name: "prod-app-01.node",
    salt_minion_id: "minion-prod-app-01"
  },
  {
    id: 3,
    hostname: "prod-db-01",
    ip_address: "192.168.10.31",
    fqdn: "db01.production.internal",
    environment: "production",
    role: "database",
    os_family: "Debian 12",
    managed_by: "salt",
    is_active: true,
    health_status: "healthy",
    last_health_check: "2026-10-06T15:26:46.100Z",
    chef_node_name: null,
    salt_minion_id: "minion-prod-db-01"
  },
  {
    id: 4,
    hostname: "prod-mon-01",
    ip_address: "192.168.10.41",
    fqdn: "mon01.production.internal",
    environment: "production",
    role: "monitoring",
    os_family: "Ubuntu 22.04 LTS",
    managed_by: "salt",
    is_active: true,
    health_status: "healthy",
    last_health_check: "2026-10-06T15:26:46.313Z",
    chef_node_name: null,
    salt_minion_id: "minion-prod-mon-01"
  },
  {
    id: 5,
    hostname: "stg-app-01",
    ip_address: "192.168.20.21",
    fqdn: "app01.staging.internal",
    environment: "staging",
    role: "appserver",
    os_family: "Ubuntu 22.04 LTS",
    managed_by: "both",
    is_active: true,
    health_status: "degraded",
    last_health_check: "2026-10-06T15:21:46.000Z",
    chef_node_name: "stg-app-01.node",
    salt_minion_id: "minion-stg-app-01"
  },
  {
    id: 6,
    hostname: "dev-all-in-one",
    ip_address: "127.0.0.1",
    fqdn: "dev-box.local",
    environment: "development",
    role: "appserver",
    os_family: "Debian 12 / Docker",
    managed_by: "both",
    is_active: true,
    health_status: "healthy",
    last_health_check: "2026-10-06T15:26:44.494Z",
    chef_node_name: "local-dev.node",
    salt_minion_id: "local-dev-minion"
  }
];

export function normalizeServer(s) {
  if (!s || typeof s !== 'object') {
    return {
      id: Math.random(),
      hostname: '—',
      ip_address: '—',
      fqdn: '—',
      role: '—',
      environment: '—',
      managed_by: 'both',
      os: '—',
      os_family: '—',
      health: 'healthy',
      health_status: 'healthy',
      last_health_check: new Date().toISOString(),
      last_checked: new Date().toISOString(),
      is_active: true
    };
  }

  // Handle managed_by variations: 'chef', 'salt', 'both'
  const rawManaged = (s.managed_by || s.tool || s.engine || '').toLowerCase().trim();
  let managed_by = 'both';
  if (rawManaged === 'chef') managed_by = 'chef';
  else if (rawManaged === 'salt') managed_by = 'salt';

  // Normalize health status
  const rawHealth = (s.health_status || s.health || 'healthy').toLowerCase().trim();
  const health_status = rawHealth === 'ok' || rawHealth === 'pass' ? 'healthy' : rawHealth;

  // Resolve ISO date string safely
  let last_checked = s.last_health_check || s.last_checked || s.checked_at;
  if (!last_checked || last_checked === 'Just now' || typeof last_checked !== 'string') {
    last_checked = new Date().toISOString();
  }

  const roleVal = s.role && s.role !== '—' ? s.role : '—';
  const envVal = s.environment || s.env || '—';
  const osVal = s.os_family || s.os || s.os_details || '—';

  return {
    ...s,
    id: s.id ?? s.hostname ?? Math.floor(Math.random() * 10000),
    hostname: s.hostname || s.name || '—',
    ip_address: s.ip_address || s.ip || '—',
    fqdn: s.fqdn || (s.hostname && s.hostname !== '—' ? `${s.hostname}.internal` : '—'),
    role: roleVal,
    environment: envVal,
    managed_by: managed_by,
    os_family: osVal,
    os: osVal,
    health_status: health_status,
    health: health_status,
    last_health_check: last_checked,
    last_checked: last_checked,
    is_active: s.is_active !== undefined ? Boolean(s.is_active) : true,
    chef_node_name: s.chef_node_name || null,
    salt_minion_id: s.salt_minion_id || null
  };
}
