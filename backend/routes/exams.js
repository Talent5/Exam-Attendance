const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const User = require('../models/User');
const { examSchema } = require('../validators/schemas');
const { authenticate, requirePermission, adminOnly } = require('../middleware/auth');

// GET /api/exams - Get all exams with filtering and pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      course,
      examType,
      startDate,
      endDate,
      invigilatorId,
      search
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = { isActive: true };

    // Apply filters
    if (status) filter.status = status;
    if (course) filter.course = new RegExp(course, 'i');
    if (examType) filter.examType = examType;
    if (invigilatorId) filter['invigilators.userId'] = invigilatorId;

    // Date range filter
    if (startDate || endDate) {
      filter.examDate = {};
      if (startDate) filter.examDate.$gte = new Date(startDate);
      if (endDate) filter.examDate.$lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      filter.$or = [
        { examName: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
        { examId: new RegExp(search, 'i') }
      ];
    }

    // If user is invigilator, only show their assigned exams
    if (req.user.role === 'invigilator') {
      filter['invigilators.userId'] = req.user.userId;
    }

    const exams = await Exam.find(filter)
      .populate('invigilators.userId', 'fullName username department')
      .populate('createdBy', 'fullName username')
      .populate('lastModifiedBy', 'fullName username')
      .sort({ examDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Exam.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: exams,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRecords: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exams',
      error: error.message
    });
  }
});

// GET /api/exams/upcoming - Get upcoming exams
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    let exams;
    if (req.user.role === 'invigilator') {
      // Invigilators only see their assigned exams
      exams = await Exam.getExamsByInvigilator(req.user.userId, parseInt(limit));
    } else {
      // Admins see all upcoming exams
      exams = await Exam.getUpcomingExams(parseInt(limit));
    }

    res.json({
      success: true,
      data: exams
    });
  } catch (error) {
    console.error('Error fetching upcoming exams:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming exams',
      error: error.message
    });
  }
});

// GET /api/exams/:id - Get exam by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('invigilators.userId', 'fullName username department employeeId')
      .populate('enrolledStudents.studentId', 'name regNo course rfidUid')
      .populate('createdBy', 'fullName username')
      .populate('lastModifiedBy', 'fullName username');

    if (!exam || !exam.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if invigilator has access to this exam
    if (req.user.role === 'invigilator') {
      const hasAccess = exam.invigilators.some(inv => 
        inv.userId._id.toString() === req.user.userId.toString()
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this exam.'
        });
      }
    }

    res.json({
      success: true,
      data: exam
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam',
      error: error.message
    });
  }
});

// POST /api/exams - Create new exam (Admin only)
router.post('/', authenticate, requirePermission('canManageExams'), async (req, res) => {
  try {
    const { error, value } = examSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam data',
        error: error.details[0].message
      });
    }

    // Check if exam ID already exists
    const existingExam = await Exam.findOne({ 
      examId: value.examId,
      isActive: true 
    });

    if (existingExam) {
      return res.status(409).json({
        success: false,
        message: 'Exam ID already exists'
      });
    }

    const newExam = new Exam({
      ...value,
      createdBy: req.user.userId
    });

    await newExam.save();

    const populatedExam = await Exam.findById(newExam._id)
      .populate('createdBy', 'fullName username');

    // Emit exam creation event
    req.io?.to('dashboard').emit('exam-created', {
      exam: populatedExam,
      createdBy: req.user.fullName,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: populatedExam
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create exam',
      error: error.message
    });
  }
});

// PUT /api/exams/:id - Update exam (Admin only)
router.put('/:id', authenticate, requirePermission('canManageExams'), async (req, res) => {
  try {
    const { error, value } = examSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exam data',
        error: error.details[0].message
      });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam || !exam.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if exam ID conflicts with another exam
    if (value.examId !== exam.examId) {
      const existingExam = await Exam.findOne({ 
        examId: value.examId,
        _id: { $ne: req.params.id },
        isActive: true 
      });

      if (existingExam) {
        return res.status(409).json({
          success: false,
          message: 'Exam ID already exists'
        });
      }
    }

    // Update exam
    Object.assign(exam, value);
    exam.lastModifiedBy = req.user.userId;
    await exam.save();

    const updatedExam = await Exam.findById(exam._id)
      .populate('invigilators.userId', 'fullName username')
      .populate('createdBy', 'fullName username')
      .populate('lastModifiedBy', 'fullName username');

    // Emit exam update event
    req.io?.to('dashboard').emit('exam-updated', {
      exam: updatedExam,
      updatedBy: req.user.fullName,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: updatedExam
    });
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exam',
      error: error.message
    });
  }
});

