import urllib.request
import urllib.parse
import json
from datetime import datetime

base_url = "http://127.0.0.1:8000/api"

def test_login():
    req = urllib.request.Request(f"{base_url}/login", method="POST")
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def add_income(amount, payment_method):
    data = json.dumps({
        "transaction_date": datetime.now().strftime("%Y-%m-%d"),
        "income_type": "Student Fees",
        "payment_method": payment_method,
        "amount": amount,
        "description": "Test income"
    }).encode("utf-8")
    req = urllib.request.Request(f"{base_url}/income", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def add_expense(amount, category_id):
    data = json.dumps({
        "transaction_date": datetime.now().strftime("%Y-%m-%d"),
        "category_id": category_id,
        "amount": amount,
        "description": "Test expense"
    }).encode("utf-8")
    req = urllib.request.Request(f"{base_url}/expenses", data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def get_categories():
    with urllib.request.urlopen(f"{base_url}/categories") as response:
        return json.loads(response.read().decode())

def get_dashboard(month, year):
    with urllib.request.urlopen(f"{base_url}/dashboard/summary?month={month}&year={year}") as response:
        return json.loads(response.read().decode())

print("Login:", test_login())
print("Add Income GPay:", add_income(1000, "GPay"))
print("Add Income Cash:", add_income(500, "Cash"))
categories = get_categories()
print("Categories:", [c["name"] for c in categories])
rent_cat = next(c for c in categories if c["name"] == "Rent")
print("Add Expense Rent:", add_expense(500, rent_cat["id"]))
now = datetime.now()
print("Dashboard:", get_dashboard(now.month, now.year))
