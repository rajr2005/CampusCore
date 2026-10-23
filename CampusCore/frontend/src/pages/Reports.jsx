import React, { useMemo } from 'react';
import { useDataContext } from '../context/DataContext';
import { format, isSameMonth, parseISO } from 'date-fns';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function Reports({ selectedMonth }) {
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

  const gpayIncome = currentMonthIncomes.filter(inc => inc.payment_method === 'GPay').reduce((sum, item) => sum + parseFloat(item.amount), 0);
  const cashIncome = currentMonthIncomes.filter(inc => inc.payment_method === 'Cash').reduce((sum, item) => sum + parseFloat(item.amount), 0);

  const expensesByCategory = currentMonthExpenses.reduce((acc, curr) => {
    acc[curr.category_name] = (acc[curr.category_name] || 0) + parseFloat(curr.amount);
    return acc;
  }, {});

  const monthString = format(selectedMonth, 'MMMM_yyyy');
  const monthDisplay = format(selectedMonth, 'MMMM yyyy');

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Month', monthDisplay],
      ['Total Income', totalIncome],
      ['Total Expense', totalExpense],
      ['Profit/Loss', profit]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Income Sheet
    const incomeData = currentMonthIncomes.map(inc => ({
      Date: format(parseISO(inc.transaction_date), 'dd-MM-yyyy'),
      Type: inc.income_type,
      'Payment Method': inc.payment_method,
      Amount: inc.amount,
      Description: inc.description || ''
    }));
    const incomeSheet = XLSX.utils.json_to_sheet(incomeData);
    XLSX.utils.book_append_sheet(wb, incomeSheet, 'Income');

    // Expenses Sheet
    const expenseData = currentMonthExpenses.map(exp => ({
      Date: format(parseISO(exp.transaction_date), 'dd-MM-yyyy'),
      Category: exp.category_name,
      Amount: exp.amount,
      Description: exp.description || ''
    }));
    const expenseSheet = XLSX.utils.json_to_sheet(expenseData);
    XLSX.utils.book_append_sheet(wb, expenseSheet, 'Expenses');

    // Expense Summary Sheet
    const expSummaryData = Object.keys(expensesByCategory).map(key => ({
      Category: key,
      'Total Amount': expensesByCategory[key]
    }));
    const expSummarySheet = XLSX.utils.json_to_sheet(expSummaryData);
    XLSX.utils.book_append_sheet(wb, expSummarySheet, 'Expense Summary');

    XLSX.writeFile(wb, `Institute_Finance_Report_${monthString}.xlsx`);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('INSTITUTE FINANCE REPORT', 14, 22);
    
    doc.setFontSize(14);
    doc.text(monthDisplay, 14, 30);
    
    doc.setFontSize(12);
    doc.text(`Total Income: ${totalIncome.toLocaleString('en-IN')}`, 14, 45);
    doc.text(`Total Expense: ${totalExpense.toLocaleString('en-IN')}`, 14, 52);
    doc.text(`${profit >= 0 ? 'Net Profit' : 'Net Loss'}: ${Math.abs(profit).toLocaleString('en-IN')}`, 14, 59);

    doc.setFontSize(14);
    doc.text('Income:', 14, 75);
    doc.setFontSize(12);
    doc.text(`GPay: ${gpayIncome.toLocaleString('en-IN')}`, 20, 83);
    doc.text(`Cash: ${cashIncome.toLocaleString('en-IN')}`, 20, 90);

    doc.setFontSize(14);
    doc.text('Expenses:', 14, 105);
    
    const expenseRows = Object.keys(expensesByCategory).map(key => [
      key, 
      expensesByCategory[key].toLocaleString('en-IN')
    ]);

    doc.autoTable({
      startY: 110,
      head: [['Category', 'Amount']],
      body: expenseRows,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    });

    const finalY = doc.lastAutoTable.finalY || 110;
    doc.setFontSize(10);
    doc.text(`Report generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, finalY + 20);

    doc.save(`Institute_Finance_Report_${monthString}.pdf`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Reports</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Excel Report</h3>
            <p className="text-gray-600 mb-6">
              Download a comprehensive Excel workbook containing Summary, Income, Expenses, and Categorized Breakdowns.
            </p>
          </div>
          <button
            onClick={downloadExcel}
            className="flex items-center justify-center w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium"
          >
            <Download size={20} className="mr-2" />
            Download Excel
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">PDF Report</h3>
            <p className="text-gray-600 mb-6">
              Download a clean, professional PDF summary document for {monthDisplay}. Perfect for printing or sharing.
            </p>
          </div>
          <button
            onClick={downloadPDF}
            className="flex items-center justify-center w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm font-medium"
          >
            <Download size={20} className="mr-2" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
        <h3 className="text-lg font-bold text-gray-800 border-b pb-4 mb-4">Report Preview: {monthDisplay}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 uppercase font-semibold">Total Income</p>
            <p className="text-2xl font-bold text-gray-900">₹{totalIncome.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500 uppercase font-semibold">Total Expense</p>
            <p className="text-2xl font-bold text-gray-900">₹{totalExpense.toLocaleString('en-IN')}</p>
          </div>
          <div className={`p-4 rounded-lg ${profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <p className="text-sm uppercase font-semibold text-gray-500">Net {profit >= 0 ? 'Profit' : 'Loss'}</p>
            <p className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              ₹{Math.abs(profit).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
