import React, { useState, useEffect, useCallback } from 'react';
import { studentAPI } from '../services/api';
import toast from 'react-hot-toast';

const StudentForm = ({ student, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    regNo: '',
    course: '',
    rfidUid: ''
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        regNo: student.regNo || '',
        course: student.course || '',
        rfidUid: student.rfidUid || ''
      });
    }
  }, [student]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Full Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="input"
          placeholder="Enter student's full name"
          required
        />
      </div>

      <div>
        <label className="label">Registration Number</label>
        <input
          type="text"
          name="regNo"
          value={formData.regNo}
          onChange={handleChange}
          className="input"
          placeholder="Enter registration number"
          required
        />
      </div>

      <div>
        <label className="label">Course</label>
        <input
          type="text"
          name="course"
          value={formData.course}
          onChange={handleChange}
          className="input"
          placeholder="Enter course/program"
          required
        />
      </div>

      <div>
        <label className="label">RFID Card UID</label>
        <input
          type="text"
          name="rfidUid"
          value={formData.rfidUid}
          onChange={handleChange}
          className="input"
          placeholder="Scan RFID card or enter UID manually"
          required
        />
        <p className="mt-1 text-sm text-gray-500">
          Scan the RFID card to auto-fill this field
        </p>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn-outline"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner mr-2"></div>
              {student ? 'Updating...' : 'Enrolling...'}
            </>
          ) : (
            student ? 'Update Student' : 'Enroll Student'
          )}
        </button>
      </div>
    </form>
  );
};

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    course: '',
    page: 1
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalStudents: 0
  });

  // Load students
  const loadStudents = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const response = await studentAPI.getStudents({
        ...filters,
        ...params
      });
      
      setStudents(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Handle student form submission
  const handleStudentSubmit = async (formData) => {
    try {
      setFormLoading(true);
      
      if (editingStudent) {
        await studentAPI.updateStudent(editingStudent._id, formData);
        toast.success('Student updated successfully');
      } else {
        await studentAPI.createStudent(formData);
        toast.success('Student enrolled successfully');
      }
      
      setShowForm(false);
      setEditingStudent(null);
      loadStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error(error.response?.data?.message || 'Failed to save student');
    } finally {
      setFormLoading(false);
    }
  };

  // Handle student deletion
  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.name}?`)) {
      return;
    }

    try {
      await studentAPI.deleteStudent(student._id);
      toast.success('Student deleted successfully');
      loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  };

  // Handle search and filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
    loadStudents(newFilters);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    loadStudents(newFilters);
  };

  useEffect(() => {
    loadStudents();

    // Listen for real-time student enrollment
    const handleStudentEnrolled = () => {
      loadStudents();
    };

    window.addEventListener('student-enrolled', handleStudentEnrolled);

    return () => {
      window.removeEventListener('student-enrolled', handleStudentEnrolled);
    };
  }, [loadStudents]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage student enrollment and RFID cards
          </p>
        </div>
        
        <button
          onClick={() => {
            setEditingStudent(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Enroll Student
        </button>
      </div>

      {/* Student Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingStudent ? 'Edit Student' : 'Enroll New Student'}
              </h3>
            </div>
            <div className="px-6 py-4">
              <StudentForm
                student={editingStudent}
                onSubmit={handleStudentSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingStudent(null);
                }}
                loading={formLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Search Students</label>
            <input
              type="text"
              placeholder="Search by name, reg no, or course..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input"
            />
          </div>
          
          <div>
            <label className="label">Filter by Course</label>
            <input
              type="text"
              placeholder="Enter course name..."
              value={filters.course}
              onChange={(e) => handleFilterChange('course', e.target.value)}
              className="input"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ search: '', course: '', page: 1 });
                loadStudents({ search: '', course: '', page: 1 });
              }}
              className="btn-outline"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card p-0">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Enrolled Students ({pagination.totalStudents})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner mr-2"></div>
            <span className="text-gray-600">Loading students...</span>
          </div>
        ) : students.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RFID UID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enrolled
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-700">
                              {student.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {student.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.regNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {student.course}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {student.rfidUid}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(student.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingStudent(student);
                            setShowForm(true);
                          }}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by enrolling your first student.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Enroll First Student
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Students;