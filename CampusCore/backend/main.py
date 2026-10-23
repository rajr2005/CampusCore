from fastapi import FastAPI, Depends, HTTPException, status, Header, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, inspect
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from fastapi.middleware.cors import CORSMiddleware
import base64
import binascii
import configparser
import os
import smtplib
from email.message import EmailMessage
import jwt
from passlib.context import CryptContext

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import models, schemas
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)


def migrate_sqlite_schema():
    """Add columns introduced after the original SQLite database was created."""
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    existing_columns = {
        column["name"] for column in inspector.get_columns("employees")
    } if "employees" in table_names else set()
    student_columns = {
        column["name"] for column in inspector.get_columns("students")
    } if "students" in table_names else set()
    employee_columns = {
        "employee_id": "VARCHAR",
        "date_of_joining": "DATE",
        "gender": "VARCHAR",
        "email": "VARCHAR",
        "phone": "VARCHAR",
        "designation": "VARCHAR",
        "department": "VARCHAR",
        "address": "VARCHAR",
        "bank_name": "VARCHAR",
        "bank_account": "VARCHAR",
    }
    payslip_columns = {
        column["name"] for column in inspector.get_columns("payslips")
    } if "payslips" in inspector.get_table_names() else set()
    user_columns = {
        column["name"] for column in inspector.get_columns("users")
    } if "users" in table_names else set()
    new_payslip_columns = {
        "one_day_salary": "FLOAT NOT NULL DEFAULT 0",
        "incentive": "FLOAT NOT NULL DEFAULT 0",
        "tax": "FLOAT NOT NULL DEFAULT 0",
    }

    with engine.begin() as connection:
        if "employees" in table_names:
            for column_name, column_type in employee_columns.items():
                if column_name not in existing_columns:
                    connection.exec_driver_sql(
                        f'ALTER TABLE employees ADD COLUMN "{column_name}" {column_type}'
                    )
        if "payslips" in table_names:
            for column_name, column_type in new_payslip_columns.items():
                if column_name not in payslip_columns:
                    connection.exec_driver_sql(
                        f'ALTER TABLE payslips ADD COLUMN "{column_name}" {column_type}'
                    )
        if "users" in table_names and "role" not in user_columns:
            connection.exec_driver_sql(
                'ALTER TABLE users ADD COLUMN "role" VARCHAR NOT NULL DEFAULT \'subadmin\''
            )
        if "students" in table_names:
            if "course_id" not in student_columns:
                connection.exec_driver_sql(
                    'ALTER TABLE students ADD COLUMN "course_id" INTEGER REFERENCES courses(id) ON DELETE SET NULL'
                )
            if "coordinator_employee_id" not in student_columns:
                connection.exec_driver_sql(
                    'ALTER TABLE students ADD COLUMN "coordinator_employee_id" INTEGER REFERENCES employees(id) ON DELETE SET NULL'
                )
            connection.exec_driver_sql(
                """
                UPDATE students
                SET course_id = (
                    SELECT courses.id FROM courses
                    WHERE lower(courses.title) = lower(students.course_title)
                    LIMIT 1
                )
                WHERE course_id IS NULL AND course_title IS NOT NULL
                """
            )


migrate_sqlite_schema()

smtp_config = configparser.ConfigParser()
smtp_config.read(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "smtp_config.ini"),
    encoding="utf-8",
)


def get_smtp_setting(name: str, default: str = "") -> str:
    return os.getenv(f"SMTP_{name.upper()}") or smtp_config.get(
        "smtp", name, fallback=default
    )


app = FastAPI(title="STS Finance API")

@app.middleware("http")
async def add_cors_headers(request, call_next):
    origin = request.headers.get("origin")
    response = await call_next(request)

    if origin and (
        origin.startswith("http://localhost") or
        origin.startswith("http://127.0.0.1") or
        origin.startswith("http://0.0.0.0")
    ):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept"

    if request.method == "OPTIONS":
        response.status_code = 200

    return response

SECRET_KEY = "supersecretkey_please_change"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if user.role == "subadmin":
        allowed_prefixes = (
            "/api/employees",
            "/api/courses",
            "/api/students",
            "/api/bills",
        )
        if not any(
            request.url.path == prefix or request.url.path.startswith(f"{prefix}/")
            for prefix in allowed_prefixes
        ) and request.url.path != "/api/me":
            raise HTTPException(status_code=403, detail="Subadmins cannot access this resource")
    return user

