const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authenticate, adminOnly } = require('../middleware/auth');
const { 
  createUserSchema, 
  updateUserSchema, 
  userQuerySchema 
} = require('../validators/schemas');

// GET /api/users - Get all users (Admin only)
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { error, value } = userQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        error: error.details[0].message
      });
    }

    const { page, limit, role, search, sort } = value;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { username: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { fullName: new RegExp(search, 'i') }
      ];
    }

    // Build sort object
    const sortObj = {};
    if (sort.startsWith('-')) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// GET /api/users/:id - Get user by ID (Admin only)
router.get('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// POST /api/users - Create new user (Admin only)
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user data',
        error: error.details[0].message
      });
    }

    const { username, email, password, fullName, role, department, phone } = value;

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      fullName,
      role,
      department,
      phone,
      createdBy: req.user.id,
      isActive: true
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    // Emit real-time update
    req.io.to('admin').emit('user-created', {
      user: userResponse,
      message: `New ${role} account created: ${fullName}`,
      createdBy: req.user.fullName
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
});

// PUT /api/users/:id - Update user (Admin only)
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user data',
        error: error.details[0].message
      });
    }

    const userId = req.params.id;
    const updateData = { ...value };

    // Don't allow updating your own account to prevent lockout
    if (userId === req.user.id && updateData.role && updateData.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own admin role'
      });
    }

    // Don't allow deactivating your own account
    if (userId === req.user.id && updateData.isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    // Hash password if provided
    if (updateData.password) {
      const salt = await bcrypt.genSalt(12);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    updateData.updatedBy = req.user.id;
    updateData.updatedAt = new Date();

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Emit real-time update
    req.io.to('admin').emit('user-updated', {
      user,
      message: `User account updated: ${user.fullName}`,
      updatedBy: req.user.fullName
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// DELETE /api/users/:id - Soft delete user (Admin only)
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;

    // Don't allow deleting your own account
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive: false,
        deletedBy: req.user.id,
        deletedAt: new Date()
      },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Emit real-time update
    req.io.to('admin').emit('user-deleted', {
      user,
      message: `User account deactivated: ${user.fullName}`,
      deletedBy: req.user.fullName
    });

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
});

// POST /api/users/:id/activate - Reactivate user (Admin only)
router.post('/:id/activate', authenticate, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: true,
        $unset: { deletedBy: 1, deletedAt: 1 },
        updatedBy: req.user.id,
        updatedAt: new Date()
      },
      { new: true, select: '-password' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Emit real-time update
    req.io.to('admin').emit('user-activated', {
      user,
      message: `User account reactivated: ${user.fullName}`,
      activatedBy: req.user.fullName
    });

    res.json({
      success: true,
      message: 'User reactivated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error reactivating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate user',
      error: error.message
    });
  }
});

// GET /api/users/stats - Get user statistics (Admin only)
router.get('/stats/overview', authenticate, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
    const invigilatorCount = await User.countDocuments({ role: 'invigilator', isActive: true });
    const inactiveCount = await User.countDocuments({ isActive: false });

    // Department breakdown
    const departmentStats = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          roles: { $push: '$role' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Recent users (last 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: last7Days },
      isActive: true
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          adminCount,
          invigilatorCount,
          inactiveCount,
          recentUsers
        },
        departmentStats
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
});

module.exports = router;
