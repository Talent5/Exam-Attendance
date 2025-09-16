import React, { useState, useEffect } from 'react';
import { PlusIcon, MagnifyingGlassIcon, CalendarDaysIcon, ClockIcon, MapPinIcon, UserIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const Exams = () => {
  const { hasPermission } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [assignmentType, setAssignmentType] = useState('students'); // 'students' or 'invigilators'
  const [availableStudents, setAvailableStudents] = useState([]);
  const [availableInvigilators, setAvailableInvigilators] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [formData, setFormData] = useState({
    examId: '',
    examName: '',
    subject: '',
    course: '',
    academicYear: '',
    semester: '1',
    examType: 'Final',
    examDate: '',
    startTime: '',
    endTime: '',
    duration: '',
    venue: {
      room: '',
      building: '',
      capacity: '',
      floor: ''
    },
    instructions: '',
    totalMarks: '',
    passingMarks: '',
    attendanceSettings: {
      allowLateEntry: true,
      lateEntryGracePeriod: 15,
      requireExitScan: false,
      autoMarkAbsent: true,
      absentMarkingTime: 30
    }
  });

  // Fetch exams on component mount
  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/exams');
      setExams(response.data.data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      // Convert numeric fields to numbers and handle empty values
      const examData = {
        ...formData,
        duration: Number(formData.duration),
        venue: {
          ...formData.venue,
          capacity: formData.venue.capacity ? Number(formData.venue.capacity) : undefined
        },
        totalMarks: formData.totalMarks ? Number(formData.totalMarks) : undefined,
        passingMarks: formData.passingMarks ? Number(formData.passingMarks) : undefined,
        attendanceSettings: {
          ...formData.attendanceSettings,
          lateEntryGracePeriod: Number(formData.attendanceSettings.lateEntryGracePeriod),
          absentMarkingTime: Number(formData.attendanceSettings.absentMarkingTime)
        }
      };

      await api.post('/api/exams', examData);
      toast.success('Exam created successfully');
      setShowCreateModal(false);
      setFormData({
        examId: '',
        examName: '',
        subject: '',
        course: '',
        academicYear: '',
        semester: '1',
        examType: 'Final',
        examDate: '',
        startTime: '',
        endTime: '',
        duration: '',
        venue: {
          room: '',
          building: '',
          capacity: '',
          floor: ''
        },
        instructions: '',
        totalMarks: '',
        passingMarks: '',
        attendanceSettings: {
          allowLateEntry: true,
          lateEntryGracePeriod: 15,
          requireExitScan: false,
          autoMarkAbsent: true,
          absentMarkingTime: 30
        }
      });
      fetchExams();
    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error(error.response?.data?.message || 'Failed to create exam');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const filteredExams = exams.filter(exam =>
    exam.examName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.examId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const openAssignModal = async (exam, type) => {
    setSelectedExam(exam);
    setAssignmentType(type);
    setSelectedItems([]);
    
    try {
      if (type === 'students') {
        const response = await api.get('/api/students');
        // Filter out already enrolled students
        const enrolledIds = exam.enrolledStudents?.map(s => s.studentId) || [];
        const available = response.data.data.filter(student => 
          !enrolledIds.includes(student._id)
        );
        setAvailableStudents(available);
      } else {
        const response = await api.get('/api/users', { params: { role: 'invigilator', limit: 100 } });
        // Filter out already assigned invigilators
        const assignedIds = exam.invigilators?.map(i => i.userId) || [];
        const available = response.data.data.filter(user => 
          !assignedIds.includes(user._id)
        );
        setAvailableInvigilators(available);
      }
      setShowAssignModal(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(`Failed to fetch ${type}`);
    }
  };

  const handleAssignment = async () => {
    if (!selectedExam || selectedItems.length === 0) {
      toast.error('Please select items to assign');
      return;
    }

    try {
      const promises = selectedItems.map(item => {
        if (assignmentType === 'students') {
          return api.post(`/api/exams/${selectedExam._id}/students`, {
            studentId: item._id,
            seatNumber: '' // Can be added later
          });
        } else {
          return api.post(`/api/exams/${selectedExam._id}/invigilators`, {
            userId: item._id,
            role: 'Assistant Invigilator'
          });
        }
      });

      await Promise.all(promises);
      
      toast.success(`${assignmentType} assigned successfully`);
      setShowAssignModal(false);
      fetchExams(); // Refresh exam list
    } catch (error) {
      console.error('Error assigning:', error);
      toast.error(`Failed to assign ${assignmentType}`);
    }
  };

  const toggleItemSelection = (item) => {
    setSelectedItems(prev => {
      const isSelected = prev.some(selected => selected._id === item._id);
      if (isSelected) {
        return prev.filter(selected => selected._id !== item._id);
      } else {
        return [...prev, item];
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Management</h1>
          <p className="text-gray-600">Create and manage exams for attendance tracking</p>
        </div>
        {hasPermission('canManageExams') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Exam</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search exams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Exams Grid */}
      {filteredExams.length === 0 ? (
        <div className="text-center py-12">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No exams found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new exam.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <div key={exam._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{exam.examName}</h3>
                  <p className="text-sm text-gray-600">{exam.examId}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  exam.examType === 'Final' ? 'bg-red-100 text-red-800' :
                  exam.examType === 'Midterm' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {exam.examType}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Subject:</span>
                  <span>{exam.subject}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Course:</span>
                  <span>{exam.course}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CalendarDaysIcon className="h-4 w-4" />
                  <span>{formatDate(exam.examDate)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-4 w-4" />
                  <span>{formatTime(exam.startTime)} - {formatTime(exam.endTime)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPinIcon className="h-4 w-4" />
                  <span>{exam.venue.room}{exam.venue.building && `, ${exam.venue.building}`}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Academic Year</span>
                  <span className="font-medium">{exam.academicYear}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Semester</span>
                  <span className="font-medium">{exam.semester}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Students</span>
                  <span className="font-medium">{exam.totalEnrolledStudents || 0}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Invigilators</span>
                  <span className="font-medium">{exam.totalInvigilators || 0}</span>
                </div>
              </div>
              
              {hasPermission('canManageExams') && (
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => openAssignModal(exam, 'students')}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-md text-sm hover:bg-blue-100 flex items-center justify-center space-x-1"
                  >
                    <AcademicCapIcon className="h-4 w-4" />
                    <span>Assign Students</span>
                  </button>
                  <button
                    onClick={() => openAssignModal(exam, 'invigilators')}
                    className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded-md text-sm hover:bg-green-100 flex items-center justify-center space-x-1"
                  >
                    <UserIcon className="h-4 w-4" />
                    <span>Assign Invigilators</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Exam</h2>
              
              <form onSubmit={handleCreateExam} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Exam ID</label>
                    <input
                      type="text"
                      name="examId"
                      value={formData.examId}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Exam Name</label>
                    <input
                      type="text"
                      name="examName"
                      value={formData.examName}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Course</label>
                    <input
                      type="text"
                      name="course"
                      value={formData.course}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Academic Year</label>
                    <input
                      type="text"
                      name="academicYear"
                      value={formData.academicYear}
                      onChange={handleInputChange}
                      placeholder="2024-2025"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Semester</label>
                    <select
                      name="semester"
                      value={formData.semester}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                      <option value="Summer">Summer</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Exam Type</label>
                    <select
                      name="examType"
                      value={formData.examType}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Final">Final</option>
                      <option value="Midterm">Midterm</option>
                      <option value="Quiz">Quiz</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Practical">Practical</option>
                      <option value="Viva">Viva</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Exam Date</label>
                    <input
                      type="date"
                      name="examDate"
                      value={formData.examDate}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                    <input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      min="15"
                      max="480"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Room</label>
                    <input
                      type="text"
                      name="venue.room"
                      value={formData.venue.room}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Building</label>
                    <input
                      type="text"
                      name="venue.building"
                      value={formData.venue.building}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacity</label>
                    <input
                      type="number"
                      name="venue.capacity"
                      value={formData.venue.capacity}
                      onChange={handleInputChange}
                      min="1"
                      max="1000"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Floor</label>
                    <input
                      type="text"
                      name="venue.floor"
                      value={formData.venue.floor}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Marks</label>
                    <input
                      type="number"
                      name="totalMarks"
                      value={formData.totalMarks}
                      onChange={handleInputChange}
                      min="0"
                      max="1000"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Passing Marks</label>
                    <input
                      type="number"
                      name="passingMarks"
                      value={formData.passingMarks}
                      onChange={handleInputChange}
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Instructions</label>
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Exam
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedExam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Assign {assignmentType === 'students' ? 'Students' : 'Invigilators'} to {selectedExam.examName}
              </h2>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Select {assignmentType} to assign to this exam:
                </p>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {assignmentType === 'students' ? (
                  availableStudents.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No students available to assign</p>
                  ) : (
                    <div className="space-y-2">
                      {availableStudents.map((student) => (
                        <div
                          key={student._id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedItems.some(s => s._id === student._id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleItemSelection(student)}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.some(s => s._id === student._id)}
                              onChange={() => toggleItemSelection(student)}
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                            <AcademicCapIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{student.name}</p>
                              <p className="text-sm text-gray-500">{student.regNo} • {student.course}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  availableInvigilators.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No invigilators available to assign</p>
                  ) : (
                    <div className="space-y-2">
                      {availableInvigilators.map((invigilator) => (
                        <div
                          key={invigilator._id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedItems.some(i => i._id === invigilator._id)
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => toggleItemSelection(invigilator)}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedItems.some(i => i._id === invigilator._id)}
                              onChange={() => toggleItemSelection(invigilator)}
                              className="h-4 w-4 text-green-600 rounded"
                            />
                            <UserIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{invigilator.fullName}</p>
                              <p className="text-sm text-gray-500">{invigilator.department} • {invigilator.employeeId}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  {selectedItems.length} {assignmentType} selected
                </p>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignment}
                    disabled={selectedItems.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Assign {assignmentType === 'students' ? 'Students' : 'Invigilators'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;