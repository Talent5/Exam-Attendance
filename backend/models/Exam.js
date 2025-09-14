const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  examId: {
    type: String,
    required: [true, 'Exam ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]{3,20}$/, 'Exam ID must contain only uppercase letters and numbers, 3-20 characters']
  },
  examName: {
    type: String,
    required: [true, 'Exam name is required'],
    trim: true,
    maxlength: [200, 'Exam name cannot exceed 200 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [100, 'Subject cannot exceed 100 characters']
  },
  course: {
    type: String,
    required: [true, 'Course is required'],
    trim: true,
    maxlength: [100, 'Course cannot exceed 100 characters']
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    trim: true,
    match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)']
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    enum: ['1', '2', 'Summer'],
    trim: true
  },
  examType: {
    type: String,
    required: [true, 'Exam type is required'],
    enum: ['Midterm', 'Final', 'Quiz', 'Assignment', 'Practical', 'Viva', 'Other'],
    default: 'Final'
  },
  examDate: {
    type: Date,
    required: [true, 'Exam date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Exam date must be in the future'
    }
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [15, 'Duration must be at least 15 minutes'],
    max: [480, 'Duration cannot exceed 8 hours (480 minutes)']
  },
  venue: {
    room: {
      type: String,
      required: [true, 'Room is required'],
      trim: true,
      maxlength: [50, 'Room cannot exceed 50 characters']
    },
    building: {
      type: String,
      trim: true,
      maxlength: [100, 'Building cannot exceed 100 characters']
    },
    capacity: {
      type: Number,
      min: [1, 'Capacity must be at least 1'],
      max: [1000, 'Capacity cannot exceed 1000']
    },
    floor: {
      type: String,
      trim: true,
      maxlength: [20, 'Floor cannot exceed 20 characters']
    }
  },
  invigilators: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['Chief Invigilator', 'Assistant Invigilator'],
      default: 'Assistant Invigilator'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  enrolledStudents: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    regNo: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    seatNumber: {
      type: String,
      trim: true,
      maxlength: [10, 'Seat number cannot exceed 10 characters']
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    }
  }],
  attendanceSettings: {
    allowLateEntry: {
      type: Boolean,
      default: true
    },
    lateEntryGracePeriod: {
      type: Number,
      default: 15, // minutes after start time
      min: [0, 'Grace period cannot be negative'],
      max: [60, 'Grace period cannot exceed 60 minutes']
    },
    requireExitScan: {
      type: Boolean,
      default: false
    },
    autoMarkAbsent: {
      type: Boolean,
      default: true
    },
    absentMarkingTime: {
      type: Number,
      default: 30, // minutes after start time
      min: [0, 'Absent marking time cannot be negative']
    }
  },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed'],
    default: 'Scheduled'
  },
  instructions: {
    type: String,
    maxlength: [1000, 'Instructions cannot exceed 1000 characters']
  },
  totalMarks: {
    type: Number,
    min: [0, 'Total marks cannot be negative'],
    max: [1000, 'Total marks cannot exceed 1000']
  },
  passingMarks: {
    type: Number,
    min: [0, 'Passing marks cannot be negative'],
    validate: {
      validator: function(value) {
        return !this.totalMarks || value <= this.totalMarks;
      },
      message: 'Passing marks cannot exceed total marks'
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
examSchema.index({ examId: 1 });
examSchema.index({ examDate: 1 });
examSchema.index({ course: 1 });
examSchema.index({ subject: 1 });
examSchema.index({ status: 1 });
examSchema.index({ 'invigilators.userId': 1 });
examSchema.index({ 'enrolledStudents.studentId': 1 });
examSchema.index({ createdBy: 1 });

// Virtual for formatted exam date and time
examSchema.virtual('formattedDateTime').get(function() {
  const date = this.examDate.toLocaleDateString();
  return `${date} ${this.startTime} - ${this.endTime}`;
});

// Virtual for total enrolled students
examSchema.virtual('totalEnrolledStudents').get(function() {
  return this.enrolledStudents.length;
});

// Virtual for total invigilators
examSchema.virtual('totalInvigilators').get(function() {
  return this.invigilators.length;
});

// Virtual for exam status color (for UI)
examSchema.virtual('statusColor').get(function() {
  const colors = {
    'Scheduled': 'blue',
    'In Progress': 'green',
    'Completed': 'gray',
    'Cancelled': 'red',
    'Postponed': 'yellow'
  };
  return colors[this.status] || 'gray';
});

// Virtual to check if exam is currently active
examSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  const examDateTime = new Date(this.examDate);
  const [startHour, startMin] = this.startTime.split(':');
  const [endHour, endMin] = this.endTime.split(':');
  
  const startDateTime = new Date(examDateTime);
  startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
  
  const endDateTime = new Date(examDateTime);
  endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);
  
  return now >= startDateTime && now <= endDateTime && this.status === 'In Progress';
});

