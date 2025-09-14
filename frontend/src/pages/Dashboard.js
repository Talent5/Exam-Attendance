import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import ScannerWidget from '../components/ScannerWidget/ScannerWidget';
import { useStats } from '../hooks/useStats';

const Dashboard = () => {
  const { stats } = useStats();
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load recent attendance data only
  const loadRecentAttendance = async () => {
    try {
      setLoading(true);
      const recentData = await attendanceAPI.getAttendance({ limit: 10, sort: '-timestamp' });
      setRecentAttendance(recentData.data.data);
    } catch (error) {
      console.error('Error loading recent attendance:', error);
      toast.error('Failed to load recent attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecentAttendance();

    // Listen for real-time updates to refresh recent attendance
    const handleNewAttendance = () => {
      loadRecentAttendance();
    };

    window.addEventListener('new-attendance', handleNewAttendance);
    window.addEventListener('attendance-updated', handleNewAttendance);

    return () => {
      window.removeEventListener('new-attendance', handleNewAttendance);
      window.removeEventListener('attendance-updated', handleNewAttendance);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your RFID attendance system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.students.totalStudents}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Attendance</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.attendance.summary.todayAttendance}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8V9m0 2v4m0 0l-2-2m2 2l2-2" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.attendance.summary.weekAttendance}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Scans</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.attendance.summary.totalAttendance}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Attendance */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Attendance</h3>
            <span className="text-sm text-gray-500">Last 10 scans</span>
          </div>
          
          <div className="space-y-3">
            {recentAttendance.length > 0 ? (
              recentAttendance.map((record) => (
                <div key={record._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {record.student?.name || 'Unknown Student'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {record.student?.regNo} • {record.student?.course}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {record.time}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(record.timestamp), 'MMM dd')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">No attendance records yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Scanner Control Widget */}
        <ScannerWidget />

        {/* Course Statistics */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Course Statistics</h3>
            <span className="text-sm text-gray-500">Students by course</span>
          </div>
          
          <div className="space-y-3">
            {stats.students.courseStats.length > 0 ? (
              stats.students.courseStats.map((course, index) => (
                <div key={course._id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index % 4 === 0 ? 'bg-blue-500' :
                      index % 4 === 1 ? 'bg-green-500' :
                      index % 4 === 2 ? 'bg-purple-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900">
                      {course._id}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {course.count} students
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">No courses found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Live Activity Feed</h3>
        <div id="activity-feed" className="space-y-2 max-h-40 overflow-y-auto">
          <div className="text-sm text-gray-500 text-center py-4">
            Waiting for RFID scans...
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;