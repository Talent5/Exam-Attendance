import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDaysIcon, ClockIcon, MapPinIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import RFIDScanner from '../components/RFIDScanner/RFIDScanner';
import api from '../services/api';
import toast from 'react-hot-toast';

const Scanner = () => {
  const { user, isAdmin } = useAuth();
  const [activeExams, setActiveExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveExams = useCallback(async () => {
    try {
      setLoading(true);
      // Get exams that are currently active or scheduled for today
      const today = new Date().toISOString().split('T')[0];
      const params = {
        status: 'Scheduled,In Progress',
        startDate: today,
        endDate: today
      };

      // If user is invigilator, only get their assigned exams
      if (!isAdmin()) {
        params.invigilatorId = user.userId;
      }

      const response = await api.get('/api/exams', { params });
      const exams = response.data.data || [];
      setActiveExams(exams);

      // Auto-select exam if only one is available
      if (exams.length === 1) {
        setSelectedExam(exams[0]);
      }
    } catch (error) {
      console.error('Error fetching active exams:', error);
      toast.error('Failed to fetch active exams');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user.userId]);

  useEffect(() => {
    fetchActiveExams();
  }, [isAdmin, user.userId, fetchActiveExams]);



  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleExamSelect = (exam) => {
    setSelectedExam(exam);
    toast.success(`Selected exam: ${exam.examName}`);
  };

  const updateExamStatus = async (examId, status) => {
    try {
      await api.put(`/api/exams/${examId}/status`, { status });
      toast.success(`Exam status updated to ${status}`);
      fetchActiveExams(); // Refresh the list
    } catch (error) {
      console.error('Error updating exam status:', error);
      toast.error('Failed to update exam status');
    }
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
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Scanner Control</h1>
          <p className="mt-1 text-sm text-gray-600">
            Select an exam and manage RFID scanning for attendance tracking
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Scanner Ready</span>
          </div>
        </div>
      </div>

      {/* Exam Selection */}
      {activeExams.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Exams</h3>
          <p className="text-gray-600">
            {isAdmin() 
              ? 'There are no exams scheduled for today. Create an exam to start scanning.'
              : 'You are not assigned to any exams today. Contact an administrator.'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Active Exams {!isAdmin() && '(Your Assignments)'}
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeExams.map((exam) => (
              <div
                key={exam._id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedExam?._id === exam._id
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleExamSelect(exam)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{exam.examName}</h4>
                    <p className="text-sm text-gray-600">{exam.examId}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    exam.status === 'In Progress' ? 'bg-green-100 text-green-800' :
                    exam.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {exam.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Subject:</span>
                    <span>{exam.subject}</span>
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
                  <div className="flex items-center space-x-2">
                    <AcademicCapIcon className="h-4 w-4" />
                    <span>{exam.totalEnrolledStudents || 0} students enrolled</span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                {(isAdmin() || exam.invigilators?.some(inv => inv.userId === user.userId)) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    {exam.status === 'Scheduled' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateExamStatus(exam._id, 'In Progress');
                        }}
                        className="w-full bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Start Exam
                      </button>
                    )}
                    {exam.status === 'In Progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateExamStatus(exam._id, 'Completed');
                        }}
                        className="w-full bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
                      >
                        Complete Exam
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Exam Info */}
      {selectedExam && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-blue-900">
              Selected Exam: {selectedExam.examName} ({selectedExam.examId})
            </span>
          </div>
          <p className="text-sm text-blue-700">
            Scanner will only accept students enrolled in this exam. 
            {selectedExam.totalEnrolledStudents || 0} students are enrolled.
          </p>
        </div>
      )}

      {/* Scanner Component */}
      <RFIDScanner selectedExam={selectedExam} />
    </div>
  );
};

export default Scanner;