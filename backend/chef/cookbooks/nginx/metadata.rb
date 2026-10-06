# Nginx Cookbook
# Installs, configures, and manages the Nginx web server.

name             'nginx'
maintainer       'Deployment Tools Team'
maintainer_email 'devops@example.com'
license          'MIT'
description      'Installs and configures Nginx as a reverse proxy'
version          '1.0.0'

supports 'ubuntu', '>= 20.04'
supports 'centos', '>= 8'
supports 'debian', '>= 11'

depends 'apt'
