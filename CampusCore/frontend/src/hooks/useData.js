import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = '/api';

export function useData(onLogout, role) {
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [bills, setBills] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('finance_auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const handleError = useCallback((error) => {
    if (error.response && error.response.status === 401) {
      if (onLogout) onLogout();
    } else {
      console.error(error);
      alert(error.response?.data?.detail || error.message || 'An error occurred. Please try again.');
    }
  }, [onLogout]);

  const fetchIncomes = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/income`, { headers: getHeaders() });
      setIncomes(res.data);
    } catch (error) { handleError(error); }
  }, [getHeaders, handleError]);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/expenses`, { headers: getHeaders() });
      const mappedExpenses = res.data.map(exp => ({
        ...exp,
        category_name: exp.category ? exp.category.name : 'Unknown'
      }));
      setExpenses(mappedExpenses);
    } catch (error) { handleError(error); }
  }, [getHeaders, handleError]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/categories`, { headers: getHeaders() });
      setCategories(res.data);
    } catch (error) { handleError(error); }
  }, [getHeaders, handleError]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/employees`, { headers: getHeaders() });
      setEmployees(res.data);
    } catch (error) { handleError(error); }
  }, [getHeaders, handleError]);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/courses`, { headers: getHeaders() });
      setCourses(res.data);
    } catch (error) { handleError(error); }
  }, [getHeaders, handleError]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/students`, { headers: getHeaders() });
      setStudents(res.data);
    } catch (error) { handleError(error); }
  }, [getHeaders, handleError]);

  const fetchBills = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/bills`, { headers: getHeaders() });
      setBills(res.data);
    } catch (error) { handleError(error); }
  }, [getHeaders, handleError]);

  const fetchPayslips = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/payslips`, { headers: getHeaders() });
      setPayslips(res.data);
    } catch (error) { handleError(error); }
  }, [getHeaders, handleError]);

  const fetchRecurringExpenses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/recurring-expenses`, { headers: getHeaders() });
      setRecurringExpenses(res.data);
    } catch (error) { handleError(error); }
  }, [getHeaders, handleError]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      fetchEmployees();
      fetchCourses();
      fetchStudents();
      fetchBills();
      if (role === 'admin') {
        fetchIncomes();
        fetchExpenses();
        fetchCategories();
        fetchPayslips();
        fetchRecurringExpenses();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    role,
    fetchEmployees,
    fetchCourses,
    fetchStudents,
    fetchBills,
    fetchIncomes,
    fetchExpenses,
    fetchCategories,
    fetchPayslips,
    fetchRecurringExpenses,
  ]);

  const createSubadmin = async (user) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/subadmins`, user, { headers: getHeaders() });
      return res.data;
    } catch (error) {
      handleError(error);
      return null;
    }
  };

  // INCOME
  const addIncome = async (income) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/income`, income, { headers: getHeaders() });
      setIncomes(prev => [res.data, ...prev]);
    } catch (error) { handleError(error); }
  };

  const deleteIncome = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/income/${id}`, { headers: getHeaders() });
      setIncomes(prev => prev.filter(inc => inc.id !== id));
    } catch (error) { handleError(error); }
  };

  // EXPENSES
  const addExpense = async (expense) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/expenses`, expense, { headers: getHeaders() });
      const newExpense = {
        ...res.data,
        category_name: res.data.category ? res.data.category.name : 'Unknown'
      };
      setExpenses(prev => [newExpense, ...prev]);
    } catch (error) { handleError(error); }
  };

  const deleteExpense = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/expenses/${id}`, { headers: getHeaders() });
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    } catch (error) { handleError(error); }
  };

  // CATEGORIES
  const addCategory = async (name) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/categories`, { name }, { headers: getHeaders() });
      setCategories(prev => [...prev, res.data]);
    } catch (error) { handleError(error); }
  };

  const toggleCategoryStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      const res = await axios.put(`${API_BASE_URL}/categories/${id}/status`, { status: newStatus }, { headers: getHeaders() });
      setCategories(prev => prev.map(cat => cat.id === id ? res.data : cat));
    } catch (error) { handleError(error); }
  };

  const deleteCategory = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/categories/${id}`, { headers: getHeaders() });
      setCategories(prev => prev.filter(cat => cat.id !== id));
    } catch (error) { handleError(error); }
  };

  // EMPLOYEES
  const addEmployee = async (employee) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/employees`, employee, { headers: getHeaders() });
      setEmployees(prev => [...prev, res.data]);
    } catch (error) { handleError(error); }
  };

  const updateEmployee = async (id, employeeUpdate) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/employees/${id}`, employeeUpdate, { headers: getHeaders() });
      setEmployees(prev => prev.map(emp => emp.id === id ? res.data : emp));
      setStudents(prev => prev.map(student => (
        student.coordinator_employee_id === id
          ? { ...student, course_coordinator: res.data.name }
          : student
      )));
    } catch (error) { handleError(error); }
  };

  const deleteEmployee = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/employees/${id}`, { headers: getHeaders() });
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      setStudents(prev => prev.map(student => (
        student.coordinator_employee_id === id
          ? { ...student, coordinator_employee_id: null }
          : student
      )));
    } catch (error) { handleError(error); }
  };

  const addCourse = async (course) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/courses`, course, { headers: getHeaders() });
      setCourses(prev => [...prev, res.data].sort((left, right) => left.title.localeCompare(right.title)));
      return res.data;
    } catch (error) { handleError(error); return null; }
  };

  const updateCourse = async (id, courseUpdate) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/courses/${id}`, courseUpdate, { headers: getHeaders() });
      setCourses(prev => prev.map(course => course.id === id ? res.data : course)
        .sort((left, right) => left.title.localeCompare(right.title)));
      setStudents(prev => prev.map(student => (
        student.course_id === id ? { ...student, course_title: res.data.title, course_duration: res.data.duration } : student
      )));
      return res.data;
    } catch (error) { handleError(error); return null; }
  };

  const deleteCourse = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/courses/${id}`, { headers: getHeaders() });
      setCourses(prev => prev.filter(course => course.id !== id));
      setStudents(prev => prev.map(student => (
        student.course_id === id ? { ...student, course_id: null, course_duration: null } : student
      )));
      return true;
    } catch (error) { handleError(error); return false; }
  };

  const addStudent = async (student) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/students`, student, { headers: getHeaders() });
      setStudents(prev => [...prev, res.data]);
      return res.data;
    } catch (error) { handleError(error); return null; }
  };

  const updateStudent = async (id, studentUpdate) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/students/${id}`, studentUpdate, { headers: getHeaders() });
      setStudents(prev => prev.map(student => student.id === id ? res.data : student));
      return res.data;
    } catch (error) { handleError(error); return null; }
  };

  const deleteStudent = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/students/${id}`, { headers: getHeaders() });
      setStudents(prev => prev.filter(student => student.id !== id));
      return true;
    } catch (error) { handleError(error); return false; }
  };

  const addBill = async (bill) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/bills`, bill, { headers: getHeaders() });
      setBills(prev => [res.data, ...prev]);
      setStudents(prev => prev.map(student => (
        student.id === res.data.student_id
          ? { ...student, balance_fee: res.data.balance_fee }
          : student
      )));
      return res.data;
    } catch (error) { handleError(error); return null; }
  };

  const deleteBill = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/bills/${id}`, { headers: getHeaders() });
      setBills(prev => prev.filter(bill => bill.id !== id));
      return true;
    } catch (error) { handleError(error); return false; }
  };

  const deleteAllBills = async () => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/bills`, { headers: getHeaders() });
      setBills([]);
      return res.data.deleted_count;
    } catch (error) { handleError(error); return null; }
  };

  const sendBillEmail = async (id, pdfData) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/bills/${id}/send`,
        { pdf_data: pdfData },
        { headers: getHeaders() }
      );
      return res.data;
    } catch (error) { handleError(error); return null; }
  };

  const addPayslip = async (payload) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/payslips`, payload, { headers: getHeaders() });
      setPayslips(prev => [res.data, ...prev]);
      return res.data;
    } catch (error) { handleError(error); return null; }
  };

  const sendPayslip = async (payload) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/payslips/send`, payload, { headers: getHeaders() });
      return res.data;
    } catch (error) { handleError(error); return null; }
  };

  // RECURRING EXPENSES
  const addRecurringExpense = async (recurring) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/recurring-expenses`, recurring, { headers: getHeaders() });
      setRecurringExpenses(prev => [...prev, res.data]);
    } catch (error) { handleError(error); }
  };

  const updateRecurringExpense = async (id, recurringUpdate) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/recurring-expenses/${id}`, recurringUpdate, { headers: getHeaders() });
      setRecurringExpenses(prev => prev.map(rec => rec.id === id ? res.data : rec));
    } catch (error) { handleError(error); }
  };

  const deleteRecurringExpense = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/recurring-expenses/${id}`, { headers: getHeaders() });
      setRecurringExpenses(prev => prev.filter(rec => rec.id !== id));
    } catch (error) { handleError(error); }
  };

  return {
    createSubadmin,
    incomes, addIncome, deleteIncome,
    expenses, addExpense, deleteExpense,
    categories, addCategory, toggleCategoryStatus, deleteCategory,
    employees, addEmployee, updateEmployee, deleteEmployee,
    courses, addCourse, updateCourse, deleteCourse,
    students, addStudent, updateStudent, deleteStudent,
    bills, addBill, deleteBill, deleteAllBills, sendBillEmail,
    payslips, addPayslip, sendPayslip,
    recurringExpenses, addRecurringExpense, updateRecurringExpense, deleteRecurringExpense
  };
}
