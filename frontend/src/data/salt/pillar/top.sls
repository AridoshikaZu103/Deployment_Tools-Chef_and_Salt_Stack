# Salt Pillar Top File
base:
  '*':
    - base
  'G@environment:development':
    - dev
  'G@environment:staging':
    - staging
  'G@environment:production':
    - production
