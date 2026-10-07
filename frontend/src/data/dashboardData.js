/**
 * Bundled Dashboard Stats & Monitored Services
 */

export const BUNDLED_INFRA_SERVICES = [
  { name: 'Nginx Reverse Proxy', role: 'Web Tier', engine: 'Chef + Salt', port: '80 / 443', status: 'Healthy' },
  { name: 'FastAPI App Server', role: 'Application', engine: 'Chef + Salt', port: '8000', status: 'Healthy' },
  { name: 'PostgreSQL 15', role: 'Database', engine: 'SaltStack', port: '5432', status: 'Healthy' },
  { name: 'Prometheus & Node Exporter', role: 'Monitoring', engine: 'Chef + Salt', port: '9090 / 9100', status: 'Healthy' },
];

export const BUNDLED_DASHBOARD_STATS = {
  activeDeployments: 1,
  totalDeployments: 3,
  healthyServers: 5,
  totalServers: 6,
  successRate: 100,
  chefAvailable: true,
  saltAvailable: true
};
