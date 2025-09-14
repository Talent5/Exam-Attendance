import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute, { AdminRoute, InvigilatorRoute, PublicRoute } from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Users from './pages/Users';
import Exams from './pages/Exams';
import Attendance from './pages/Attendance';
import Analytics from './pages/Analytics';
import Scanner from './pages/Scanner';
import socketService from './services/socket';
import './index.css';

function App() {
  // Initialize socket connection
  React.useEffect(() => {
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Default redirect to dashboard */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              
              {/* Dashboard - All authenticated users */}
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* Students Management - Admin only */}
              <Route 
                path="students" 
                element={
                  <AdminRoute>
                    <Students />
                  </AdminRoute>
                } 
              />
              
              {/* User Management - Admin only */}
              <Route 
                path="users" 
                element={
                  <AdminRoute>
                    <Users />
                  </AdminRoute>
                } 
              />
              
              {/* Exam Management - Admin only */}
              <Route 
                path="exams" 
                element={
                  <AdminRoute>
                    <Exams />
                  </AdminRoute>
                } 
              />
              
              {/* Attendance - All authenticated users */}
              <Route path="attendance" element={<Attendance />} />
              
              {/* Analytics - All authenticated users */}
              <Route path="analytics" element={<Analytics />} />
              
              {/* Scanner - Invigilators and Admins */}
              <Route 
                path="scanner" 
                element={
                  <InvigilatorRoute>
                    <Scanner />
                  </InvigilatorRoute>
                } 
              />
            </Route>
            
            {/* Catch all route - redirect to dashboard if authenticated, login if not */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          
          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: '#4ade80',
                  secondary: '#000',
                },
              },
              error: {
                duration: 5000,
                theme: {
                  primary: '#ef4444',
                  secondary: '#000',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;