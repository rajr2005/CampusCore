import React, { useMemo, useState } from 'react';
import { Download, Mail, ReceiptText, Trash2 } from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import {
  createArapalayamBillPdf,
  createTheppakulamBillPdf,
  downloadBillReceiptPdf,
  pdfBytesToDataUri,
  printBillReceipt,
} from '../utils/printBillReceipt';

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const emptyForm = () => ({
  receipt_date: localDate(),
  student_id: '',
  payment_type: 'Installment',
  mode_of_payment: 'Online',
  received_amount: '',
  receipt_generated_by: '',
  course_duration: '',
  next_installment_date: '',
});

const formatAmount = (amount) => Number(amount || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const amountInCents = (amount) => Math.round(Number(amount || 0) * 100);

const formatDate = (value) => {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

function BillGenerator() {
  const { students, courses, bills, addBill, deleteBill, deleteAllBills, sendBillEmail } = useDataContext();
  const [form, setForm] = useState(emptyForm);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const [sendingBillId, setSendingBillId] = useState(null);
  const [emailFormatByBill, setEmailFormatByBill] = useState({});
  const [emailStatus, setEmailStatus] = useState('');
  const [studentIdFilter, setStudentIdFilter] = useState('');
  const [receiptDateFilter, setReceiptDateFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [deletingBillId, setDeletingBillId] = useState(null);
  const [clearingBills, setClearingBills] = useState(false);

  const filteredBills = useMemo(() => bills.filter((bill) => (
    (!studentIdFilter || String(bill.student_id).includes(studentIdFilter.trim().replace(/^STU-/i, '')))
    && (!receiptDateFilter || bill.receipt_date === receiptDateFilter)
    && (!courseFilter || String(bill.course_title || '').toLowerCase() === courseFilter.toLowerCase())
  )), [bills, studentIdFilter, receiptDateFilter, courseFilter]);

  const selectedStudent = useMemo(
    () => students.find((student) => String(student.id) === String(form.student_id)) || null,
    [students, form.student_id]
  );
  const currentBalance = Number(selectedStudent?.balance_fee || 0);
  const studentInstallmentCount = bills.filter((bill) => (
    bill.student_id === selectedStudent?.id && bill.payment_type === 'Installment'
  )).length;
  const amountReceived = Number(form.received_amount || 0);
  const balanceAfterPayment = (
    amountInCents(currentBalance) - amountInCents(amountReceived)
  ) / 100;
  const needsInstallmentDate = form.payment_type === 'Installment' && balanceAfterPayment > 0;
  const isFinalInstallment = form.payment_type === 'Installment' && studentInstallmentCount === 2;
  const installmentLimitReached = form.payment_type === 'Installment' && studentInstallmentCount >= 3;
  const finalInstallmentIsPartial = isFinalInstallment
    && amountInCents(amountReceived) > 0
    && amountInCents(amountReceived) < amountInCents(currentBalance);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setStatusMessage('');
    setStatusIsError(false);
  };

  const handleStudentChange = (studentId) => {
    const student = students.find((item) => String(item.id) === studentId);
    setForm((current) => ({
      ...current,
      student_id: studentId,
      received_amount: current.payment_type === 'Full Cash' ? String(student?.balance_fee || '') : '',
      course_duration: student?.course_duration || '',
      next_installment_date: '',
    }));
  };

  const handlePaymentTypeChange = (paymentType) => {
    setForm((current) => ({
      ...current,
      payment_type: paymentType,
      received_amount: paymentType === 'Full Cash' && selectedStudent
        ? String(selectedStudent.balance_fee)
        : current.received_amount,
      next_installment_date: '',
    }));
  };

  const handleCreateBill = async (event) => {
    event.preventDefault();
    if (!selectedStudent || currentBalance <= 0) {
      setStatusMessage('Select a student with an outstanding course balance.');
      setStatusIsError(true);
      return;
    }
    if (amountInCents(amountReceived) <= 0 || amountInCents(amountReceived) > amountInCents(currentBalance)) {
      setStatusMessage('Received amount must be greater than zero and cannot exceed the outstanding balance.');
      setStatusIsError(true);
      return;
    }
    if (form.payment_type === 'Full Cash' && amountInCents(amountReceived) !== amountInCents(currentBalance)) {
      setStatusMessage('Full Cash must pay the full remaining balance.');
      setStatusIsError(true);
      return;
    }
    if (installmentLimitReached) {
      setStatusMessage('A student can pay in no more than 3 installments.');
      setStatusIsError(true);
      return;
    }
    if (finalInstallmentIsPartial) {
      setStatusMessage('This is your final installment, so pay the full balance fees.');
      setStatusIsError(true);
      return;
    }

    const payload = {
      ...form,
      student_id: Number(form.student_id),
      received_amount: amountReceived,
      next_installment_date: needsInstallmentDate ? form.next_installment_date || null : null,
    };
    const savedBill = await addBill(payload);
    if (!savedBill) {
      setStatusMessage('Unable to create the bill. Check the payment details and installment limit.');
      setStatusIsError(true);
      return;
    }

    setForm((current) => ({
      ...current,
      received_amount: '',
      next_installment_date: '',
    }));
    setStatusMessage(`Receipt ${savedBill.receipt_number} created. Remaining balance: INR ${formatAmount(savedBill.balance_fee)}.`);
    setStatusIsError(false);
  };

  const handlePrint = async (bill, format) => {
    try {
      await printBillReceipt(bill, format);
    } catch (error) {
      setStatusMessage(error.message || 'Unable to open the receipt for printing.');
      setStatusIsError(true);
    }
  };

  const handleDownload = async (bill, format) => {
    try {
      await downloadBillReceiptPdf(bill, format);
    } catch (error) {
      setStatusMessage(error.message || 'Unable to download the bill PDF.');
      setStatusIsError(true);
    }
  };

  const handleSendEmail = async (bill) => {
    if (!bill.student_email) {
      setEmailStatus(`Add an email address to student STU-${bill.student_id} before sending this receipt.`);
      return;
    }
    const format = emailFormatByBill[bill.id];
    if (!format) {
      setEmailStatus('Choose Arapalayam Bill or Theppakulam Bill before sending this receipt.');
      return;
    }
    setSendingBillId(bill.id);
    setEmailStatus('');
    try {
      const pdfBytes = format === 'arapalayam'
        ? await createArapalayamBillPdf(bill)
        : await createTheppakulamBillPdf(bill);
      const response = await sendBillEmail(bill.id, pdfBytesToDataUri(pdfBytes));
      setEmailStatus(response
        ? `${response.message} (${format === 'arapalayam' ? 'Arapalayam Bill' : 'Theppakulam Bill'}).`
        : 'Unable to send the bill email.');
    } catch (error) {
      setEmailStatus(error.message || 'Unable to generate the bill PDF for email.');
    } finally {
      setSendingBillId(null);
    }
  };

  const handleDeleteBill = async (bill) => {
    if (!window.confirm(`Delete receipt ${bill.receipt_number}? The student's outstanding balance will be recalculated.`)) return;
    setDeletingBillId(bill.id);
    const deleted = await deleteBill(bill.id);
    setDeletingBillId(null);
    if (deleted) setEmailStatus(`Receipt ${bill.receipt_number} deleted.`);
  };

  const handleClearAllBills = async () => {
    if (!window.confirm(`Delete all ${bills.length} bill receipt(s)? This cannot be undone and will restore affected students' balances to their current course fees.`)) return;
    setClearingBills(true);
    const deletedCount = await deleteAllBills();
    setClearingBills(false);
    if (deletedCount !== null) setEmailStatus(`${deletedCount} bill receipt(s) deleted.`);
  };

  return (
    <div className="max-w-6xl space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Bill Generator</h2>
        <p className="mt-1 text-sm text-gray-500">Create student fee receipts and track installment balances.</p>
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-5 flex items-center gap-2 border-b pb-3 text-lg font-bold text-gray-800">
          <ReceiptText size={20} /> Create Receipt
        </h3>
        <form onSubmit={handleCreateBill} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm font-medium text-gray-700">
            Receipt Date
            <input
              required
              type="date"
              value={form.receipt_date}
              onChange={(event) => handleChange('receipt_date', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Student ID
            <select
              required
              value={form.student_id}
              onChange={(event) => handleStudentChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select a student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  STU-{student.id} - {student.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Receipt Number
            <input
              readOnly
              value="Generated automatically"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700"
            />
          </label>

          {[
            ['Student Name', selectedStudent?.name],
            ['Email', selectedStudent?.email],
            ['Course Coordinator', selectedStudent?.course_coordinator],
            ['Course Title', selectedStudent?.course_title],
            ['Course Fee', selectedStudent ? `INR ${formatAmount(selectedStudent.course_fee)}` : ''],
            ['Current Balance Fee', selectedStudent ? `INR ${formatAmount(currentBalance)}` : ''],
          ].map(([label, value]) => (
            <label key={label} className="block text-sm font-medium text-gray-700">
              {label}
              <input
                readOnly
                value={value || ''}
                placeholder="Filled from the selected student"
                className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700"
              />
            </label>
          ))}

          <label className="block text-sm font-medium text-gray-700">
            Payment Type
            <select
              value={form.payment_type}
              onChange={(event) => handlePaymentTypeChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option>Installment</option>
              <option>Full Cash</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Mode of Payment
            <select
              value={form.mode_of_payment}
              onChange={(event) => handleChange('mode_of_payment', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option>Online</option>
              <option>Cash</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Received Amount
            <input
              required
              type="number"
              min="0.01"
              max={currentBalance}
              step="0.01"
              value={form.received_amount}
              onChange={(event) => handleChange('received_amount', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Balance Fee After Payment
            <input
              readOnly
              value={selectedStudent && Number.isFinite(balanceAfterPayment) ? `INR ${formatAmount(Math.max(0, balanceAfterPayment))}` : ''}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Receipt Generated By
            <input
              required
              value={form.receipt_generated_by}
              onChange={(event) => handleChange('receipt_generated_by', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Course Duration
            <input
              value={form.course_duration}
              onChange={(event) => handleChange('course_duration', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          {needsInstallmentDate && (
            <label className="block text-sm font-medium text-gray-700">
              Next Installment Date
              <input
                required
                type="date"
                min={form.receipt_date ? (() => {
                  const date = new Date(`${form.receipt_date}T00:00:00`);
                  date.setDate(date.getDate() + 1);
                  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                })() : undefined}
                value={form.next_installment_date}
                onChange={(event) => handleChange('next_installment_date', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
          )}
          {selectedStudent && currentBalance <= 0 && (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 md:col-span-2 lg:col-span-3">
              This student has no balance due. No further installment is needed.
            </p>
          )}
          {selectedStudent && form.payment_type === 'Installment' && (
            <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800 md:col-span-2 lg:col-span-3">
              Installment {Math.min(studentInstallmentCount + 1, 3)} of 3
            </p>
          )}
          {finalInstallmentIsPartial && (
            <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 md:col-span-2 lg:col-span-3">
              This is your final installment, so pay the full balance fees.
            </p>
          )}
          {installmentLimitReached && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2 lg:col-span-3">
              Three installments have already been paid. Choose Full Cash to pay the remaining balance.
            </p>
          )}
          {statusMessage && (
            <p role="status" className={`rounded-lg px-4 py-3 text-sm md:col-span-2 lg:col-span-3 ${statusIsError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
              {statusMessage}
            </p>
          )}
          <div className="flex justify-end md:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={!selectedStudent || currentBalance <= 0 || installmentLimitReached || finalInstallmentIsPartial}
              className="rounded-lg bg-primary px-5 py-2.5 font-medium text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Bill
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <h3 className="text-lg font-bold text-gray-800">Generated Receipts</h3>
          <button
            type="button"
            onClick={handleClearAllBills}
            disabled={bills.length === 0 || clearingBills || deletingBillId !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={16} /> {clearingBills ? 'Clearing…' : 'Clear All Bills'}
          </button>
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">
            Filter by Student ID
            <input
              type="search"
              value={studentIdFilter}
              onChange={(event) => setStudentIdFilter(event.target.value)}
              placeholder="Enter student ID (e.g. STU-12)"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Filter by Receipt Date
            <input
              type="date"
              value={receiptDateFilter}
              onChange={(event) => setReceiptDateFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Filter by Course
            <select
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
            >
              <option value="">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.title}>{course.title}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Receipt No.', 'Date', 'Student', 'Course', 'Received', 'Balance', 'Download / Email', 'Actions'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBills.map((bill) => (
                <tr key={bill.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{bill.receipt_number}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDate(bill.receipt_date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">STU-{bill.student_id} · {bill.student_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{bill.course_title || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">INR {formatAmount(bill.received_amount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">INR {formatAmount(bill.balance_fee)}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-64 flex-col items-start gap-2">
                      <div className="flex flex-wrap gap-x-3 gap-y-2">
                        <button type="button" onClick={() => handleDownload(bill, 'arapalayam')} className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-primary hover:text-emerald-700">
                          <Download size={16} /> Arapalayam Bill
                        </button>
                        <button type="button" onClick={() => handleDownload(bill, 'theppakulam')} className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-primary hover:text-emerald-700">
                          <Download size={16} /> Theppakulam Bill
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-2">
                        <button type="button" onClick={() => handlePrint(bill, 'arapalayam')} className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-primary hover:text-emerald-700">
                          <ReceiptText size={16} /> Print Arapalayam
                        </button>
                        <button type="button" onClick={() => handlePrint(bill, 'theppakulam')} className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-primary hover:text-emerald-700">
                          <ReceiptText size={16} /> Print Theppakulam
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`Email format for receipt ${bill.receipt_number}`}
                          value={emailFormatByBill[bill.id] || ''}
                          onChange={(event) => {
                            setEmailFormatByBill((current) => ({ ...current, [bill.id]: event.target.value }));
                            setEmailStatus('');
                          }}
                          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                        >
                          <option value="">Choose bill format</option>
                          <option value="arapalayam">Arapalayam Bill</option>
                          <option value="theppakulam">Theppakulam Bill</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleSendEmail(bill)}
                          disabled={sendingBillId === bill.id || !bill.student_email || !emailFormatByBill[bill.id]}
                          title={bill.student_email ? 'Send the selected receipt PDF' : 'Add a student email address before sending'}
                          className="inline-flex items-center gap-1 whitespace-nowrap text-sm text-primary hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Mail size={16} /> {sendingBillId === bill.id ? 'Sending…' : 'Send Mail'}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteBill(bill)}
                      disabled={deletingBillId !== null || clearingBills}
                      aria-label={`Delete receipt ${bill.receipt_number}`}
                      className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      <Trash2 size={16} /> {deletingBillId === bill.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredBills.length === 0 && (
                <tr><td colSpan="8" className="px-4 py-8 text-center text-sm text-gray-500">
                  {bills.length === 0 ? 'No receipts generated yet.' : 'No receipts match the selected filters.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {emailStatus && <p role="status" className="mt-4 text-sm text-gray-700">{emailStatus}</p>}
      </section>
    </div>
  );
}

export default BillGenerator;