# Helper function to seed initial categories
def seed_categories(db: Session):
    default_categories = [
        "Rent", "EB Bill", "WiFi", "HR Phone Recharge", "Justdial",
        "Digital Marketing / Ads", "Staff Salary", "Travel Expense",
        "Maintenance", "Other"
    ]
    if db.query(models.ExpenseCategory).count() == 0:
        for cat in default_categories:
            db.add(models.ExpenseCategory(name=cat))
        db.commit()

def seed_admin(db: Session):
    admin_user = db.query(models.User).filter(models.User.username == "admin").first()
    if admin_user is None:
        hashed_pw = get_password_hash("admin123")
        db.add(models.User(username="admin", password_hash=hashed_pw, role="admin"))
        db.commit()
    else:
        changed = False
        if admin_user.role != "admin":
            admin_user.role = "admin"
            changed = True
        if pwd_context.identify(admin_user.password_hash) != "pbkdf2_sha256":
            admin_user.password_hash = get_password_hash("admin123")
            changed = True
        if changed:
            db.commit()

@app.on_event("startup")
def startup_event():
    db = next(get_db())
    seed_categories(db)
    seed_admin(db)

@app.post("/api/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    access_token = create_access_token(data={"sub": db_user.username})
    return {"token": access_token, "username": db_user.username, "role": db_user.role}

@app.get("/api/me", response_model=schemas.UserSummary)
def get_me(current_user=Depends(get_current_user)):
    return current_user

@app.post("/api/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    raise HTTPException(status_code=403, detail="Public registration is disabled. Ask an admin to create an account.")

@app.post("/api/subadmins", response_model=schemas.UserSummary, status_code=status.HTTP_201_CREATED)
def create_subadmin(
    user: schemas.SubadminCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create subadmin accounts")
    existing_user = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")

    subadmin = models.User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role="subadmin",
    )
    db.add(subadmin)
    db.commit()
    db.refresh(subadmin)
    return subadmin

@app.get("/api/dashboard/summary")
def get_dashboard_summary(month: int, year: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    income_query = db.query(func.sum(models.IncomeTransaction.amount)).filter(
        extract('month', models.IncomeTransaction.transaction_date) == month,
        extract('year', models.IncomeTransaction.transaction_date) == year
    ).scalar() or 0.0

    expense_query = db.query(func.sum(models.ExpenseTransaction.amount)).filter(
        extract('month', models.ExpenseTransaction.transaction_date) == month,
        extract('year', models.ExpenseTransaction.transaction_date) == year
    ).scalar() or 0.0

    profit = income_query - expense_query if income_query > expense_query else 0
    loss = expense_query - income_query if expense_query > income_query else 0

    return {
        "total_income": income_query,
        "total_expense": expense_query,
        "profit": profit,
        "loss": loss
    }

@app.get("/api/income", response_model=List[schemas.Income])
def get_incomes(month: int = None, year: int = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(models.IncomeTransaction)
    if month and year:
        query = query.filter(
            extract('month', models.IncomeTransaction.transaction_date) == month,
            extract('year', models.IncomeTransaction.transaction_date) == year
        )
    return query.order_by(models.IncomeTransaction.transaction_date.desc()).all()

@app.post("/api/income", response_model=schemas.Income)
def create_income(income: schemas.IncomeCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_income = models.IncomeTransaction(**income.model_dump())
    db.add(db_income)
    db.commit()
    db.refresh(db_income)
    return db_income


@app.get("/api/expenses", response_model=List[schemas.Expense])
def get_expenses(month: int = None, year: int = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(models.ExpenseTransaction)
    if month and year:
        query = query.filter(
            extract('month', models.ExpenseTransaction.transaction_date) == month,
            extract('year', models.ExpenseTransaction.transaction_date) == year
        )
    return query.order_by(models.ExpenseTransaction.transaction_date.desc()).all()

@app.post("/api/expenses", response_model=schemas.Expense)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_expense = models.ExpenseTransaction(**expense.model_dump())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@app.get("/api/categories", response_model=List[schemas.ExpenseCategory])
def get_categories(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(models.ExpenseCategory).all()

from pydantic import BaseModel
class StatusUpdate(BaseModel):
    status: str

@app.post("/api/categories", response_model=schemas.ExpenseCategory)
def create_category(category: schemas.ExpenseCategoryCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_category = models.ExpenseCategory(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@app.put("/api/categories/{id}/status", response_model=schemas.ExpenseCategory)
def update_category_status(id: int, status_update: StatusUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_category = db.query(models.ExpenseCategory).filter(models.ExpenseCategory.id == id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    db_category.status = status_update.status
    db.commit()
    db.refresh(db_category)
    return db_category

@app.delete("/api/categories/{id}")
def delete_category(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_category = db.query(models.ExpenseCategory).filter(models.ExpenseCategory.id == id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(db_category)
    db.commit()
    return {"message": "Deleted successfully"}

@app.delete("/api/income/{id}")
def delete_income(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_income = db.query(models.IncomeTransaction).filter(models.IncomeTransaction.id == id).first()
    if not db_income:
        raise HTTPException(status_code=404, detail="Income not found")
    db.delete(db_income)
    db.commit()
    return {"message": "Deleted successfully"}

@app.delete("/api/expenses/{id}")
def delete_expense(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_expense = db.query(models.ExpenseTransaction).filter(models.ExpenseTransaction.id == id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(db_expense)
    db.commit()
    return {"message": "Deleted successfully"}

@app.get("/api/recurring-expenses", response_model=List[schemas.RecurringExpense])
def get_recurring_expenses(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(models.RecurringExpense).all()

@app.post("/api/recurring-expenses", response_model=schemas.RecurringExpense)
def create_recurring_expense(rec: schemas.RecurringExpenseCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_rec = models.RecurringExpense(**rec.model_dump())
    db.add(db_rec)
    db.commit()
    db.refresh(db_rec)
    return db_rec

@app.put("/api/recurring-expenses/{id}", response_model=schemas.RecurringExpense)
def update_recurring_expense(id: int, rec_update: schemas.RecurringExpenseCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_rec = db.query(models.RecurringExpense).filter(models.RecurringExpense.id == id).first()
    if not db_rec:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    for key, value in rec_update.model_dump().items():
        setattr(db_rec, key, value)
    db.commit()
    db.refresh(db_rec)
    return db_rec

@app.delete("/api/recurring-expenses/{id}")
def delete_recurring_expense(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_rec = db.query(models.RecurringExpense).filter(models.RecurringExpense.id == id).first()
    if not db_rec:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    db.delete(db_rec)
    db.commit()
    return {"message": "Deleted successfully"}

@app.get("/api/employees", response_model=List[schemas.Employee])
def get_employees(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(models.Employee).order_by(models.Employee.id.asc()).all()

@app.post("/api/employees", response_model=schemas.Employee)
def create_employee(emp: schemas.EmployeeCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if emp.employee_id:
        existing_employee = db.query(models.Employee).filter(models.Employee.employee_id == emp.employee_id).first()
        if existing_employee:
            raise HTTPException(status_code=400, detail="Employee ID already exists")
    db_emp = models.Employee(**emp.model_dump())
    db.add(db_emp)
    db.commit()
    db.refresh(db_emp)
    return db_emp

@app.get("/api/payslips", response_model=List[schemas.Payslip])
def get_payslips(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(models.Payslip).order_by(models.Payslip.created_at.desc()).all()

@app.post("/api/payslips", response_model=schemas.Payslip)
def create_payslip(payslip: schemas.PayslipCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    employee = db.query(models.Employee).filter(models.Employee.id == payslip.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if payslip.present_days > payslip.fixed_days:
        raise HTTPException(status_code=400, detail="Present days cannot exceed fixed days")

    one_day_salary = round_currency(employee.monthly_salary / payslip.fixed_days)
    leaves_taken = payslip.fixed_days - payslip.present_days
    tax = round_currency(payslip.tax)
    total_deductions = round_currency(
        (leaves_taken + payslip.late_permissions) * float(one_day_salary) + float(tax)
    )
    net_salary = round_currency(
        payslip.basic_pay + payslip.incentive + payslip.overtime * float(one_day_salary)
        - float(total_deductions)
    )
    payslip_data = payslip.model_dump()
    payslip_data.update({
        "total_salary": employee.monthly_salary,
        "one_day_salary": float(one_day_salary),
        "leaves_taken": leaves_taken,
        "tax": float(tax),
        "deductions": float(total_deductions),
        "net_salary": float(net_salary),
    })
    db_payslip = models.Payslip(**payslip_data)
    db.add(db_payslip)
    db.commit()
    db.refresh(db_payslip)
    return db_payslip

@app.post("/api/payslips/send")
def send_payslip_email(payload: schemas.PaySlipSendRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    employee = db.query(models.Employee).filter(models.Employee.id == payload.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if not employee.email:
        raise HTTPException(status_code=400, detail="Employee email is required before sending payslip")

    smtp_host = get_smtp_setting("host")
    smtp_port = int(get_smtp_setting("port", "587"))
    smtp_username = get_smtp_setting("username")
    smtp_password = get_smtp_setting("password")
    from_email = get_smtp_setting("from_email") or smtp_username

    if not smtp_host or not smtp_username or not smtp_password:
        return {
            "message": "Payslip generated successfully. Email service is not configured in this environment, so the email was not sent.",
            "sent": False,
            "employee_email": employee.email,
        }

    pdf_data = payload.pdf_data or ""
    if pdf_data.startswith("data:application/pdf;base64,"):
        pdf_data = pdf_data.split(",", 1)[1]
    attachment = base64.b64decode(pdf_data) if pdf_data else b""

    message = EmailMessage()
    month_name = payload.payslip.get("month", "") if payload.payslip else ""
    year_value = payload.payslip.get("year", "") if payload.payslip else ""
    message["Subject"] = f"Payslip - {month_name} {year_value}"
    message["From"] = from_email
    message["To"] = employee.email
    message.set_content(f"Dear {employee.name},\n\nPlease find your payslip attached for {month_name} {year_value}.\n\nRegards,\nSTS")
    if attachment:
        message.add_attachment(attachment, maintype="application", subtype="pdf", filename=f"payslip_{employee.name.replace(' ', '_')}_{month_name}_{year_value}.pdf")

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as smtp:
            smtp.starttls()
            smtp.login(smtp_username, smtp_password)
            smtp.send_message(message)
        return {"message": "Payslip email sent successfully", "sent": True, "employee_email": employee.email}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to send email: {str(exc)}")

@app.put("/api/employees/{id}", response_model=schemas.Employee)
def update_employee(id: int, emp_update: schemas.EmployeeCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_emp = db.query(models.Employee).filter(models.Employee.id == id).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    for key, value in emp_update.model_dump().items():
        setattr(db_emp, key, value)
    db.query(models.Student).filter(
        models.Student.coordinator_employee_id == id
    ).update({models.Student.course_coordinator: emp_update.name}, synchronize_session=False)
    db.commit()
    db.refresh(db_emp)
    return db_emp

@app.delete("/api/employees/{id}")
def delete_employee(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_emp = db.query(models.Employee).filter(models.Employee.id == id).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.query(models.Student).filter(
        models.Student.coordinator_employee_id == id
    ).update({models.Student.coordinator_employee_id: None}, synchronize_session=False)
    db.delete(db_emp)
    db.commit()
    return {"message": "Deleted successfully"}


@app.get("/api/courses", response_model=List[schemas.Course])
def get_courses(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(models.Course).order_by(models.Course.title.asc()).all()


@app.post("/api/courses", response_model=schemas.Course, status_code=status.HTTP_201_CREATED)
def create_course(course: schemas.CourseCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    existing_course = db.query(models.Course).filter(
        func.lower(models.Course.title) == course.title.strip().lower()
    ).first()
    if existing_course:
        raise HTTPException(status_code=400, detail="Course title already exists")
    db_course = models.Course(**course.model_dump())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


@app.put("/api/courses/{id}", response_model=schemas.Course)
def update_course(id: int, course_update: schemas.CourseCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_course = db.query(models.Course).filter(models.Course.id == id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    duplicate = db.query(models.Course).filter(
        func.lower(models.Course.title) == course_update.title.strip().lower(),
        models.Course.id != id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Course title already exists")
    for key, value in course_update.model_dump().items():
        setattr(db_course, key, value)
    db.query(models.Student).filter(
        models.Student.course_id == id
    ).update({models.Student.course_title: course_update.title}, synchronize_session=False)
    db.commit()
    db.refresh(db_course)
    return db_course


@app.delete("/api/courses/{id}")
def delete_course(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_course = db.query(models.Course).filter(models.Course.id == id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.query(models.Student).filter(
        models.Student.course_id == id
    ).update({models.Student.course_id: None}, synchronize_session=False)
    db.delete(db_course)
    db.commit()
    return {"message": "Course deleted successfully"}


def round_currency(value: float) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@app.get("/api/students", response_model=List[schemas.Student])
def get_students(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(models.Student).order_by(models.Student.id.asc()).all()


@app.post("/api/students", response_model=schemas.Student, status_code=status.HTTP_201_CREATED)
def create_student(student: schemas.StudentCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    student_data = student.model_dump()
    if student.course_id is not None:
        course = db.query(models.Course).filter(models.Course.id == student.course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        student_data["course_title"] = course.title
    if student.coordinator_employee_id is not None:
        coordinator = db.query(models.Employee).filter(
            models.Employee.id == student.coordinator_employee_id
        ).first()
        if not coordinator:
            raise HTTPException(status_code=404, detail="Course coordinator not found")
        student_data["course_coordinator"] = coordinator.name
    student_data["course_fee"] = float(round_currency(student.course_fee))
    student_data["balance_fee"] = student_data["course_fee"]
    db_student = models.Student(**student_data)
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


@app.put("/api/students/{id}", response_model=schemas.Student)
def update_student(id: int, student_update: schemas.StudentCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_student = db.query(models.Student).filter(models.Student.id == id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_data = student_update.model_dump()
    if student_update.course_id is not None:
        course = db.query(models.Course).filter(models.Course.id == student_update.course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        student_data["course_title"] = course.title
    if student_update.coordinator_employee_id is not None:
        coordinator = db.query(models.Employee).filter(
            models.Employee.id == student_update.coordinator_employee_id
        ).first()
        if not coordinator:
            raise HTTPException(status_code=404, detail="Course coordinator not found")
        student_data["course_coordinator"] = coordinator.name

    updated_course_fee = round_currency(student_update.course_fee)
    updated_balance = max(
        Decimal("0.00"),
        round_currency(db_student.balance_fee) + updated_course_fee - round_currency(db_student.course_fee),
    )
    for key, value in student_data.items():
        setattr(db_student, key, value)
    db_student.course_fee = float(updated_course_fee)
    db_student.balance_fee = float(updated_balance)
    db.commit()
    db.refresh(db_student)
    return db_student


@app.delete("/api/students/{id}")
def delete_student(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_student = db.query(models.Student).filter(models.Student.id == id).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    if db.query(models.BillReceipt).filter(models.BillReceipt.student_id == id).first():
        raise HTTPException(status_code=400, detail="Student has bill receipts and cannot be deleted")
    db.delete(db_student)
    db.commit()
    return {"message": "Deleted successfully"}


@app.get("/api/bills", response_model=List[schemas.BillReceipt])
def get_bills(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(models.BillReceipt).order_by(
        models.BillReceipt.receipt_date.desc(), models.BillReceipt.id.desc()
    ).all()


@app.delete("/api/bills/{bill_id}")
def delete_bill(bill_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    bill = db.query(models.BillReceipt).filter(models.BillReceipt.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill receipt not found")

    student = db.query(models.Student).filter(models.Student.id == bill.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    db.delete(bill)
    db.commit()
    return {
        "message": "Bill deleted successfully",
        "student_id": student.id,
        "balance_fee": student.balance_fee,
    }


@app.delete("/api/bills")
def delete_all_bills(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    bill_count = db.query(models.BillReceipt).count()
    db.query(models.BillReceipt).delete(synchronize_session=False)
    db.commit()
    return {
        "message": "All bills deleted successfully",
        "deleted_count": bill_count,
    }


@app.post("/api/bills", response_model=schemas.BillReceipt, status_code=status.HTTP_201_CREATED)
def create_bill(bill: schemas.BillReceiptCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    student = db.query(models.Student).filter(models.Student.id == bill.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    installment_count = db.query(models.BillReceipt).filter(
        models.BillReceipt.student_id == student.id,
        models.BillReceipt.payment_type == "Installment",
    ).count()
    if bill.payment_type == "Installment" and installment_count >= 3:
        raise HTTPException(status_code=400, detail="A student can pay in no more than 3 installments")

    current_balance = round_currency(student.balance_fee)
    received_amount = round_currency(bill.received_amount)
    if received_amount > current_balance:
        raise HTTPException(status_code=400, detail="Received amount cannot exceed the student's balance fee")

    remaining_balance = current_balance - received_amount
    if bill.payment_type == "Installment" and installment_count == 2 and remaining_balance > 0:
        raise HTTPException(
            status_code=400,
            detail="This is your final installment, so pay the full balance fees.",
        )
    if bill.payment_type == "Full Cash" and remaining_balance != Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Full Cash must pay the full remaining balance")
    if remaining_balance > 0 and bill.payment_type == "Installment" and not bill.next_installment_date:
        raise HTTPException(status_code=400, detail="Next installment date is required while a balance remains")
    if remaining_balance == 0 and bill.next_installment_date:
        raise HTTPException(status_code=400, detail="Next installment date is not needed when the balance is zero")
    if bill.next_installment_date and bill.next_installment_date <= bill.receipt_date:
        raise HTTPException(status_code=400, detail="Next installment date must be after the receipt date")

    existing_numbers = {
        number for (number,) in db.query(models.BillReceipt.receipt_number).all()
    }
    numeric_numbers = [
        int(number) for number in existing_numbers if number.isdigit()
    ]
    next_receipt_number = max(numeric_numbers, default=0) + 1
    while str(next_receipt_number) in existing_numbers:
        next_receipt_number += 1

    db_bill = models.BillReceipt(
        receipt_number=str(next_receipt_number),
        receipt_date=bill.receipt_date,
        student_id=student.id,
        student_name=student.name,
        student_email=student.email,
        course_coordinator=student.course_coordinator,
        course_title=student.course_title,
        course_fee=student.course_fee,
        payment_type=bill.payment_type,
        mode_of_payment=bill.mode_of_payment,
        received_amount=float(received_amount),
        receipt_generated_by=bill.receipt_generated_by.strip(),
        course_duration=bill.course_duration,
        next_installment_date=bill.next_installment_date,
        balance_fee=float(remaining_balance),
    )
    student.balance_fee = float(remaining_balance)
    db.add(db_bill)
    db.commit()
    db.refresh(db_bill)
    return db_bill


@app.post("/api/bills/{bill_id}/send")
def send_bill_email(
    bill_id: int,
    payload: schemas.BillEmailRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    bill = db.query(models.BillReceipt).filter(models.BillReceipt.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill receipt not found")
    if not bill.student_email:
        raise HTTPException(status_code=400, detail="Student email is required before sending the bill")

    pdf_data = payload.pdf_data
    if pdf_data.startswith("data:application/pdf;base64,"):
        pdf_data = pdf_data.split(",", 1)[1]
    try:
        attachment = base64.b64decode(pdf_data, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Bill attachment must be valid base64 PDF data") from exc
    if len(attachment) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Bill attachment exceeds the 10 MB limit")
    if not attachment.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Bill attachment is not a valid PDF")

    smtp_host = get_smtp_setting("host")
    smtp_port = int(get_smtp_setting("port", "587"))
    smtp_username = get_smtp_setting("username")
    smtp_password = get_smtp_setting("password")
    from_email = get_smtp_setting("from_email") or smtp_username
    if not smtp_host or not smtp_username or not smtp_password:
        raise HTTPException(status_code=503, detail="Email service is not configured. Set the SMTP credentials to send bills.")

    receipt_date = bill.receipt_date.strftime("%d/%m/%Y")
    message = EmailMessage()
    message["Subject"] = f"Course Fee Receipt - {bill.receipt_number}"
    message["From"] = from_email
    message["To"] = bill.student_email
    message.set_content(
        f"Dear {bill.student_name},\n\n"
        f"Thank you for your payment. Please find your course fee receipt attached.\n\n"
        f"Receipt Number: {bill.receipt_number}\n"
        f"Receipt Date: {receipt_date}\n"
        f"Course: {bill.course_title or 'Course'}\n"
        f"Amount Received: Rs. {bill.received_amount:,.2f}\n"
        f"Balance Payable: Rs. {bill.balance_fee:,.2f}\n\n"
        "Please retain this receipt for your records.\n\n"
        "Regards,\n"
        "Scope Tech Software Solution"
    )
    safe_receipt_number = "".join(
        character if character.isalnum() or character in "-_" else "_"
        for character in bill.receipt_number
    )
    message.add_attachment(
        attachment,
        maintype="application",
        subtype="pdf",
        filename=f"bill_{safe_receipt_number}.pdf",
    )

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as smtp:
            smtp.starttls()
            smtp.login(smtp_username, smtp_password)
            smtp.send_message(message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to send bill email: {exc}") from exc

    return {
        "message": f"Bill emailed successfully to {bill.student_email}",
        "sent": True,
        "student_email": bill.student_email,
    }
