import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthDebug = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-sm">
      <h3 className="font-bold mb-2">Auth Debug Info</h3>
      <div className="space-y-1">
        <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
        <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
        <div>User: {user ? user.fullName : 'None'}</div>
        <div>Role: {user ? user.role : 'None'}</div>
        <div>Token in localStorage: {token ? 'Yes' : 'No'}</div>
        <div>User in localStorage: {storedUser ? 'Yes' : 'No'}</div>
        {token && (
          <div className="mt-2 break-all">
            Token: {token.substring(0, 20)}...
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthDebug;