import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    
    // Add authentication token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Clear localStorage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Student API endpoints
export const studentAPI = {
  // Get all students with pagination and filtering
  getStudents: (params = {}) => 
    api.get('/api/students', { params }),

  // Get student by ID
  getStudent: (id) => 
    api.get(`/api/students/${id}`),

  // Create new student
  createStudent: (studentData) => 
    api.post('/api/students', studentData),

  // Update student
  updateStudent: (id, studentData) => 
    api.put(`/api/students/${id}`, studentData),

  // Delete student
  deleteStudent: (id) => 
    api.delete(`/api/students/${id}`),

  // Get student statistics
  getStudentStats: () => 
    api.get('/api/students/stats/summary'),
};

// Attendance API endpoints
export const attendanceAPI = {
  // Get attendance records with filtering
  getAttendance: (params = {}) => 
    api.get('/api/attendance', { params }),

  // Record attendance scan (for testing)
  recordScan: (scanData) => 
    api.post('/api/attendance/scan', scanData),

  // Export attendance data as CSV
  exportAttendance: (params = {}) => 
    api.get('/api/attendance/export', { 
      params,
      responseType: 'blob' // Important for file download
    }),

  // Get attendance statistics
  getAttendanceStats: () => 
    api.get('/api/attendance/stats'),
};

// Utility functions
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default api;