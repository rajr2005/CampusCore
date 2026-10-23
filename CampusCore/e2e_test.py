import urllib.request
import urllib.error
import json
from datetime import datetime

base_url = "http://127.0.0.1:8000/api"
now = datetime.now()
current_month = now.month
current_year = now.year
next_month = current_month + 1 if current_month < 12 else 1
next_month_year = current_year if current_month < 12 else current_year + 1

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

print("--- 1. Login ---")
s, d = request("POST", "/login", {"username": "admin", "password": "wrongpassword"})
print("Invalid Login (expect 401):", s)

s, d = request("POST", "/login", {"username": "admin", "password": "admin123"})
print("Valid Login (expect 200):", s)
token = d.get("token")

print("\n--- 2. Add Income ---")
s, inc1 = request("POST", "/income", {
    "transaction_date": now.strftime("%Y-%m-%d"),
    "income_type": "Student Fees",
    "payment_method": "GPay",
    "amount": 5000,
    "description": "E2E Test Income"
}, token=token)
print("Add Income GPay:", s)

s, inc2 = request("POST", "/income", {
    "transaction_date": now.strftime("%Y-%m-%d"),
    "income_type": "Student Fees",
    "payment_method": "Cash",
    "amount": 3000,
    "description": "E2E Test Cash Income"
}, token=token)
print("Add Income Cash:", s)

print("\n--- 3. Add Expenses ---")
s, cats = request("GET", "/categories", token=token)
cat_map = {c["name"]: c["id"] for c in cats}

expenses_to_add = [
    ("Rent", 1000),
    ("EB Bill", 500),
    ("WiFi", 300),
    ("Staff Salary", 2000)
]
for cat_name, amt in expenses_to_add:
    s, exp = request("POST", "/expenses", {
        "transaction_date": now.strftime("%Y-%m-%d"),
        "category_id": cat_map[cat_name],
        "amount": amt,
        "description": f"E2E Test {cat_name}"
    }, token=token)
    print(f"Add Expense {cat_name}:", s)

print("\n--- 4. Dashboard Verification ---")
s, dash = request("GET", f"/dashboard/summary?month={current_month}&year={current_year}", token=token)
print("Dashboard (current month):", dash)
assert dash["total_income"] == 8000, "Income mismatch"
assert dash["total_expense"] == 3800, "Expense mismatch"
assert dash["profit"] == 4200, "Profit mismatch"

print("\n--- 5. Month Filter ---")
s, dash_next = request("GET", f"/dashboard/summary?month={next_month}&year={next_month_year}", token=token)
print("Dashboard (next month):", dash_next)

print("\n--- 6. Persistence & Security ---")
s, d = request("GET", f"/dashboard/summary?month={current_month}&year={current_year}")
print("API without token (expect 401):", s)

print("\n--- 7. Cleanup ---")
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
sys.path.append("backend")
from models import IncomeTransaction, ExpenseTransaction

engine = create_engine('sqlite:///backend/finance.db')
Session = sessionmaker(bind=engine)
session = Session()
deleted_inc = session.query(IncomeTransaction).filter(IncomeTransaction.description.like('E2E Test%')).delete(synchronize_session=False)
deleted_exp = session.query(ExpenseTransaction).filter(ExpenseTransaction.description.like('E2E Test%')).delete(synchronize_session=False)
session.commit()
print(f"Cleanup: Deleted {deleted_inc} incomes, {deleted_exp} expenses.")
