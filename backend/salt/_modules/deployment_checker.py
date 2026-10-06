"""
Custom SaltStack Execution Module: deployment_checker.py
Provides deployment health verification, service readiness, and socket inspection
directly on minions via `salt '*' deployment_checker.verify_stack`.
"""

import socket
import urllib.request
import json
import os

__virtualname__ = 'deployment_checker'


def __virtual__():
    """Ensure this module is loaded into the minion execution context."""
    return __virtualname__


def check_port(host='127.0.0.1', port=80, timeout=3):
    """
    Check if a TCP port is open and accepting connections.

    CLI Example:
        salt '*' deployment_checker.check_port 127.0.0.1 8000
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(float(timeout))
        result = sock.connect_ex((str(host), int(port)))
        sock.close()
        return {'open': result == 0, 'host': host, 'port': int(port)}
    except Exception as e:
        return {'open': False, 'host': host, 'port': int(port), 'error': str(e)}


def check_http_endpoint(url='http://127.0.0.1:8000/health', timeout=5):
    """
    Check HTTP endpoint and parse response.

    CLI Example:
        salt '*' deployment_checker.check_http_endpoint http://localhost:8000/health
    """
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'SaltStack-HealthCheck/1.0'})
        with urllib.request.urlopen(req, timeout=float(timeout)) as response:
            code = response.getcode()
            body = response.read().decode('utf-8')
            try:
                parsed = json.loads(body)
            except Exception:
                parsed = body
            return {'status': 'healthy', 'code': code, 'body': parsed}
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}


def verify_stack():
    """
    Full-stack diagnostic check on the target minion.
    Inspects Nginx (80), FastAPI (8000), PostgreSQL (5432), Prometheus (9090).

    CLI Example:
        salt '*' deployment_checker.verify_stack
    """
    services = {
        'nginx': check_port('127.0.0.1', 80),
        'fastapi_app': check_port('127.0.0.1', 8000),
        'postgresql': check_port('127.0.0.1', 5432),
        'prometheus': check_port('127.0.0.1', 9090),
    }

    all_ok = all(v.get('open') for v in services.values())
    return {
        'all_services_healthy': all_ok,
        'services': services,
        'minion_id': __grains__.get('id', 'unknown'),
        'os': __grains__.get('os', 'unknown')
    }
