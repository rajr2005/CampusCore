import React, { useState, useMemo, useEffect } from 'react';
import { useDataContext } from '../context/DataContext';
import { format, isSameMonth, parseISO } from 'date-fns';
import { Plus, X, Search, Trash2 } from 'lucide-react';

function Expenses({ selectedMonth }) {
  const { expenses, addExpense, deleteExpense, categories, employees, recurringExpenses } = useDataContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!categoryId) return;
    
    const cat = categories.find(c => c.id.toString() === categoryId.toString());
    if (!cat) return;

    if (cat.name === 'Staff Salary') {
      const activeEmployees = (employees || []).filter(e => e.status === 'active');
      const totalSalary = activeEmployees.reduce((sum, emp) => sum + parseFloat(emp.monthly_salary || 0), 0);
      if (totalSalary > 0) {
        setAmount(totalSalary.toString());
      } else {
        setAmount('');
      }
    } else {
      const activeRecurring = (recurringExpenses || []).filter(r => r.status === 'active' && r.category_id.toString() === cat.id.toString());
      if (activeRecurring.length > 0) {
        const totalRecurring = activeRecurring.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
        setAmount(totalRecurring.toString());
      } else {
        setAmount('');
      }
    }
  }, [categoryId, categories, employees, recurringExpenses]);

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const isMatchSearch = search === '' || (exp.description && exp.description.toLowerCase().includes(search.toLowerCase()));
      const isMatchCategory = filterCategory === '' || exp.category_name === filterCategory;
      const isMonth = isSameMonth(parseISO(exp.transaction_date), selectedMonth);
      return isMatchSearch && isMatchCategory && isMonth;
    }).sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
  }, [expenses, selectedMonth, search, filterCategory]);

  const totalExpense = currentMonthExpenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);

  const activeCategories = categories.filter(c => c.status === 'active');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !categoryId || !amount || parseFloat(amount) <= 0) {
      alert("Please fill required fields correctly.");
      return;
    }
    const cat = categories.find(c => c.id.toString() === categoryId.toString());
    
    addExpense({
      transaction_date: date,
      category_id: cat.id,
      category_name: cat.name,
      amount: parseFloat(amount),
      description: description
    });
    // Reset and close
    setAmount('');
    setDescription('');
    setCategoryId('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Expenses</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
        >
          <Plus size={20} className="mr-2" />
          Add Expense
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full sm:w-48 py-2 px-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            >
              <option value="">All Categories</option>
              {activeCategories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="text-right whitespace-nowrap">
            <span className="text-sm text-gray-500 mr-2">Total Expense for {format(selectedMonth, 'MMMM yyyy')}:</span>
            <span className="text-xl font-bold text-red-600">₹{totalExpense.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentMonthExpenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No expense transactions found.</td>
                </tr>
              ) : (
                currentMonthExpenses.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{format(parseISO(item.transaction_date), 'dd-MM-yyyy')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {item.category_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 text-right">₹{parseFloat(item.amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{item.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => deleteExpense(item.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsModalOpen(false)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Add Expense</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date *</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expense Category *</label>
                    <select
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    >
                      <option value="" disabled>Select Category</option>
                      {activeCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                    />
                  </div>
                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-500 text-base font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Save Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;