// Pre-save middleware to calculate duration if not provided
examSchema.pre('save', function(next) {
  if (this.startTime && this.endTime && !this.duration) {
    const [startHour, startMin] = this.startTime.split(':');
    const [endHour, endMin] = this.endTime.split(':');
    
    const startMinutes = parseInt(startHour) * 60 + parseInt(startMin);
    const endMinutes = parseInt(endHour) * 60 + parseInt(endMin);
    
    this.duration = endMinutes - startMinutes;
  }
  next();
});

// Pre-save middleware to validate time logic
examSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const [startHour, startMin] = this.startTime.split(':');
    const [endHour, endMin] = this.endTime.split(':');
    
    const startMinutes = parseInt(startHour) * 60 + parseInt(startMin);
    const endMinutes = parseInt(endHour) * 60 + parseInt(endMin);
    
    if (endMinutes <= startMinutes) {
      return next(new Error('End time must be after start time'));
    }
  }
  next();
});

// Method to add invigilator
examSchema.methods.addInvigilator = function(userId, name, role = 'Assistant Invigilator') {
  // Check if invigilator already exists
  const exists = this.invigilators.some(inv => inv.userId.toString() === userId.toString());
  if (exists) {
    throw new Error('Invigilator is already assigned to this exam');
  }
  
  this.invigilators.push({
    userId,
    name,
    role,
    assignedAt: new Date()
  });
  
  return this.save();
};

// Method to remove invigilator
examSchema.methods.removeInvigilator = function(userId) {
  this.invigilators = this.invigilators.filter(
    inv => inv.userId.toString() !== userId.toString()
  );
  return this.save();
};

// Method to enroll student
examSchema.methods.enrollStudent = function(studentId, regNo, name, seatNumber = null) {
  // Check if student already enrolled
  const exists = this.enrolledStudents.some(student => 
    student.studentId.toString() === studentId.toString()
  );
  if (exists) {
    throw new Error('Student is already enrolled in this exam');
  }
  
  this.enrolledStudents.push({
    studentId,
    regNo,
    name,
    seatNumber,
    enrolledAt: new Date()
  });
  
  return this.save();
};

// Method to unenroll student
examSchema.methods.unenrollStudent = function(studentId) {
  this.enrolledStudents = this.enrolledStudents.filter(
    student => student.studentId.toString() !== studentId.toString()
  );
  return this.save();
};

// Method to update exam status
examSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  this.lastModifiedBy = userId;
  return this.save();
};

// Static method to get upcoming exams
examSchema.statics.getUpcomingExams = function(limit = 10) {
  return this.find({
    examDate: { $gte: new Date() },
    status: { $in: ['Scheduled', 'In Progress'] },
    isActive: true
  })
  .populate('invigilators.userId', 'fullName username')
  .populate('enrolledStudents.studentId', 'name regNo')
  .populate('createdBy', 'fullName username')
  .sort({ examDate: 1 })
  .limit(limit);
};

// Static method to get exams by invigilator
examSchema.statics.getExamsByInvigilator = function(userId, limit = 20) {
  return this.find({
    'invigilators.userId': userId,
    isActive: true
  })
  .populate('invigilators.userId', 'fullName username')
  .populate('enrolledStudents.studentId', 'name regNo')
  .populate('createdBy', 'fullName username')
  .sort({ examDate: -1 })
  .limit(limit);
};

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;