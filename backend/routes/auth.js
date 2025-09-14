const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');
const { authSchema, registerSchema, changePasswordSchema } = require('../validators/schemas');

// JWT secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { error, value } = authSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid login data',
        error: error.details[0].message
      });
    }

    const { username, password } = value;

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ],
      isActive: true
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    await user.updateLastLogin();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
        permissions: user.permissions
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Emit login event to dashboard
    req.io?.to('dashboard').emit('user-login', {
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
          employeeId: user.employeeId,
          permissions: user.permissions,
          profileImage: user.profileImage,
          lastLogin: user.lastLogin
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// POST /api/auth/register - Register new user (Admin only)
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration data',
        error: error.details[0].message
      });
    }

    const {
      username,
      email,
      password,
      fullName,
      role,
      department,
      employeeId,
      phone
    } = value;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
        ...(employeeId ? [{ employeeId }] : [])
      ]
    });

    if (existingUser) {
      let field = 'User';
      if (existingUser.username === username.toLowerCase()) field = 'Username';
      else if (existingUser.email === email.toLowerCase()) field = 'Email';
      else if (existingUser.employeeId === employeeId) field = 'Employee ID';
      
      return res.status(409).json({
        success: false,
        message: `${field} already exists`
      });
    }

    // Create new user
    const newUser = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      fullName,
      role,
      department,
      employeeId,
      phone,
      permissions: User.getRolePermissions(role),
      createdBy: req.user?.userId || null
    });

    await newUser.save();

    // Emit user creation event
    req.io?.to('dashboard').emit('user-created', {
      user: {
        id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        department: newUser.department
      },
      createdBy: req.user?.username || 'System',
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          department: newUser.department,
          employeeId: newUser.employeeId,
          permissions: newUser.permissions
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', (req, res) => {
  try {
    // Clear the HTTP-only cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    // Emit logout event
    if (req.user) {
      req.io?.to('dashboard').emit('user-logout', {
        user: {
          id: req.user.userId,
          username: req.user.username,
          fullName: req.user.fullName,
          role: req.user.role
        },
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const user = await User.findById(req.user.userId)
      .select('-password -loginAttempts -lockUntil');

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information',
      error: error.message
    });
  }
});

// POST /api/auth/change-password - Change user password
router.post('/change-password', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password data',
        error: error.details[0].message
      });
    }

    const { currentPassword, newPassword } = value;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Emit password change event
    req.io?.to('dashboard').emit('password-changed', {
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
});

// GET /api/auth/verify-token - Verify JWT token
router.get('/verify-token', (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        permissions: decoded.permissions
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

module.exports = router;