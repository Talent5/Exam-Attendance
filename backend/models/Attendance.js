const mongoose = require('mongoose');
const moment = require('moment-timezone');
const { Schema } = mongoose;

const attendanceSchema = new Schema({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  examId: {
    type: Schema.Types.ObjectId,
    ref: 'Exam',
    required: false, // Optional for backward compatibility
    default: null
  },
  rfidUid: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: function() {
      return moment.tz('Africa/Harare').toDate();
    }
  },
  date: {
    type: String,
    required: true,
    // Format: YYYY-MM-DD in CAT
    default: function() {
      return moment.tz('Africa/Harare').format('YYYY-MM-DD');
    }
  },
  time: {
    type: String,
    required: true,
    // Format: HH:MM:SS in CAT
    default: function() {
      return moment.tz('Africa/Harare').format('HH:mm:ss');
    }
  },
  dayOfWeek: {
    type: String,
    required: true,
    enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    default: function() {
      return moment.tz('Africa/Harare').format('dddd');
    }
  },
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'excused'],
    default: 'present'
  },
  entryType: {
    type: String,
    enum: ['entry', 'exit'],
    default: 'entry'
  },
  seatNumber: {
    type: String,
    trim: true,
    maxlength: [10, 'Seat number cannot exceed 10 characters'],
    default: null
  },
  invigilatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: null
  },
  attendanceType: {
    type: String,
    enum: ['exam', 'class', 'lab', 'tutorial'],
    default: 'exam'
  }
}, {
  timestamps: true
});

// Compound indexes for better performance
attendanceSchema.index({ studentId: 1, date: 1 });
attendanceSchema.index({ studentId: 1, examId: 1 });
attendanceSchema.index({ examId: 1, entryType: 1 });
attendanceSchema.index({ rfidUid: 1 });
attendanceSchema.index({ timestamp: -1 });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ invigilatorId: 1 });
attendanceSchema.index({ attendanceType: 1 });

// Virtual populate for student details
attendanceSchema.virtual('student', {
  ref: 'Student',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true
});

// Ensure virtual fields are serialised
attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Attendance', attendanceSchema);