const Joi = require('joi');

// Student validation schema
const studentSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  regNo: Joi.string().trim().uppercase().required(),
  course: Joi.string().trim().max(100).required(),
  rfidUid: Joi.string().trim().uppercase().required()
});

// Authentication validation schemas
const authSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required(),
  password: Joi.string().min(6).required()
});

const registerSchema = Joi.object({
  username: Joi.string().trim().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().trim().max(100).required(),
  role: Joi.string().valid('admin', 'invigilator').default('invigilator'),
  department: Joi.string().trim().max(100).optional(),
  employeeId: Joi.string().trim().max(20).optional(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

// Exam validation schemas
const examSchema = Joi.object({
  examId: Joi.string().trim().uppercase().min(3).max(20).required(),
  examName: Joi.string().trim().max(200).required(),
  subject: Joi.string().trim().max(100).required(),
  course: Joi.string().trim().max(100).required(),
  academicYear: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
  semester: Joi.string().valid('1', '2', 'Summer').required(),
  examType: Joi.string().valid('Midterm', 'Final', 'Quiz', 'Assignment', 'Practical', 'Viva', 'Other').default('Final'),
  examDate: Joi.date().greater('now').required(),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  duration: Joi.number().min(15).max(480).optional(),
  venue: Joi.object({
    room: Joi.string().trim().max(50).required(),
    building: Joi.string().trim().max(100).optional(),
    capacity: Joi.number().min(1).max(1000).optional(),
    floor: Joi.string().trim().max(20).optional()
  }).required(),
  instructions: Joi.string().max(1000).optional(),
  totalMarks: Joi.number().min(0).max(1000).optional(),
  passingMarks: Joi.number().min(0).optional(),
  attendanceSettings: Joi.object({
    allowLateEntry: Joi.boolean().default(true),
    lateEntryGracePeriod: Joi.number().min(0).max(60).default(15),
    requireExitScan: Joi.boolean().default(false),
    autoMarkAbsent: Joi.boolean().default(true),
    absentMarkingTime: Joi.number().min(0).default(30)
  }).optional()
});

// Attendance scan validation schema
const scanSchema = Joi.object({
  rfidUid: Joi.string().trim().uppercase().required(),
  timestamp: Joi.date().optional()
});

// Query validation schemas
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid('name', 'regNo', 'course', 'enrolledAt', '-name', '-regNo', '-course', '-enrolledAt').default('-enrolledAt'),
  search: Joi.string().allow('').optional(),
  course: Joi.string().allow('').optional()
});

const attendanceQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  startDate: Joi.alternatives().try(
    Joi.date(),
    Joi.string().allow('').optional()
  ).optional(),
  endDate: Joi.alternatives().try(
    Joi.date(),
    Joi.string().allow('').optional()
  ).optional(),
  studentId: Joi.string().allow('').optional(),
  course: Joi.string().allow('').optional(),
  sort: Joi.string().valid('timestamp', 'date', 'time', '-timestamp', '-date', '-time').default('-timestamp')
});

// User management schemas
const createUserSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().trim().min(2).max(100).required(),
  role: Joi.string().valid('admin', 'invigilator').required(),
  department: Joi.string().trim().min(2).max(100).required(),
  employeeId: Joi.string().trim().max(20).optional(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional()
});

const updateUserSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(30),
  email: Joi.string().email(),
  password: Joi.string().min(6),
  fullName: Joi.string().trim().min(2).max(100),
  role: Joi.string().valid('admin', 'invigilator'),
  department: Joi.string().trim().min(2).max(100),
  employeeId: Joi.string().trim().max(20).allow(''),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow(''),
  isActive: Joi.boolean()
}).min(1);

const userQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  role: Joi.string().valid('admin', 'invigilator', '').allow(''),
  search: Joi.string().max(100).allow(''),
  sort: Joi.string().valid('fullName', '-fullName', 'createdAt', '-createdAt', 'role', '-role', 'department', '-department').default('-createdAt')
});

module.exports = {
  studentSchema,
  scanSchema,
  paginationSchema,
  attendanceQuerySchema,
  authSchema,
  registerSchema,
  changePasswordSchema,
  examSchema,
  createUserSchema,
  updateUserSchema,
  userQuerySchema
};