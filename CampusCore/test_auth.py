import urllib.request
import urllib.error
import json
from datetime import datetime

base_url = "http://127.0.0.1:8000/api"

def request(method, path, data=None, token=None):
    url = f"{base_url}{path}"
    req = urllib.request.Request(url, method=method)
    if data:
        req.data = json.dumps(data).encode("utf-8")
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

print("1. Hit protected API without token")
status, data = request("GET", "/dashboard/summary?month=9&year=2026")
print(f"Status: {status}, Data: {data}")

print("2. Login with wrong credentials")
status, data = request("POST", "/login", {"username": "admin", "password": "wrongpassword"})
print(f"Status: {status}, Data: {data}")

print("3. Login with correct credentials")
status, data = request("POST", "/login", {"username": "admin", "password": "admin123"})
print(f"Status: {status}, Data: {data}")
token = data.get("token")

print("4. Hit protected API with token")
status, data = request("GET", "/dashboard/summary?month=9&year=2026", token=token)
print(f"Status: {status}, Data: {data}")

print("5. Add Income with token")
status, data = request("POST", "/income", {
    "transaction_date": datetime.now().strftime("%Y-%m-%d"),
    "income_type": "Student Fees",
    "payment_method": "Cash",
    "amount": 2000,
    "description": "Auth test income"
}, token=token)
print(f"Status: {status}, Data: {data}")
