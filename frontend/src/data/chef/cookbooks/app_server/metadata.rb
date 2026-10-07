# App Server Cookbook
# Deploys and manages the FastAPI application server.

name             'app_server'
maintainer       'Deployment Tools Team'
maintainer_email 'devops@example.com'
license          'MIT'
description      'Deploys the FastAPI application server with systemd'
version          '1.0.0'

supports 'ubuntu', '>= 20.04'
supports 'centos', '>= 8'

depends 'apt'
