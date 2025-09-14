const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { studentSchema, paginationSchema } = require('../validators/schemas');

// GET /api/students - Get all students with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { error, value } = paginationSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        error: error.details[0].message
      });
    }

    const { page, limit, sort } = value;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (value.course && value.course !== '') filter.course = new RegExp(value.course, 'i');
    if (value.search && value.search !== '') {
      filter.$or = [
        { name: new RegExp(value.search, 'i') },
        { regNo: new RegExp(value.search, 'i') },
        { course: new RegExp(value.search, 'i') }
      ];
    }

    const students = await Student.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Student.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: students,
      pagination: {
        currentPage: page,
        totalPages,
        totalStudents: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students',
      error: error.message
    });
  }
});

// GET /api/students/:id - Get student by ID
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student',
      error: error.message
    });
  }
});

// POST /api/students - Create new student (enrollment)
router.post('/', async (req, res) => {
  try {
    const { error, value } = studentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student data',
        error: error.details[0].message
      });
    }

    // Check if student with same regNo or rfidUid already exists
    const existingStudent = await Student.findOne({
      $or: [
        { regNo: value.regNo },
        { rfidUid: value.rfidUid }
      ]
    });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: existingStudent.regNo === value.regNo 
          ? 'Student with this registration number already exists'
          : 'Student with this RFID card already exists'
      });
    }

    const student = new Student(value);
    await student.save();

    // Clear student stats cache since data changed
    studentStatsCache.clear();

    // Emit real-time update
    req.io.to('dashboard').emit('student-enrolled', {
      student,
      message: `New student enrolled: ${student.name}`
    });

    res.status(201).json({
      success: true,
      message: 'Student enrolled successfully',
      data: student
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll student',
      error: error.message
    });
  }
});

// PUT /api/students/:id - Update student
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = studentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student data',
        error: error.details[0].message
      });
    }

    // Check if student with same regNo or rfidUid already exists (excluding current student)
    const existingStudent = await Student.findOne({
      _id: { $ne: req.params.id },
      $or: [
        { regNo: value.regNo },
        { rfidUid: value.rfidUid }
      ]
    });

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: existingStudent.regNo === value.regNo 
          ? 'Student with this registration number already exists'
          : 'Student with this RFID card already exists'
      });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student',
      error: error.message
    });
  }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete student',
      error: error.message
    });
  }
});

// Simple in-memory cache for student stats
const studentStatsCache = new Map();
const CACHE_DURATION = 60000; // 1 minute for student stats (changes less frequently)

const getCachedStudentStats = (key) => {
  const cached = studentStatsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedStudentStats = (key, data) => {
  studentStatsCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// GET /api/students/stats/summary - Get student statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const cacheKey = 'student-stats';
    
    // Check cache first
    const cachedData = getCachedStudentStats(cacheKey);
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Execute queries in parallel
    const [totalStudents, courseStats] = await Promise.all([
      Student.countDocuments(),
      Student.aggregate([
        {
          $group: {
            _id: '$course',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ])
    ]);

    const statsData = {
      totalStudents,
      courseStats
    };

    // Cache the results
    setCachedStudentStats(cacheKey, statsData);

    res.json({
      success: true,
      data: statsData
    });
  } catch (error) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student statistics',
      error: error.message
    });
  }
});

module.exports = router;