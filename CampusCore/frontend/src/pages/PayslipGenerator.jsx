import React, { useMemo, useState } from 'react';
import { useDataContext } from '../context/DataContext';
import { Download, Mail } from 'lucide-react';
import { calculatePayslipTotals, createPayslipPdf, downloadPayslipPdf, pdfBytesToDataUri } from '../utils/payslipPdf';

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function PayslipGenerator() {
  const { employees, addPayslip, sendPayslip } = useDataContext();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [month, setMonth] = useState(monthNames[new Date().getMonth()]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [fixedDays, setFixedDays] = useState(30);
  const [presentDays, setPresentDays] = useState(30);
  const [overtime, setOvertime] = useState(0);
  const [incentive, setIncentive] = useState(0);
  const [tax, setTax] = useState(0);
  const [basicPay, setBasicPay] = useState(0);
  const [latePermissions, setLatePermissions] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const selectedEmployee = useMemo(
    () => employees.find((emp) => String(emp.id) === String(selectedEmployeeId)) || null,
    [employees, selectedEmployeeId]
  );

  const handleEmployeeChange = (event) => {
    const employeeId = event.target.value;
    setSelectedEmployeeId(employeeId);

    const employee = employees.find((item) => String(item.id) === employeeId);
    if (employee) setBasicPay(Number(employee.monthly_salary || 0));
  };

  const totalSalary = Number(selectedEmployee?.monthly_salary || 0);
  const oneDaySalary = Number(fixedDays) > 0
    ? Math.round((totalSalary / Number(fixedDays) + Number.EPSILON) * 100) / 100
    : 0;
  const leavesTaken = Math.max(0, Number(fixedDays) - Number(presentDays));

  const { totalAddition, totalDeductions, netSalary } = calculatePayslipTotals({
    one_day_salary: oneDaySalary,
    overtime,
    basic_pay: basicPay,
    incentive,
    leaves_taken: leavesTaken,
    late_permissions: latePermissions,
    tax,
  });

  const handleCreatePayslip = async () => {
    if (!selectedEmployee) {
      setStatusMessage('Select an employee before creating the payslip.');
      return;
    }

    const payload = {
      employee_id: Number(selectedEmployee.id),
      month,
      year,
      fixed_days: Number(fixedDays),
      present_days: Number(presentDays),
      total_salary: Number(totalSalary),
      one_day_salary: Number(oneDaySalary),
      incentive: Number(incentive),
      overtime: Number(overtime),
      leaves_taken: Number(leavesTaken),
      basic_pay: Number(basicPay),
      late_permissions: Number(latePermissions),
      tax: Number(tax),
      deductions: Number(totalDeductions),
      net_salary: Number(netSalary),
    };

    setStatusMessage('');
    try {
      const pdfBytes = await createPayslipPdf(selectedEmployee, payload);
      const saved = await addPayslip(payload);
      if (saved) {
        downloadPayslipPdf(pdfBytes, selectedEmployee, month, year);
        setStatusMessage('Payslip created and downloaded using the supplied template.');
      }
    } catch (error) {
      console.error('Unable to generate payslip PDF:', error);
      setStatusMessage(error.message || 'Unable to generate the payslip PDF.');
    }
  };

  const handleSendPayslip = async () => {
    if (!selectedEmployee) {
      setStatusMessage('Please select a valid employee to send the payslip.');
      return;
    }

    setStatusMessage('');
    try {
      const pdfBytes = await createPayslipPdf(selectedEmployee, {
        month,
        year,
        fixed_days: Number(fixedDays),
        present_days: Number(presentDays),
        total_salary: Number(totalSalary),
        one_day_salary: Number(oneDaySalary),
        incentive: Number(incentive),
        overtime: Number(overtime),
        leaves_taken: Number(leavesTaken),
        basic_pay: Number(basicPay),
        late_permissions: Number(latePermissions),
        tax: Number(tax),
        deductions: Number(totalDeductions),
        net_salary: Number(netSalary),
      });
      const response = await sendPayslip({
        employee_id: Number(selectedEmployee.id),
        pdf_data: pdfBytesToDataUri(pdfBytes),
        payslip: {
          employee_name: selectedEmployee.name,
          email: selectedEmployee.email,
          month,
          year,
          net_salary: Number(netSalary),
        },
      });

      if (response) {
        setStatusMessage(response.message || 'Payslip email sent successfully.');
      }
    } catch (error) {
      console.error('Unable to generate or send payslip:', error);
      setStatusMessage(error.message || 'Unable to generate or send the payslip.');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Payslip Generator</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
            <select
              value={selectedEmployeeId}
              onChange={handleEmployeeChange}
              className="w-full py-2 px-3 border border-gray-300 rounded-lg"
            >
              <option value="">Select employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_id || `EMP-${emp.id}`} - {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month of Pay</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-full py-2 px-3 border border-gray-300 rounded-lg">
              {monthNames.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full py-2 px-3 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fixed Days</label>
            <input
              type="number"
              min="1"
              value={fixedDays}
              onChange={(event) => {
                const value = Math.max(1, Number(event.target.value));
                setFixedDays(value);
                setPresentDays((current) => Math.min(current, value));
              }}
              className="w-full py-2 px-3 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Present Days</label>
            <input
              type="number"
              min="0"
              max={fixedDays}
              value={presentDays}
              onChange={(event) => setPresentDays(Math.min(fixedDays, Math.max(0, Number(event.target.value))))}
              className="w-full py-2 px-3 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Salary</label>
            <input type="number" readOnly value={totalSalary} className="w-full py-2 px-3 border border-gray-200 bg-gray-50 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">One Day Salary (₹)</label>
            <input type="number" readOnly min="0" step="0.01" value={oneDaySalary.toFixed(2)} className="w-full py-2 px-3 border border-gray-200 bg-gray-50 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Overtime (days)</label>
            <input type="number" min="0" step="0.5" value={overtime} onChange={(e) => setOvertime(Number(e.target.value))} className="w-full py-2 px-3 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Incentive (₹)</label>
            <input type="number" min="0" step="0.01" value={incentive} onChange={(e) => setIncentive(Number(e.target.value))} className="w-full py-2 px-3 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Leaves Taken (days)</label>
            <input type="number" readOnly min="0" value={leavesTaken} className="w-full py-2 px-3 border border-gray-200 bg-gray-50 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Basic Pay</label>
            <input type="number" value={basicPay} onChange={(e) => setBasicPay(Number(e.target.value))} className="w-full py-2 px-3 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Late / Permissions (days)</label>
            <input type="number" min="0" step="0.5" value={latePermissions} onChange={(e) => setLatePermissions(Number(e.target.value))} className="w-full py-2 px-3 border border-gray-300 rounded-lg" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax (₹ deduction)</label>
            <input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-full py-2 px-3 border border-gray-300 rounded-lg" />
          </div>
        </div>

        {selectedEmployee && (
          <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-sm text-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div><strong>Employee:</strong> {selectedEmployee.name}</div>
              <div><strong>Employee ID:</strong> {selectedEmployee.employee_id || `EMP-${selectedEmployee.id}`}</div>
              <div><strong>Email:</strong> {selectedEmployee.email || 'N/A'}</div>
              <div><strong>Designation:</strong> {selectedEmployee.designation || selectedEmployee.role || '—'}</div>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
            <div><strong>Total Addition:</strong> ₹{Number(totalAddition).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <div><strong>One Day Salary:</strong> ₹{Number(oneDaySalary).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <div><strong>Total Deductions:</strong> ₹{Number(totalDeductions).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <div><strong>Net Salary:</strong> ₹{Number(netSalary).toLocaleString('en-IN')}</div>
            <div><strong>Pay Month:</strong> {month} {year}</div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Total addition = (overtime days × one day salary) + basic pay + incentive.             Deductions = (leave days + late / permission days) × one day salary + tax.
            Net salary = total addition − deductions.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-4">
          <button onClick={handleCreatePayslip} className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600 transition-colors">
            <Download size={18} className="mr-2" /> Create Payslip
          </button>
          <button onClick={handleSendPayslip} className="inline-flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">
            <Mail size={18} className="mr-2" /> Send Payslip by Email
          </button>
        </div>

        {statusMessage && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default PayslipGenerator;
