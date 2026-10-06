import json
import urllib.parse
import urllib.request

BASE_URL = "http://127.0.0.1:8000"


def test_api():
    # 1. Health
    health = json.loads(urllib.request.urlopen(f"{BASE_URL}/health").read().decode())
    print("[OK] Health Check:", health["status"])

    # 2. Login
    login_data = urllib.parse.urlencode({"username": "admin", "password": "admin123"}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/v1/auth/login", data=login_data)
    token = json.loads(urllib.request.urlopen(req).read().decode())["access_token"]
    print("[OK] Auth: Admin login successful, JWT obtained")

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Servers
    req = urllib.request.Request(f"{BASE_URL}/api/v1/servers/", headers=headers)
    servers = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"[OK] Servers: {len(servers)} managed servers active in inventory")

    # 4. Deployments
    req = urllib.request.Request(f"{BASE_URL}/api/v1/deployments/", headers=headers)
    deployments = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"[OK] Deployments: {deployments['total']} deployment jobs tracked")

    # 5. Configs
    req = urllib.request.Request(f"{BASE_URL}/api/v1/configs/status", headers=headers)
    configs = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"[OK] Configs: Chef={configs['chef_cookbooks_count']} cookbooks, Salt={configs['salt_states_count']} states")


if __name__ == "__main__":
    test_api()
