/**
 * Bundled Static Data for Chef Cookbooks & SaltStack States.
 * Powered by Vite's import.meta.glob with '?raw' eager imports
 * to ensure 100% parity between Localhost and Vercel without requiring a local backend.
 */

// Eagerly bundle all real .rb recipe files
const rawChefFiles = import.meta.glob('./chef/**/*.rb', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// Eagerly bundle all real .sls state files
const rawSaltFiles = import.meta.glob('./salt/**/*.sls', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function getBundledChefContent(cookbookName, recipe = 'default') {
  const exactKey = `./chef/cookbooks/${cookbookName}/recipes/${recipe}.rb`;
  if (rawChefFiles[exactKey]) return rawChefFiles[exactKey];
  for (const [path, content] of Object.entries(rawChefFiles)) {
    if (path.includes(cookbookName) && path.endsWith(`${recipe}.rb`)) {
      return content;
    }
  }
  return `# Cookbook:: ${cookbookName}\n# Recipe:: ${recipe}\npackage '${cookbookName}' do\n  action :install\nend\n`;
}

function getBundledSaltContent(stateId) {
  const exactKey = `./salt/states/${stateId}.sls`;
  if (rawSaltFiles[exactKey]) return rawSaltFiles[exactKey];
  for (const [path, content] of Object.entries(rawSaltFiles)) {
    if (path.includes(`${stateId}.sls`)) {
      return content;
    }
  }
  return `# Salt State: ${stateId}\n${stateId}_pkg:\n  pkg.installed:\n    - name: ${stateId}\n`;
}

export const STATIC_CHEF_COOKBOOKS = [
  {
    name: 'app_server',
    version: '1.0.0',
    description: 'Deploys the FastAPI application server with systemd',
    path: 'chef/cookbooks/app_server',
    recipes: ['default'],
    verified: true,
    language: 'ruby',
    filename: 'app_server/recipes/default.rb',
    get size_bytes() {
      return new TextEncoder().encode(this.content).length;
    },
    get content() {
      return getBundledChefContent('app_server', 'default');
    }
  },
  {
    name: 'monitoring',
    version: '1.0.0',
    description: 'Installs Prometheus and Node Exporter for system monitoring',
    path: 'chef/cookbooks/monitoring',
    recipes: ['default'],
    verified: true,
    language: 'ruby',
    filename: 'monitoring/recipes/default.rb',
    get size_bytes() {
      return new TextEncoder().encode(this.content).length;
    },
    get content() {
      return getBundledChefContent('monitoring', 'default');
    }
  },
  {
    name: 'nginx',
    version: '1.0.0',
    description: 'Installs and configures Nginx as a reverse proxy',
    path: 'chef/cookbooks/nginx',
    recipes: ['default'],
    verified: true,
    language: 'ruby',
    filename: 'nginx/recipes/default.rb',
    get size_bytes() {
      return new TextEncoder().encode(this.content).length;
    },
    get content() {
      return getBundledChefContent('nginx', 'default');
    }
  },
  {
    name: 'postgresql',
    version: '1.0.0',
    description: 'Installs PostgreSQL 15, creates database and users',
    path: 'chef/cookbooks/postgresql',
    recipes: ['default'],
    verified: true,
    language: 'ruby',
    filename: 'postgresql/recipes/default.rb',
    get size_bytes() {
      return new TextEncoder().encode(this.content).length;
    },
    get content() {
      return getBundledChefContent('postgresql', 'default');
    }
  }
];

export const STATIC_SALT_STATES = [
  {
    id: 'top',
    name: 'top.sls',
    description: 'Highstate entry point mapping minions to state trees based on grains',
    path: 'salt/states/top.sls',
    verified: true,
    language: 'yaml',
    filename: 'top.sls',
    get size_bytes() {
      return new TextEncoder().encode(this.content).length;
    },
    get content() {
      return getBundledSaltContent('top');
    }
  },
  {
    id: 'common',
    name: 'common.sls',
    description: 'Base system configuration: packages, NTP, UFW firewall, and sysctl tuning',
    path: 'salt/states/common.sls',
    verified: true,
    language: 'yaml',
    filename: 'common.sls',
    get size_bytes() {
      return new TextEncoder().encode(this.content).length;
    },
    get content() {
      return getBundledSaltContent('common');
    }
  },
  {
    id: 'nginx',
    name: 'nginx.sls',
    description: 'Installs Nginx, manages vhosts, enables firewall ports, and reloads service',
    path: 'salt/states/nginx.sls',
    verified: true,
    language: 'yaml',
    filename: 'nginx.sls',
    get size_bytes() {
      return new TextEncoder().encode(this.content).length;
    },
    get content() {
      return getBundledSaltContent('nginx');
    }
  },
  {
    id: 'app_server',
    name: 'app_server.sls',
    description: 'FastAPI server deployment: virtualenv, pip install, systemd unit, and UFW',
    path: 'salt/states/app_server.sls',
    verified: true,
    language: 'yaml',
    filename: 'app_server.sls',
    get size_bytes() {
      return new TextEncoder().encode(this.content).length;
    },
    get content() {
      return getBundledSaltContent('app_server');
    }
  },
  {
    id: 'postgresql',
    name: 'postgresql.sls',
    description: 'PostgreSQL 15 installation, database/role creation, and pg_hba auth setup',
    path: 'salt/states/postgresql.sls',
    verified: true,
    language: 'yaml',
    filename: 'postgresql.sls',
    get size_bytes() {
      return new TextEncoder().encode(this.content).length;
    },
    get content() {
      return getBundledSaltContent('postgresql');
    }
  },
  {
    id: 'monitoring',
    name: 'monitoring.sls',
    description: 'Deploys Prometheus server, Node Exporter, and systemd service units',
    path: 'salt/states/monitoring.sls',
    verified: true,
    language: 'yaml',
    filename: 'monitoring.sls',
    get size_bytes() {
      return new TextEncoder().encode(this.content).length;
    },
    get content() {
      return getBundledSaltContent('monitoring');
    }
  }
];

export function getStaticCookbook(name) {
  return STATIC_CHEF_COOKBOOKS.find((cb) => cb.name === name) || STATIC_CHEF_COOKBOOKS[0];
}

export function getStaticCookbookContent(cookbookName, recipe = 'default') {
  const cb = getStaticCookbook(cookbookName);
  const content = getBundledChefContent(cookbookName, recipe);
  return {
    filename: `${cookbookName}/recipes/${recipe}.rb`,
    path: `chef/cookbooks/${cookbookName}/recipes/${recipe}.rb`,
    language: 'ruby',
    version: cb?.version || '1.0.0',
    size_bytes: new TextEncoder().encode(content).length,
    content: content
  };
}

export function getStaticSaltState(id) {
  return STATIC_SALT_STATES.find((st) => st.id === id) || STATIC_SALT_STATES[0];
}

export function getStaticSaltStateContent(stateId) {
  const st = getStaticSaltState(stateId);
  const content = getBundledSaltContent(stateId);
  return {
    filename: `${stateId}.sls`,
    path: `salt/states/${stateId}.sls`,
    language: 'yaml',
    version: '1.0.0',
    size_bytes: new TextEncoder().encode(content).length,
    content: content
  };
}
