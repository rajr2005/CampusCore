from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional
from datetime import date, datetime

class IncomeBase(BaseModel):
    transaction_date: date
    income_type: str
    payment_method: str
    amount: float
    description: Optional[str] = None

class IncomeCreate(IncomeBase):
    pass

class Income(IncomeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ExpenseCategoryBase(BaseModel):
    name: str

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategory(ExpenseCategoryBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    transaction_date: date
    category_id: int
    amount: float
    description: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: int
    category: ExpenseCategory
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EmployeeBase(BaseModel):
    employee_id: Optional[str] = None
    name: str
    date_of_joining: Optional[date] = None
    gender: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    address: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    role: Optional[str] = None
    monthly_salary: float
    status: str = "active"

class EmployeeCreate(EmployeeBase):
    pass

class Employee(EmployeeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    fee: float = Field(ge=0)
    duration: str = Field(min_length=1, max_length=100)

    @field_validator("title", "duration")
    @classmethod
    def strip_course_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Course title and duration cannot be blank")
        return value

class CourseCreate(CourseBase):
    pass

class Course(CourseBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class StudentBase(BaseModel):
    name: str = Field(min_length=1)
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    student_status: Literal["Student", "Working Professional", "Unemployed"] = "Student"
    educational_details: Optional[str] = None
    organization_name: Optional[str] = None
    organization_address: Optional[str] = None
    year_or_experience: Optional[str] = None
    course_id: Optional[int] = None
    coordinator_employee_id: Optional[int] = None
    course_title: Optional[str] = None
    course_coordinator: Optional[str] = None
    course_fee: float = Field(ge=0)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Student name cannot be blank")
        return value

class StudentCreate(StudentBase):
    pass

class Student(StudentBase):
    id: int
    balance_fee: float
    course_duration: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BillReceiptCreate(BaseModel):
    receipt_date: date
    student_id: int
    payment_type: Literal["Installment", "Full Cash"]
    mode_of_payment: Literal["Online", "Cash"]
    received_amount: float = Field(gt=0)
    receipt_generated_by: str = Field(min_length=1, max_length=100)
    course_duration: Optional[str] = None
    next_installment_date: Optional[date] = None

    @field_validator("receipt_generated_by")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank")
        return value

class BillEmailRequest(BaseModel):
    pdf_data: str = Field(min_length=1, max_length=14_000_000)

class BillReceipt(BaseModel):
    id: int
    receipt_number: str
    receipt_date: date
    student_id: int
    student_name: str
    student_email: Optional[str] = None
    course_coordinator: Optional[str] = None
    course_title: Optional[str] = None
    course_fee: float
    payment_type: str
    mode_of_payment: str
    received_amount: float
    receipt_generated_by: str
    course_duration: Optional[str] = None
    next_installment_date: Optional[date] = None
    balance_fee: float
    created_at: datetime

    class Config:
        from_attributes = True

class PayslipBase(BaseModel):
    employee_id: int
    month: str
    year: int
    fixed_days: int = Field(ge=1)
    present_days: int = Field(ge=0)
    total_salary: float
    one_day_salary: float = 0
    incentive: float = 0
    overtime: float = 0
    leaves_taken: float = 0
    basic_pay: float = 0
    late_permissions: float = 0
    tax: float = Field(default=0, ge=0)
    deductions: float = 0
    net_salary: float = 0

class PayslipCreate(PayslipBase):
    pass

class Payslip(PayslipBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PaySlipSendRequest(BaseModel):
    employee_id: int
    pdf_data: str = ""
    payslip: Optional[dict] = None

class RecurringExpenseBase(BaseModel):
    name: str
    category_id: int
    amount: float
    frequency: str = "Monthly"
    due_day: int

class RecurringExpenseCreate(RecurringExpenseBase):
    pass

class RecurringExpense(RecurringExpenseBase):
    id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

class UserLogin(UserBase):
    password: str

class Token(BaseModel):
    token: str
    username: str
    role: Literal["admin", "subadmin"]

class SubadminCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def strip_username(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Username cannot be blank")
        return value

class UserSummary(UserBase):
    id: int
    role: Literal["admin", "subadmin"]
