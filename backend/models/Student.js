const mongoose = require('mongoose');
const { Schema } = mongoose;

const studentSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  regNo: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  course: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  rfidUid: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better performance
studentSchema.index({ rfidUid: 1 });
studentSchema.index({ regNo: 1 });
studentSchema.index({ course: 1 });

module.exports = mongoose.model('Student', studentSchema);