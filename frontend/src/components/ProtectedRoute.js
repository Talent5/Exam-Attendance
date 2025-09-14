import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  requiredRoles = [], 
  requiredPermissions = [],
  fallback = null 
}) => {
  const { isAuthenticated, isLoading, user, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated but accessing login page, redirect to dashboard
  if (!requireAuth && isAuthenticated && location.pathname === '/login') {
    return <Navigate to="/dashboard" replace />;
  }

  // Check role requirements
  if (requiredRoles.length > 0 && isAuthenticated) {
    const hasRequiredRole = requiredRoles.some(role => hasRole(role));
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page. Required role(s): {requiredRoles.join(', ')}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Your current role: {user?.role || 'Unknown'}
            </p>
            <button
              onClick={() => window.history.back()}
              className="btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // Check permission requirements
  if (requiredPermissions.length > 0 && isAuthenticated) {
    const hasRequiredPermissions = requiredPermissions.every(permission => hasPermission(permission));
    if (!hasRequiredPermissions) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Insufficient Permissions</h3>
            <p className="text-gray-600 mb-4">
              You don't have the required permissions to access this page.
            </p>
            <p className="text-sm text-gray-500 mb-2">
              Required permissions:
            </p>
            <ul className="text-sm text-gray-500 mb-6">
              {requiredPermissions.map(permission => (
                <li key={permission} className="mb-1">
                  • {permission.replace('can', '').replace(/([A-Z])/g, ' $1').toLowerCase()}
                </li>
              ))}
            </ul>
            <button
              onClick={() => window.history.back()}
              className="btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // If all checks pass, render the protected component
  return children || fallback;
};

// Higher-order component for admin-only routes
export const AdminRoute = ({ children, ...props }) => (
  <ProtectedRoute requiredRoles={['admin']} {...props}>
    {children}
  </ProtectedRoute>
);

// Higher-order component for invigilator and admin routes
export const InvigilatorRoute = ({ children, ...props }) => (
  <ProtectedRoute requiredRoles={['admin', 'invigilator']} {...props}>
    {children}
  </ProtectedRoute>
);

// Higher-order component for authenticated routes
export const AuthenticatedRoute = ({ children, ...props }) => (
  <ProtectedRoute requireAuth={true} {...props}>
    {children}
  </ProtectedRoute>
);

// Higher-order component for public routes (redirects to dashboard if authenticated)
export const PublicRoute = ({ children, ...props }) => (
  <ProtectedRoute requireAuth={false} {...props}>
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;