import { useState, useEffect, useCallback } from 'react';
import { studentAPI, attendanceAPI } from '../services/api';

const CACHE_DURATION = 30000; // 30 seconds
const statsCache = new Map();

export const useStats = () => {
  const [stats, setStats] = useState({
    students: { totalStudents: 0, courseStats: [] },
    attendance: { 
      summary: { todayAttendance: 0, weekAttendance: 0, totalAttendance: 0 },
      dailyTrend: [],
      topStudents: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getCachedData = (key) => {
    const cached = statsCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  };

  const setCachedData = (key, data) => {
    statsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  };

  const loadStats = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cachedStudentStats = getCachedData('studentStats');
        const cachedAttendanceStats = getCachedData('attendanceStats');
        
        if (cachedStudentStats && cachedAttendanceStats) {
          setStats({
            students: cachedStudentStats,
            attendance: cachedAttendanceStats
          });
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      
      // Load fresh data
      const [studentStats, attendanceStats] = await Promise.all([
        studentAPI.getStudentStats(),
        attendanceAPI.getAttendanceStats()
      ]);

      const newStats = {
        students: studentStats.data.data,
        attendance: attendanceStats.data.data
      };

      // Cache the results
      setCachedData('studentStats', newStats.students);
      setCachedData('attendanceStats', newStats.attendance);

      setStats(newStats);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimistic updates for better UX
  const updateStatsOptimistically = useCallback((type, delta = 1) => {
    setStats(prevStats => {
      const newStats = { ...prevStats };
      
      switch (type) {
        case 'new-attendance':
          newStats.attendance = {
            ...newStats.attendance,
            summary: {
              ...newStats.attendance.summary,
              todayAttendance: newStats.attendance.summary.todayAttendance + delta,
              weekAttendance: newStats.attendance.summary.weekAttendance + delta,
              totalAttendance: newStats.attendance.summary.totalAttendance + delta
            }
          };
          break;
        case 'new-student':
          newStats.students = {
            ...newStats.students,
            totalStudents: newStats.students.totalStudents + delta
          };
          break;
        default:
          break;
      }
      
      return newStats;
    });
  }, []);

  // Clear cache and reload
  const refreshStats = useCallback(() => {
    statsCache.clear();
    loadStats(true);
  }, [loadStats]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refreshStats,
    updateStatsOptimistically
  };
};