import React, { useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useDataContext } from '../context/DataContext';

const emptyForm = { title: '', fee: '', duration: '' };

function CourseManagement() {
  const { courses, addCourse, updateCourse, deleteCourse } = useDataContext();
  const [form, setForm] = useState(emptyForm);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setStatusMessage('');
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingCourseId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { ...form, fee: Number(form.fee) };
    const savedCourse = editingCourseId === null
      ? await addCourse(payload)
      : await updateCourse(editingCourseId, payload);

    if (savedCourse) {
      setStatusMessage(editingCourseId === null
        ? 'Course added. Existing student fees are unchanged.'
        : 'Course updated. Existing student fees are unchanged.');
      resetForm();
    } else {
      setStatusMessage('Unable to save the course. Check whether its title already exists.');
    }
  };

  const handleEdit = (course) => {
    setEditingCourseId(course.id);
    setForm({ title: course.title, fee: String(course.fee), duration: course.duration });
    setStatusMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (course) => {
    if (!window.confirm(`Delete course "${course.title}"? Assigned students will keep their saved course title and fee, but will need a course selected to update their record.`)) return;
    const deleted = await deleteCourse(course.id);
    setStatusMessage(deleted ? 'Course deleted. Existing student fees were not changed.' : 'Unable to delete the course.');
  };

  return (
    <div className="max-w-6xl space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Course Management</h2>
        <p className="mt-1 text-sm text-gray-500">Manage course titles, default fees, and durations. Student fees remain independent.</p>
      </div>

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-5 border-b pb-3 text-lg font-bold text-gray-800">
          {editingCourseId === null ? 'Add Course' : 'Edit Course'}
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block text-sm font-medium text-gray-700">
            Course Title
            <input
              required
              maxLength="200"
              value={form.title}
              onChange={(event) => handleChange('title', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Default Course Fee
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.fee}
              onChange={(event) => handleChange('fee', event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Course Duration
            <input
              required
              maxLength="100"
              value={form.duration}
              onChange={(event) => handleChange('duration', event.target.value)}
              placeholder="e.g. 6 months"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <div className="flex justify-end gap-3 md:col-span-3">
            {editingCourseId !== null && (
              <button type="button" onClick={resetForm} className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
                <X size={18} className="mr-2" /> Cancel
              </button>
            )}
            <button type="submit" className="inline-flex items-center rounded-lg bg-primary px-5 py-2 text-white hover:bg-emerald-600">
              {editingCourseId === null && <Plus size={18} className="mr-2" />}
              {editingCourseId === null ? 'Add Course' : 'Save Changes'}
            </button>
          </div>
        </form>
        {statusMessage && <p role="status" className="mt-4 text-sm text-gray-600">{statusMessage}</p>}
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 border-b pb-3 text-lg font-bold text-gray-800">Course List</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Course Title', 'Default Fee', 'Duration', 'Actions'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {courses.map((course) => (
                <tr key={course.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{course.title}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">₹{Number(course.fee).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{course.duration}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button type="button" onClick={() => handleEdit(course)} aria-label={`Edit ${course.title}`} className="mr-3 text-gray-500 hover:text-primary">
                      <Pencil size={16} />
                    </button>
                    <button type="button" onClick={() => handleDelete(course)} aria-label={`Delete ${course.title}`} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr><td colSpan="4" className="px-4 py-8 text-center text-sm text-gray-500">No courses added yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default CourseManagement;
