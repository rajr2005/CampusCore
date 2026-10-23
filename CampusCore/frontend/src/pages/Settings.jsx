import React, { useState } from 'react';
import { useDataContext } from '../context/DataContext';
import { Plus, Trash2 } from 'lucide-react';

function Settings() {
  const { 
    categories, addCategory, toggleCategoryStatus, deleteCategory,
    employees, addEmployee, deleteEmployee,
    recurringExpenses, addRecurringExpense, deleteRecurringExpense,
    createSubadmin
  } = useDataContext();
  const [subadminUsername, setSubadminUsername] = useState('');
  const [subadminPassword, setSubadminPassword] = useState('');
  const [subadminMessage, setSubadminMessage] = useState('');

  // Category State
  const [newCategory, setNewCategory] = useState('');

  // Employee State
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [empSalary, setEmpSalary] = useState('');

  // Recurring Expense State
  const [recName, setRecName] = useState('');
  const [recCategoryId, setRecCategoryId] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recFreq, setRecFreq] = useState('Monthly');
  const [recDueDay, setRecDueDay] = useState(1);

  const activeCategories = categories.filter(c => c.status === 'active');

  const handleCreateSubadmin = async (event) => {
    event.preventDefault();
    setSubadminMessage('');
    const created = await createSubadmin({
      username: subadminUsername.trim(),
      password: subadminPassword,
    });
    if (!created) return;
    setSubadminUsername('');
    setSubadminPassword('');
    setSubadminMessage(`Subadmin account "${created.username}" created.`);
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (newCategory.trim() === '') return;
    addCategory(newCategory.trim());
    setNewCategory('');
  };

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!empName || !empRole || !empSalary) return;
    addEmployee({
      employee_id: `EMP-${Date.now().toString().slice(-4)}`,
      name: empName,
      email: empEmail,
      role: empRole,
      designation: empRole,
      department: 'Finance',
      monthly_salary: parseFloat(empSalary)
    });
    setEmpName(''); setEmpEmail(''); setEmpRole(''); setEmpSalary('');
  };

  const handleAddRecurring = (e) => {
    e.preventDefault();
    if (!recName || !recCategoryId || !recAmount || !recDueDay) return;
    addRecurringExpense({
      name: recName,
      category_id: parseInt(recCategoryId, 10),
      amount: parseFloat(recAmount),
      frequency: recFreq,
      due_day: parseInt(recDueDay, 10)
    });
    setRecName(''); setRecCategoryId(''); setRecAmount(''); setRecDueDay(1);
  };

  return (
    <div className="space-y-8 max-w-5xl pb-10">
      <h2 className="text-2xl font-bold text-gray-800">Settings</h2>

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 border-b pb-2 text-lg font-bold text-gray-800">Subadmin Accounts</h3>
        <p className="mb-4 text-sm text-gray-600">
          Subadmins can manage bills, students, courses, and employees only.
        </p>
        <form onSubmit={handleCreateSubadmin} className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-medium text-gray-700">
            Username
            <input
              required
              value={subadminUsername}
              onChange={(event) => setSubadminUsername(event.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Password
            <input
              required
              minLength={8}
              type="password"
              value={subadminPassword}
              onChange={(event) => setSubadminPassword(event.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-emerald-600">
            Create Subadmin
          </button>
        </form>
        {subadminMessage && <p role="status" className="mt-3 text-sm text-emerald-700">{subadminMessage}</p>}
      </section>

      {/* Expense Categories */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Expense Categories</h3>
        
        <form onSubmit={handleAddCategory} className="flex gap-4 mb-6 max-w-md">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category name"
            className="flex-1 py-2 px-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
          />
          <button
            type="submit"
            className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Plus size={20} className="mr-1" /> Add
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className={`flex items-center justify-between p-3 border rounded-lg ${cat.status === 'active' ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
              <span className="font-medium">{cat.name}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleCategoryStatus(cat.id, cat.status)}
                  className={`text-xs px-2 py-1 rounded-full ${cat.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {cat.status === 'active' ? 'Active' : 'Disabled'}
                </button>
                <button onClick={() => deleteCategory(cat.id)} className="text-red-500 hover:text-red-700 ml-2">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employees Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Employees</h3>
        
        <form onSubmit={handleAddEmployee} className="flex flex-wrap gap-4 mb-6">
          <input type="text" value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="Employee Name" className="py-2 px-3 border border-gray-300 rounded-lg" required />
          <input type="email" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} placeholder="Email Address" className="py-2 px-3 border border-gray-300 rounded-lg" />
          <input type="text" value={empRole} onChange={(e) => setEmpRole(e.target.value)} placeholder="Role" className="py-2 px-3 border border-gray-300 rounded-lg" required />
          <input type="number" value={empSalary} onChange={(e) => setEmpSalary(e.target.value)} placeholder="Monthly Salary" className="py-2 px-3 border border-gray-300 rounded-lg" required />
          <button type="submit" className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600 transition-colors">
            <Plus size={20} className="mr-1" /> Add
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Salary</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{emp.role}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">₹{emp.monthly_salary.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{emp.status}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button onClick={() => deleteEmployee(emp.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recurring Expenses Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Recurring Expenses</h3>
        
        <form onSubmit={handleAddRecurring} className="flex flex-wrap gap-4 mb-6">
          <input type="text" value={recName} onChange={(e) => setRecName(e.target.value)} placeholder="Name" className="py-2 px-3 border border-gray-300 rounded-lg" required />
          <select value={recCategoryId} onChange={(e) => setRecCategoryId(e.target.value)} className="py-2 px-3 border border-gray-300 rounded-lg" required>
            <option value="" disabled>Select Category</option>
            {activeCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <input type="number" value={recAmount} onChange={(e) => setRecAmount(e.target.value)} placeholder="Amount" className="py-2 px-3 border border-gray-300 rounded-lg w-32" required />
          <select value={recFreq} onChange={(e) => setRecFreq(e.target.value)} className="py-2 px-3 border border-gray-300 rounded-lg w-32">
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
          </select>
          <input type="number" value={recDueDay} onChange={(e) => setRecDueDay(e.target.value)} placeholder="Due Day (1-31)" min="1" max="31" className="py-2 px-3 border border-gray-300 rounded-lg w-32" required />
          <button type="submit" className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600 transition-colors">
            <Plus size={20} className="mr-1" /> Add
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recurringExpenses.map(rec => (
                <tr key={rec.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{rec.name}</td>
                  <td className="px-4 py-3 text-sm text-red-600 font-medium">₹{rec.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{rec.frequency}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <button onClick={() => deleteRecurringExpense(rec.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Settings;
