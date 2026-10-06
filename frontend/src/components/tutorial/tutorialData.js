export const TUTORIAL_STEPS = [
  {
    id: 1,
    step: 1,
    title: 'Chef Architecture & Cookbooks',
    tool: 'chef',
    badge: 'Chef Infra (Pull-Model)',
    duration: 12,
    summary: 'Declarative, idempotent infrastructure convergence using Ruby DSL cookbooks.',
    description:
      'Chef utilizes an idempotent pull-based architecture. Managed target nodes run the chef-client daemon periodically to synchronize state. If a package, template, or system service is already in the declared state, Chef takes no action, preventing configuration drift.',
    voiceText:
      'Step 1: Chef Architecture. Chef uses Ruby DSL cookbooks to define desired state idempotently. Managed nodes run chef-client to pull configurations, compile recipes, and enforce convergence.',
    codeSnippet: `# cookbooks/nginx/recipes/default.rb
package 'nginx' do
  action :install
end

template '/etc/nginx/nginx.conf' do
  source 'nginx.conf.erb'
  mode '0644'
  notifies :reload, 'service[nginx]', :delayed
end

service 'nginx' do
  supports status: true, restart: true, reload: true
  action [:enable, :start]
end`,
    codeTool: 'chef',
    codeLanguage: 'ruby',
    codeTitle: 'recipes/default.rb',
    highlightLines: [2, 6, 8, 12],
    actionTip: 'Resolved runlist format: recipe[cookbook_name::recipe_name]',
    diagram: {
      type: 'chef-arch',
      nodes: [
        { label: 'Chef Server / Repo', role: 'Source of Truth', tool: 'chef' },
        { label: 'Policy / Run-List', role: 'Declarative Specification', tool: 'chef' },
        { label: 'Target Node (chef-client)', role: 'Local Convergence (Idempotent)', tool: 'chef' }
      ]
    }
  },
  {
    id: 2,
    step: 2,
    title: 'SaltStack Architecture & States',
    tool: 'salt',
    badge: 'SaltStack (ZeroMQ Push-Model)',
    duration: 12,
    summary: 'Ultra-fast, event-driven remote execution and configuration management over ZeroMQ.',
    description:
      'SaltStack connects thousands of target servers called Minions to a central Salt Master over high-speed ZeroMQ sockets (ports 4505 publisher & 4506 returner). Salt States (SLS files) are written in YAML with Jinja templating, executing declarative cluster state synchronization in milliseconds.',
    voiceText:
      'Step 2: SaltStack Architecture. Salt Minions connect to the Master over ZeroMQ. Declarative YAML state formulas execute in parallel across thousands of nodes in milliseconds.',
    codeSnippet: `# salt/states/nginx.sls
nginx_package_installed:
  pkg.installed:
    - name: nginx

/etc/nginx/nginx.conf:
  file.managed:
    - source: salt://nginx/templates/nginx.conf.jinja
    - mode: 644
    - template: jinja

nginx_service_running:
  service.running:
    - name: nginx
    - enable: True
    - watch:
      - file: /etc/nginx/nginx.conf`,
    codeTool: 'salt',
    codeLanguage: 'yaml',
    codeTitle: 'states/nginx.sls',
    highlightLines: [2, 6, 12, 16],
    actionTip: 'Execution command: salt \'*\' state.apply nginx',
    diagram: {
      type: 'salt-arch',
      nodes: [
        { label: 'Salt Master', role: 'ZeroMQ Publisher (Port 4505)', tool: 'salt' },
        { label: 'Minion Bus', role: 'Event-Driven Reactive Bus', tool: 'salt' },
        { label: 'Minions (web-01, app-01)', role: 'Instant Parallel Execution', tool: 'salt' }
      ]
    }
  },
  {
    id: 3,
    step: 3,
    title: 'Chef vs SaltStack Comparison',
    tool: 'both',
    badge: '50/50 Architecture Analysis',
    duration: 14,
    summary: 'Comprehensive side-by-side comparison of Chef pull-model vs SaltStack push-model.',
    description:
      'Chef excels in policy-based enterprise compliance, deeply customizable Ruby logic, and rigorous versioned cookbook testing. SaltStack excels in lightning-fast execution speed, event-driven reactive operations (Salt Reactor), and instant parallel ad-hoc querying across massive fleets.',
    voiceText:
      'Step 3: Chef versus SaltStack. Chef is pull-based, driven by Ruby cookbooks and scheduled convergence. SaltStack is push-based, driven by YAML formulas and instantaneous ZeroMQ message broadcasts.',
    comparisonGrid: [
      {
        attribute: 'Architecture Paradigm',
        chef: 'Pull-model (nodes poll Chef server)',
        salt: 'Push-model (Master commands Minions via ZeroMQ)'
      },
      {
        attribute: 'DSL & Language',
        chef: 'Ruby DSL (Procedural & Object-Oriented)',
        salt: 'YAML + Jinja2 (Declarative Data Serialization)'
      },
      {
        attribute: 'Transport Protocol',
        chef: 'HTTPS RESTful API (Port 443)',
        salt: 'ZeroMQ Sockets (Ports 4505 Publisher, 4506 Returner)'
      },
      {
        attribute: 'Execution Latency',
        chef: 'Scheduled runs (Default 15-30 min intervals)',
        salt: 'Real-time (Milliseconds parallel broadcast)'
      },
      {
        attribute: 'Primary Strength',
        chef: 'Deep idempotency, enterprise compliance, cookbooks',
        salt: 'High-speed remote execution, reactive event reactor'
      }
    ],
    actionTip: 'Our portal supports hybrid orchestration: run Chef for deep policy & Salt for rapid execution.',
    diagram: {
      type: 'comparison',
      chefPill: 'Chef (Orange) = Ruby Cookbooks',
      saltPill: 'SaltStack (Cyan) = YAML States'
    }
  },
  {
    id: 4,
    step: 4,
    title: 'Hybrid Deployment Workflow',
    tool: 'both',
    badge: 'Multi-Select Orchestration',
    duration: 12,
    summary: 'Unified deployment engine supporting multi-select cookbooks and states.',
    description:
      'In our deployment launcher, select Chef cookbooks (nginx, app_server, postgresql, monitoring) or SaltStack states (common, nginx, highstate). Target by wildcard globs (*), server role tiers (web-*, app-*, db-*), or individual nodes. The engine dynamically verifies syntax and streams real-time execution logs.',
    voiceText:
      'Step 4: Deployment Workflow. Select single or multiple cookbooks and states in the launcher. Target specific tiers like web-star or db-star, and stream live terminal output during rollout.',
    codeSnippet: `# Live Orchestration Pipeline
1. Select Engine: Chef (Ruby) or SaltStack (YAML)
2. Choose Modules: Multi-select pill cards
3. Target Resolution: Host globs -> Real server nodes
4. Convergence: Stream stdout/stderr in real-time
5. Audit Record: Persist run status in SQLite/PostgreSQL`,
    codeTool: 'shell',
    codeLanguage: 'bash',
    codeTitle: 'deployment-pipeline.spec',
    highlightLines: [1, 2, 3, 4, 5],
    actionTip: 'Multi-select pill cards allow composing complex multi-tier stack deployments in a single click.',
    diagram: {
      type: 'pipeline',
      steps: ['Recipe Selection', 'Target Resolution', 'Parallel Rollout', 'Health Validation']
    }
  },
  {
    id: 5,
    step: 5,
    title: 'Live Fleet Monitoring & Health Diagnostics',
    tool: 'both',
    badge: 'Continuous SRE Telemetry',
    duration: 12,
    summary: 'Multi-protocol socket diagnostics verifying SSH, HTTP, and Database daemon connectivity.',
    description:
      'Every managed node in your fleet is verified continuously. Clicking "Verify Now" runs non-blocking TCP socket probes across SSH (port 22), HTTP services (port 80), and PostgreSQL databases (port 5432). Diagnostic timestamps are written to the database to ensure zero configuration drift.',
    voiceText:
      'Step 5: Fleet Health Diagnostics. Real-time socket verification tests ports 22, 80, and 5432. All nodes remain synchronized. You are now fully trained on Chef and SaltStack orchestration!',
    codeSnippet: `# Backend Diagnostics Service (app/services/health_service.py)
async def check_server_health(ip: str, role: str) -> dict:
    results = {}
    results["ssh"] = await probe_tcp_socket(ip, 22)   # Infrastructure
    results["http"] = await probe_tcp_socket(ip, 80)  # Web Proxy
    results["db"] = await probe_tcp_socket(ip, 5432)  # Postgres Cluster
    return {"status": "healthy" if all(results.values()) else "degraded", ...}`,
    codeTool: 'shell',
    codeLanguage: 'python',
    codeTitle: 'health_service.py',
    highlightLines: [4, 5, 6],
    actionTip: 'Access real-time diagnostics on any node row via the Servers & Health dashboard tab.',
    diagram: {
      type: 'health-matrix',
      metrics: [
        { port: '22', name: 'SSH Daemon', status: 'Healthy' },
        { port: '80', name: 'HTTP Web Reverse Proxy', status: 'Healthy' },
        { port: '5432', name: 'PostgreSQL Database', status: 'Healthy' }
      ]
    }
  }
];
