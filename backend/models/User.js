const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  role: {
    type: String,
    enum: ['admin', 'invigilator'],
    default: 'invigilator',
    required: true
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  employeeId: {
    type: String,
    trim: true,
    sparse: true, // Allow multiple null values but unique non-null values
    maxlength: [20, 'Employee ID cannot exceed 20 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[0-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  profileImage: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  permissions: {
    canManageStudents: {
      type: Boolean,
      default: function() {
        return this.role === 'admin';
      }
    },
    canManageExams: {
      type: Boolean,
      default: function() {
        return this.role === 'admin';
      }
    },
    canManageUsers: {
      type: Boolean,
      default: function() {
        return this.role === 'admin';
      }
    },
    canViewReports: {
      type: Boolean,
      default: true
    },
    canControlScanner: {
      type: Boolean,
      default: true
    },
    canExportData: {
      type: Boolean,
      default: function() {
        return this.role === 'admin';
      }
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.loginAttempts;
      delete ret.lockUntil;
      return ret;
    }
  }
});

// Index for faster queries
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!candidatePassword) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function(callback) {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    }, callback);
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates, callback);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function(callback) {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  }, callback);
};

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to get role permissions
userSchema.statics.getRolePermissions = function(role) {
  const permissions = {
    admin: {
      canManageStudents: true,
      canManageExams: true,
      canManageUsers: true,
      canViewReports: true,
      canControlScanner: true,
      canExportData: true
    },
    invigilator: {
      canManageStudents: false,
      canManageExams: false,
      canManageUsers: false,
      canViewReports: true,
      canControlScanner: true,
      canExportData: false
    }
  };
  
  return permissions[role] || permissions.invigilator;
};

// Static method to create default admin
userSchema.statics.createDefaultAdmin = async function() {
  try {
    const adminExists = await this.findOne({ role: 'admin' });
    
    if (!adminExists) {
      const defaultAdmin = new this({
        username: 'admin',
        email: 'admin@examattendance.com',
        password: 'admin123',
        fullName: 'System Administrator',
        role: 'admin',
        department: 'IT',
        employeeId: 'ADM001',
        isActive: true
      });
      
      await defaultAdmin.save();
      console.log('✅ Default admin user created');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('⚠️  Please change the default password after first login');
      
      return defaultAdmin;
    }
    
    return adminExists;
  } catch (error) {
    console.error('Error creating default admin:', error);
    throw error;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;