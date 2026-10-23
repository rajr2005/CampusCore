import React, { useMemo, useState } from 'react';
import { useDataContext } from '../context/DataContext';
import { Pencil, Plus, Trash2, X } from 'lucide-react';

const emptyForm = {
  employee_id: '',
  name: '',
  date_of_joining: '',
  gender: '',
  email: '',
  phone: '',
  designation: '',
  department: 'Finance',
  address: '',
  bank_name: '',
  bank_account: '',
  monthly_salary: '',
  role: '',
};

function EmployeeManagement() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useDataContext();
  const [form, setForm] = useState(emptyForm);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [employeeIdFilter, setEmployeeIdFilter] = useState('');
  const [employeeNameFilter, setEmployeeNameFilter] = useState('');

  const filteredEmployees = useMemo(() => employees.filter((employee) => (
    `${employee.employee_id || `EMP-${employee.id}`}`.toLowerCase().includes(employeeIdFilter.trim().toLowerCase())
    && employee.name.toLowerCase().includes(employeeNameFilter.trim().toLowerCase())
  )), [employees, employeeIdFilter, employeeNameFilter]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.monthly_salary) return;

    const employee = {
      employee_id: form.employee_id || `EMP-${Date.now().toString().slice(-6)}`,
      name: form.name,
      date_of_joining: form.date_of_joining || null,
      gender: form.gender || null,
      email: form.email,
      phone: form.phone,
      designation: form.designation || form.role || 'Staff',
      department: form.department || 'Finance',
      address: form.address,
      bank_name: form.bank_name,
      bank_account: form.bank_account,
      role: form.role || form.designation || 'Staff',
      monthly_salary: Number(form.monthly_salary),
      status: 'active',
    };

    if (editingEmployeeId !== null) {
      await updateEmployee(editingEmployeeId, employee);
      setEditingEmployeeId(null);
    } else {
      await addEmployee(employee);
    }

    setForm(emptyForm);
  };

  const handleEdit = (employee) => {
    setEditingEmployeeId(employee.id);
    setForm({
      employee_id: employee.employee_id || '',
      name: employee.name || '',
      date_of_joining: employee.date_of_joining || '',
      gender: employee.gender || '',
      email: employee.email || '',
      phone: employee.phone || '',
      designation: employee.designation || '',
      department: employee.department || '',
      address: employee.address || '',
      bank_name: employee.bank_name || '',
      bank_account: employee.bank_account || '',
      monthly_salary: employee.monthly_salary ?? '',
      role: employee.role || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingEmployeeId(null);
    setForm(emptyForm);
  };

  return (
    <div className="space-y-8 max-w-6xl pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Employee Management</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">{editingEmployeeId !== null ? 'Edit Employee' : 'Add Employee'}</h3>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input value={form.employee_id} onChange={(e) => handleChange('employee_id', e.target.value)} placeholder="Employee ID" className="py-2 px-3 border border-gray-300 rounded-lg" />
          <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Full Name" className="py-2 px-3 border border-gray-300 rounded-lg" required />
          <input type="date" value={form.date_of_joining} onChange={(e) => handleChange('date_of_joining', e.target.value)} aria-label="Date of joining" className="py-2 px-3 border border-gray-300 rounded-lg" />
          <select value={form.gender} onChange={(e) => handleChange('gender', e.target.value)} aria-label="Gender" className="py-2 px-3 border border-gray-300 rounded-lg">
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
          <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="Email Address" className="py-2 px-3 border border-gray-300 rounded-lg" required />
          <input value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="Phone Number" className="py-2 px-3 border border-gray-300 rounded-lg" />
          <input value={form.designation} onChange={(e) => handleChange('designation', e.target.value)} placeholder="Designation" className="py-2 px-3 border border-gray-300 rounded-lg" required />
          <input value={form.department} onChange={(e) => handleChange('department', e.target.value)} placeholder="Department" className="py-2 px-3 border border-gray-300 rounded-lg" required />
          <input value={form.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Address" className="md:col-span-2 lg:col-span-2 py-2 px-3 border border-gray-300 rounded-lg" />
          <input value={form.bank_name} onChange={(e) => handleChange('bank_name', e.target.value)} placeholder="Bank Name" className="py-2 px-3 border border-gray-300 rounded-lg" />
          <input value={form.bank_account} onChange={(e) => handleChange('bank_account', e.target.value)} placeholder="Bank Account Number" className="py-2 px-3 border border-gray-300 rounded-lg" />
          <input type="number" value={form.monthly_salary} onChange={(e) => handleChange('monthly_salary', e.target.value)} placeholder="Monthly Salary" className="py-2 px-3 border border-gray-300 rounded-lg" required />
          <input value={form.role} onChange={(e) => handleChange('role', e.target.value)} placeholder="Role" className="py-2 px-3 border border-gray-300 rounded-lg" />

          <div className="lg:col-span-3 flex justify-end">
            {editingEmployeeId !== null && (
              <button type="button" onClick={cancelEdit} className="flex items-center px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                <X size={18} className="mr-2" /> Cancel
              </button>
            )}
            <button type="submit" className="flex items-center px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-emerald-600 transition-colors">
              {editingEmployeeId !== null ? 'Save Changes' : <><Plus size={18} className="mr-2" /> Add Employee</>}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Employee List</h3>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">
            Filter by Employee ID
            <input
              type="search"
              value={employeeIdFilter}
              onChange={(e) => setEmployeeIdFilter(e.target.value)}
              placeholder="Enter employee ID"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Filter by Employee Name
            <input
              type="search"
              value={employeeNameFilter}
              onChange={(e) => setEmployeeNameFilter(e.target.value)}
              placeholder="Enter employee name"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date of Joining</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{emp.employee_id || `EMP-${emp.id}`}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.date_of_joining || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.gender || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{emp.designation || emp.role || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">₹{Number(emp.monthly_salary || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button onClick={() => handleEdit(emp)} aria-label={`Edit ${emp.name}`} className="text-gray-500 hover:text-primary mr-3">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => deleteEmployee(emp.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-sm text-gray-500">
                    {employees.length === 0 ? 'No employees added yet.' : 'No employees match the selected filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EmployeeManagement;