// DELETE /api/exams/:id - Delete exam (Admin only)
router.delete('/:id', authenticate, requirePermission('canManageExams'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam || !exam.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Soft delete
    exam.isActive = false;
    exam.lastModifiedBy = req.user.userId;
    await exam.save();

    // Emit exam deletion event
    req.io?.to('dashboard').emit('exam-deleted', {
      examId: exam.examId,
      examName: exam.examName,
      deletedBy: req.user.fullName,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete exam',
      error: error.message
    });
  }
});

// POST /api/exams/:id/invigilators - Add invigilator to exam (Admin only)
router.post('/:id/invigilators', authenticate, requirePermission('canManageExams'), async (req, res) => {
  try {
    const { userId, role = 'Assistant Invigilator' } = req.body;

    const exam = await Exam.findById(req.params.id);
    if (!exam || !exam.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.isActive || user.role !== 'invigilator') {
      return res.status(404).json({
        success: false,
        message: 'Invigilator not found or invalid'
      });
    }

    await exam.addInvigilator(userId, user.fullName, role);

    const updatedExam = await Exam.findById(exam._id)
      .populate('invigilators.userId', 'fullName username department');

    res.json({
      success: true,
      message: 'Invigilator added successfully',
      data: updatedExam
    });
  } catch (error) {
    console.error('Error adding invigilator:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'Invigilator is already assigned to this exam' ? 
               error.message : 'Failed to add invigilator',
      error: error.message
    });
  }
});

// DELETE /api/exams/:id/invigilators/:userId - Remove invigilator from exam (Admin only)
router.delete('/:id/invigilators/:userId', authenticate, requirePermission('canManageExams'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam || !exam.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    await exam.removeInvigilator(req.params.userId);

    const updatedExam = await Exam.findById(exam._id)
      .populate('invigilators.userId', 'fullName username department');

    res.json({
      success: true,
      message: 'Invigilator removed successfully',
      data: updatedExam
    });
  } catch (error) {
    console.error('Error removing invigilator:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove invigilator',
      error: error.message
    });
  }
});

// POST /api/exams/:id/students - Enroll student in exam (Admin only)
router.post('/:id/students', authenticate, requirePermission('canManageExams'), async (req, res) => {
  try {
    const { studentId, seatNumber } = req.body;

    const exam = await Exam.findById(req.params.id);
    if (!exam || !exam.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    await exam.enrollStudent(studentId, student.regNo, student.name, seatNumber);

    const updatedExam = await Exam.findById(exam._id)
      .populate('enrolledStudents.studentId', 'name regNo course');

    res.json({
      success: true,
      message: 'Student enrolled successfully',
      data: updatedExam
    });
  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'Student is already enrolled in this exam' ? 
               error.message : 'Failed to enroll student',
      error: error.message
    });
  }
});

// PUT /api/exams/:id/status - Update exam status
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        validStatuses
      });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam || !exam.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check permissions - Admin can change any status, Invigilators can only start/complete assigned exams
    if (req.user.role === 'invigilator') {
      const hasAccess = exam.invigilators.some(inv => 
        inv.userId.toString() === req.user.userId.toString()
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this exam.'
        });
      }

      // Invigilators can only change to In Progress or Completed
      if (!['In Progress', 'Completed'].includes(status)) {
        return res.status(403).json({
          success: false,
          message: 'You can only start or complete exams.'
        });
      }
    }

    await exam.updateStatus(status, req.user.userId);

    const updatedExam = await Exam.findById(exam._id)
      .populate('lastModifiedBy', 'fullName username');

    // Emit status change event
    req.io?.to('dashboard').emit('exam-status-changed', {
      exam: {
        id: exam._id,
        examId: exam.examId,
        examName: exam.examName,
        status: status
      },
      changedBy: req.user.fullName,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `Exam status updated to ${status}`,
      data: updatedExam
    });
  } catch (error) {
    console.error('Error updating exam status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exam status',
      error: error.message
    });
  }
});

module.exports = router;