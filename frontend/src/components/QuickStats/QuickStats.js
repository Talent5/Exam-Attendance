import React, { useEffect } from 'react';
import { useStats } from '../../hooks/useStats';

const QuickStats = () => {
  const { stats, loading, error, updateStatsOptimistically } = useStats();

  useEffect(() => {
    // Listen for real-time updates to provide optimistic updates
    const handleNewAttendance = () => {
      updateStatsOptimistically('new-attendance');
    };

    const handleStudentEnrolled = () => {
      updateStatsOptimistically('new-student');
    };

    // Listen for WebSocket events
    window.addEventListener('new-attendance', handleNewAttendance);
    window.addEventListener('student-enrolled', handleStudentEnrolled);

    return () => {
      window.removeEventListener('new-attendance', handleNewAttendance);
      window.removeEventListener('student-enrolled', handleStudentEnrolled);
    };
  }, [updateStatsOptimistically]);

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-red-800 mb-2">
          Error Loading Stats
        </h3>
        <p className="text-xs text-red-600">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Quick Stats
        {loading && (
          <div className="inline-block ml-2">
            <div className="animate-spin h-3 w-3 border border-gray-300 border-t-blue-600 rounded-full"></div>
          </div>
        )}
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Today's Scans</span>
          <span className="font-medium text-gray-900 transition-colors duration-200">
            {loading ? '-' : stats.attendance.summary.todayAttendance}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Students</span>
          <span className="font-medium text-gray-900 transition-colors duration-200">
            {loading ? '-' : stats.students.totalStudents}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">This Week</span>
          <span className="font-medium text-gray-900 transition-colors duration-200">
            {loading ? '-' : stats.attendance.summary.weekAttendance}
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;