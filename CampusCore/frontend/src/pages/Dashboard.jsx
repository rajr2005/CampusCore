import React, { useMemo } from 'react';
import { useDataContext } from '../context/DataContext';
import { format, isSameMonth, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function Dashboard({ selectedMonth }) {
  const { incomes, expenses } = useDataContext();

  const currentMonthIncomes = useMemo(() => 
    incomes.filter(inc => isSameMonth(parseISO(inc.transaction_date), selectedMonth)),
    [incomes, selectedMonth]
  );

  const currentMonthExpenses = useMemo(() => 
    expenses.filter(exp => isSameMonth(parseISO(exp.transaction_date), selectedMonth)),
    [expenses, selectedMonth]
  );

  const totalIncome = currentMonthIncomes.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  const totalExpense = currentMonthExpenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  
  const profit = totalIncome - totalExpense;
  const isLoss = profit < 0;

  // Income by Payment Method Data
  const gpayIncome = currentMonthIncomes.filter(inc => inc.payment_method === 'GPay').reduce((sum, item) => sum + parseFloat(item.amount), 0);
  const cashIncome = currentMonthIncomes.filter(inc => inc.payment_method === 'Cash').reduce((sum, item) => sum + parseFloat(item.amount), 0);
  
  const paymentMethodData = [
    { name: 'GPay', value: gpayIncome },
    { name: 'Cash', value: cashIncome },
  ];

  // Expenses by Category Data
  const expensesByCategory = currentMonthExpenses.reduce((acc, curr) => {
    acc[curr.category_name] = (acc[curr.category_name] || 0) + parseFloat(curr.amount);
    return acc;
  }, {});

  const categoryData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  })).sort((a, b) => b.value - a.value);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-emerald-500">
          <p className="text-sm font-medium text-gray-500">Total Income</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">₹{totalIncome.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
          <p className="text-sm font-medium text-gray-500">Total Expense</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">₹{totalExpense.toLocaleString('en-IN')}</p>
        </div>
        {!isLoss && (
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500 md:col-span-2">
            <p className="text-sm font-medium text-gray-500">Profit</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">₹{profit.toLocaleString('en-IN')}</p>
          </div>
        )}
        {isLoss && (
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500 md:col-span-2">
            <p className="text-sm font-medium text-gray-500">Loss</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">₹{Math.abs(profit).toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Income Summary</h3>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">GPay</p>
              <p className="font-semibold">₹{gpayIncome.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cash</p>
              <p className="font-semibold">₹{cashIncome.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethodData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip formatter={(value) => `₹${value}`} />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Expense Categories</h3>
          <div className="flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `₹${value}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 mt-4 md:mt-0 pl-0 md:pl-4 max-h-64 overflow-y-auto">
              <ul className="space-y-2">
                {categoryData.map((item, idx) => (
                  <li key={idx} className="flex justify-between items-center text-sm">
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">₹{item.value.toLocaleString('en-IN')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
