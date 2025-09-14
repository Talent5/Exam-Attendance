import React, { createContext, useContext, useReducer, useEffect } from 'react';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: null
};

// Actions
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  LOAD_USER: 'LOAD_USER',
  UPDATE_USER: 'UPDATE_USER',
  SET_LOADING: 'SET_LOADING'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true
      };
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false
      };
    
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      };
    
    case AUTH_ACTIONS.LOAD_USER:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false
      };
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
    
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user from localStorage on app start
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (token && user) {
          const parsedUser = JSON.parse(user);
          dispatch({
            type: AUTH_ACTIONS.LOAD_USER,
            payload: { user: parsedUser, token }
          });
        } else {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    loadUserFromStorage();
  }, []);

  // Verify token validity on app start
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('/api/auth/verify-token', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (response.status === 401) {
          // Token is invalid or expired
          logout();
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        // Don't logout on network errors, just log the error
      }
    };

    if (state.isAuthenticated && state.token) {
      verifyToken();
    }
  }, [state.isAuthenticated, state.token]);

  // Login function
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (data.success) {
        // Store in localStorage
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: data.data.user,
            token: data.data.token
          }
        });

        toast.success(`Welcome back, ${data.data.user.fullName}!`);
        return { success: true, user: data.data.user };
      } else {
        dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE });
        toast.error(data.message || 'Login failed');
        return { success: false, message: data.message };
      }
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE });
      toast.error('Connection error. Please try again.');
      return { success: false, message: 'Connection error' };
    }
  };

  // Logout function
  const logout = async (showToast = true) => {
    try {
      // Call logout endpoint to clear server-side session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    dispatch({ type: AUTH_ACTIONS.LOGOUT });

    if (showToast) {
      toast.success('Logged out successfully');
    }
  };

  // Update user profile
  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData
    });
    
    toast.success('Profile updated successfully');
  };

  // Change password
  const changePassword = async (passwordData) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        credentials: 'include',
        body: JSON.stringify(passwordData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Password changed successfully');
        return { success: true };
      } else {
        toast.error(data.message || 'Failed to change password');
        return { success: false, message: data.message };
      }
    } catch (error) {
      toast.error('Connection error. Please try again.');
      return { success: false, message: 'Connection error' };
    }
  };

  // Get current user info from server
  const getCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        const updatedUser = data.data.user;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: updatedUser
        });
        
        return { success: true, user: updatedUser };
      } else {
        if (response.status === 401) {
          logout(false);
        }
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Get current user error:', error);
      return { success: false, message: 'Connection error' };
    }
  };

  // Check if user has specific permission
  const hasPermission = (permission) => {
    if (!state.user || !state.user.permissions) {
      return false;
    }
    return state.user.permissions[permission] === true;
  };

  // Check if user has specific role
  const hasRole = (role) => {
    if (!state.user) {
      return false;
    }
    if (Array.isArray(role)) {
      return role.includes(state.user.role);
    }
    return state.user.role === role;
  };

  // Check if user is admin
  const isAdmin = () => hasRole('admin');

  // Check if user is invigilator
  const isInvigilator = () => hasRole('invigilator');

  const value = {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    token: state.token,
    
    // Actions
    login,
    logout,
    updateUser,
    changePassword,
    getCurrentUser,
    
    // Utility functions
    hasPermission,
    hasRole,
    isAdmin,
    isInvigilator
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;