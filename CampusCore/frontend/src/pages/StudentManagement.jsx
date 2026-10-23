import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useDataContext } from '../context/DataContext';

const emptyForm = {
  name: '',
  mobile_number: '',
  email: '',
  address: '',
  student_status: 'Student',
  educational_details: '',
  organization_name: '',
  organization_address: '',
  year_or_experience: '',
  course_id: '',
  coordinator_employee_id: '',
  course_fee: '',
};

const fields = [
  ['name', 'Student Name', 'text', true],
  ['mobile_number', 'Mobile Number', 'tel'],
  ['email', 'Email Address', 'email'],
  ['address', 'Address', 'text'],
  ['educational_details', 'Educational Details', 'text'],
  ['organization_name', 'College or Organization Name', 'text'],
  ['organization_address', 'College or Organization Address', 'text'],
  ['year_or_experience', 'Year / Experience', 'text'],
  ['course_fee', 'Student Course Fee', 'number', true],
];

function StudentManagement() {
  const { students, employees, courses, addStudent, updateStudent, deleteStudent } = useDataContext();
  const [form, setForm] = useState(emptyForm);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [studentNameFilter, setStudentNameFilter] = useState('');
  const [studentIdFilter, setStudentIdFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');

  const filteredStudents = useMemo(() => students.filter((student) => (
    student.name.toLowerCase().includes(studentNameFilter.trim().toLowerCase())
    && `stu-${student.id}`.includes(studentIdFilter.trim().toLowerCase())
    && (!courseFilter || String(student.course_id) === courseFilter)
  )), [students, studentNameFilter, studentIdFilter, courseFilter]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setStatusMessage('');
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingStudentId(null);
  };

  const handleCourseChange = (courseId) => {
    const course = courses.find((item) => String(item.id) === courseId);
    setForm((current) => ({
      ...current,
      course_id: courseId,
      course_fee: course ? String(course.fee) : current.course_fee,
    }));
    setStatusMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      course_id: Number(form.course_id),
      coordinator_employee_id: Number(form.coordinator_employee_id),
      course_fee: Number(form.course_fee),
    };
    const savedStudent = editingStudentId === null
      ? await addStudent(payload)
      : await updateStudent(editingStudentId, payload);

    if (savedStudent) {
      setStatusMessage(editingStudentId === null ? 'Student added.' : 'Student details updated.');
      resetForm();
    } else {
      setStatusMessage('Unable to save the student. Please review the form and try again.');
    }
  };

  const handleEdit = (student) => {
    setEditingStudentId(student.id);
    setForm({
      ...emptyForm,
      ...Object.fromEntries(Object.keys(emptyForm).map((key) => [key, student[key] ?? ''])),
      course_id: student.course_id ? String(student.course_id) : '',
      coordinator_employee_id: student.coordinator_employee_id
        ? String(student.coordinator_employee_id)
        : String(employees.find((employee) => employee.name === student.course_coordinator)?.id || ''),
      course_fee: String(student.course_fee ?? ''),
    });
    setStatusMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Delete ${student.name}? Students with bill receipts cannot be deleted.`)) return;
    const deleted = await deleteStudent(student.id);
    setStatusMessage(deleted ? 'Student deleted.' : 'Unable to delete this student.');
  };

  return (
    <div className="max-w-6xl space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Student Management</h2>
        <p className="mt-1 text-sm text-gray-500">Manage student details, courses, and outstanding fees.</p>
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-5 border-b pb-3 text-lg font-bold text-gray-800">
          {editingStudentId === null ? 'Add Student' : `Edit Student STU-${editingStudentId}`}
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fields.map(([name, label, type, required]) => (
            <label key={name} className="block text-sm font-medium text-gray-700">
              {label}
              <input
                type={type}
                min={type === 'number' ? '0' : undefined}
                step={type === 'number' ? '0.01' : undefined}
                required={required}
                value={form[name]}
                onChange={(event) => handleChange(name, event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
              />
            </label>
          ))}
          <label className="block text-sm font-medium text-gray-700">
            Course Title
            <select
              required
              value={form.course_id}
              onChange={(event) => handleCourseChange(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Course Coordinator
            <select
              required
              value={form.coordinator_employee_id}
              onChange={(event) => handleChange('coordinator_employee_id', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
            >
              <option value="">Select an employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}{employee.employee_id ? ` · ${employee.employee_id}` : ''}
                </option>
              ))}
            </select>
          </label>
          <p className="self-center text-xs text-gray-500">
            Selecting a course copies its default fee. You can change this student’s fee without changing the course.
          </p>
          <label className="block text-sm font-medium text-gray-700">
            Student Status
            <select
              value={form.student_status}
              onChange={(event) => handleChange('student_status', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal"
            >
              <option>Student</option>
              <option>Working Professional</option>
              <option>Unemployed</option>
            </select>
          </label>
          <div className="flex items-end justify-end gap-3 md:col-span-2 lg:col-span-3">
            {editingStudentId !== null && (
              <button type="button" onClick={resetForm} className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
                <X size={18} className="mr-2" /> Cancel
              </button>
            )}
            <button type="submit" className="inline-flex items-center rounded-lg bg-primary px-5 py-2 text-white hover:bg-emerald-600">
              {editingStudentId === null && <Plus size={18} className="mr-2" />}
              {editingStudentId === null ? 'Add Student' : 'Save Changes'}
            </button>
          </div>
        </form>
        {statusMessage && <p role="status" className="mt-4 text-sm text-gray-600">{statusMessage}</p>}
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 border-b pb-3 text-lg font-bold text-gray-800">Student List</h3>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">
            Filter by Student Name
            <input
              type="search"
              value={studentNameFilter}
              onChange={(event) => setStudentNameFilter(event.target.value)}
              placeholder="Enter student name"
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
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </label>
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
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Student ID', 'Name', 'Mobile', 'Email', 'Status', 'Course', 'Course Fee', 'Balance Fee', 'Actions'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">STU-{student.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{student.mobile_number || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.email || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{student.student_status}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{student.course_title || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">₹{Number(student.course_fee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">₹{Number(student.balance_fee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button type="button" onClick={() => handleEdit(student)} aria-label={`Edit ${student.name}`} className="mr-3 text-gray-500 hover:text-primary">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => handleDelete(student)} aria-label={`Delete ${student.name}`} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr><td colSpan="9" className="px-4 py-8 text-center text-sm text-gray-500">
                  {students.length === 0 ? 'No students added yet.' : 'No students match the selected filters.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default StudentManagement;
