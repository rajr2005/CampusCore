from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, nullable=False, default="subadmin")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class IncomeTransaction(Base):
    __tablename__ = "income_transactions"
    id = Column(Integer, primary_key=True, index=True)
    transaction_date = Column(Date, index=True)
    income_type = Column(String)
    payment_method = Column(String)
    amount = Column(Float)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ExpenseCategory(Base):
    __tablename__ = "expense_categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    status = Column(String, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ExpenseTransaction(Base):
    __tablename__ = "expense_transactions"
    id = Column(Integer, primary_key=True, index=True)
    transaction_date = Column(Date, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"))
    amount = Column(Float)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("ExpenseCategory")

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True, nullable=True)
    name = Column(String)
    date_of_joining = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    department = Column(String, nullable=True)
    address = Column(String, nullable=True)
    bank_name = Column(String, nullable=True)
    bank_account = Column(String, nullable=True)
    role = Column(String, nullable=True)
    monthly_salary = Column(Float)
    status = Column(String, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, unique=True, nullable=False, index=True)
    fee = Column(Float, nullable=False, default=0)
    duration = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    mobile_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    student_status = Column(String, nullable=False, default="Student")
    educational_details = Column(String, nullable=True)
    organization_name = Column(String, nullable=True)
    organization_address = Column(String, nullable=True)
    year_or_experience = Column(String, nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="SET NULL"), nullable=True, index=True)
    coordinator_employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    course_title = Column(String, nullable=True)
    course_coordinator = Column(String, nullable=True)
    course_fee = Column(Float, nullable=False, default=0)
    balance_fee = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    course = relationship("Course")
    coordinator = relationship("Employee")

    @property
    def course_duration(self):
        return self.course.duration if self.course else None

class BillReceipt(Base):
    __tablename__ = "bill_receipts"
    id = Column(Integer, primary_key=True, index=True)
    receipt_number = Column(String, unique=True, index=True, nullable=False)
    receipt_date = Column(Date, nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False, index=True)
    student_name = Column(String, nullable=False)
    student_email = Column(String, nullable=True)
    course_coordinator = Column(String, nullable=True)
    course_title = Column(String, nullable=True)
    course_fee = Column(Float, nullable=False)
    payment_type = Column(String, nullable=False)
    mode_of_payment = Column(String, nullable=False)
    received_amount = Column(Float, nullable=False)
    receipt_generated_by = Column(String, nullable=False)
    course_duration = Column(String, nullable=True)
    next_installment_date = Column(Date, nullable=True)
    balance_fee = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student")

class Payslip(Base):
    __tablename__ = "payslips"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    month = Column(String, nullable=False)
    year = Column(Integer, nullable=False)
    fixed_days = Column(Integer, default=30)
    present_days = Column(Integer, default=0)
    total_salary = Column(Float, default=0)
    one_day_salary = Column(Float, default=0)
    incentive = Column(Float, default=0)
    overtime = Column(Float, default=0)
    leaves_taken = Column(Float, default=0)
    basic_pay = Column(Float, default=0)
    late_permissions = Column(Float, default=0)
    tax = Column(Float, default=0)
    deductions = Column(Float, default=0)
    net_salary = Column(Float, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    employee = relationship("Employee")

class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category_id = Column(Integer, ForeignKey("expense_categories.id"))
    amount = Column(Float)
    frequency = Column(String, default="Monthly")
    due_day = Column(Integer)
    status = Column(String, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("ExpenseCategory")
