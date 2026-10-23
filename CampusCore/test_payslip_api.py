import json
import urllib.request
import urllib.error
from datetime import datetime

base_url = "http://127.0.0.1:8000/api"


def request(method, path, data=None, token=None):
    url = f"{base_url}{path}"
    req = urllib.request.Request(url, method=method)
    if data is not None:
        req.data = json.dumps(data).encode("utf-8")
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

print("1. login")
status, data = request("POST", "/login", {"username": "admin", "password": "admin123"})
print(status, data)
assert status == 200, data
assert "token" in data, data

token = data["token"]

print("2. create employee with email")
status, data = request(
    "POST",
    "/employees",
    {
        "employee_id": "EMP-1001",
        "name": "Test Employee",
        "email": "test.employee@example.com",
        "phone": "9900000000",
        "designation": "Accountant",
        "department": "Finance",
        "address": "123 Test Street",
        "bank_name": "Demo Bank",
        "bank_account": "123456789",
        "monthly_salary": 45000,
        "role": "Accountant",
    },
    token=token,
)
print(status, data)
assert status == 200, data
assert data.get("email") == "test.employee@example.com", data

print("3. create payslip")
status, data = request(
    "POST",
    "/payslips",
    {
        "employee_id": 1,
        "month": "July",
        "year": 2026,
        "fixed_days": 30,
        "present_days": 26,
        "total_salary": 45000,
        "overtime": 1500,
        "leaves_taken": 500,
        "basic_pay": 3000,
        "late_permissions": 250,
        "deductions": 3750,
        "net_salary": 41250,
    },
    token=token,
)
print(status, data)
assert status == 200, data
assert data.get("net_salary") == 41250, data

print("4. send payslip email")
status, data = request(
    "POST",
    "/payslips/send",
    {
        "employee_id": 1,
        "pdf_data": "",
        "payslip": {
            "month": "July",
            "year": 2026,
            "net_salary": 41250,
            "employee_name": "Test Employee",
            "email": "test.employee@example.com",
        },
    },
    token=token,
)
print(status, data)
assert status == 200, data
