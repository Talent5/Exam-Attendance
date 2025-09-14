const express = require('express');
const router = express.Router();
const moment = require('moment');
const { Parser } = require('json2csv');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { scanSchema, attendanceQuerySchema } = require('../validators/schemas');

// POST /api/attendance/scan - Record attendance scan from ESP32
router.post('/scan', async (req, res) => {
  try {
    const { error, value } = scanSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scan data',
        error: error.details[0].message
      });
    }

    const { rfidUid, timestamp } = value;
    const scanTime = timestamp ? new Date(timestamp) : new Date();

    // Find student by RFID UID
    const student = await Student.findOne({ rfidUid });
    
    if (!student) {
      // Log unknown card scan
      console.log(`Unknown RFID card scanned: ${rfidUid} at ${scanTime}`);
      
      // Emit real-time update for unknown card
      req.io.to('dashboard').emit('unknown-card-scan', {
        rfidUid,
        timestamp: scanTime,
        message: 'Unknown RFID card detected'
      });

      return res.status(404).json({
        success: false,
        message: 'Unknown RFID card. Please enroll the student first.',
        data: { rfidUid, timestamp: scanTime }
      });
    }

    // Check if already scanned today
    const today = scanTime.toISOString().split('T')[0];
    const existingAttendance = await Attendance.findOne({
      studentId: student._id,
      date: today
    });

    if (existingAttendance) {
      // Update existing attendance with latest scan time
      existingAttendance.timestamp = scanTime;
      existingAttendance.time = scanTime.toTimeString().split(' ')[0];
      await existingAttendance.save();

      const populatedAttendance = await Attendance.findById(existingAttendance._id)
        .populate('studentId', 'name regNo course');

      // Clear stats cache since attendance data changed
      statsCache.clear();

      // Emit real-time update
      req.io.to('dashboard').emit('attendance-updated', {
        attendance: populatedAttendance,
        message: `${student.name} scanned again today`
      });

      return res.json({
        success: true,
        message: 'Attendance updated - student already scanned today',
        data: populatedAttendance
      });
    }

    // Create new attendance record
    const attendanceData = {
      studentId: student._id,
      rfidUid,
      timestamp: scanTime,
      date: today,
      time: scanTime.toTimeString().split(' ')[0],
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][scanTime.getDay()]
    };

    const attendance = new Attendance(attendanceData);
    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('studentId', 'name regNo course');

    // Clear stats cache since attendance data changed
    statsCache.clear();

    // Emit real-time update
    req.io.to('dashboard').emit('new-attendance', {
      attendance: populatedAttendance,
      message: `${student.name} marked present`
    });

    res.status(201).json({
      success: true,
      message: 'Attendance recorded successfully',
      data: populatedAttendance
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record attendance',
      error: error.message
    });
  }
});

// GET /api/attendance - Get attendance records with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { error, value } = attendanceQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        error: error.details[0].message
      });
    }

    const { page, limit, startDate, endDate, studentId, course, sort } = value;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    
    // Only add date filters if they are valid dates (not empty strings)
    if ((startDate && startDate !== '') || (endDate && endDate !== '')) {
      filter.timestamp = {};
      if (startDate && startDate !== '') filter.timestamp.$gte = new Date(startDate);
      if (endDate && endDate !== '') filter.timestamp.$lte = new Date(endDate);
    }
    
    if (studentId) filter.studentId = studentId;

    // Create aggregation pipeline
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $match: course ? { 'student.course': new RegExp(course, 'i') } : {}
      },
      {
        $sort: sort.startsWith('-') 
          ? { [sort.substring(1)]: -1 }
          : { [sort]: 1 }
      },
      { $skip: skip },
      { $limit: limit }
    ];

    const attendance = await Attendance.aggregate(pipeline);
    
    // Get total count for pagination
    const countPipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $match: course ? { 'student.course': new RegExp(course, 'i') } : {}
      },
      { $count: 'total' }
    ];

    const countResult = await Attendance.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: attendance,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
});

// GET /api/attendance/export - Export attendance data as CSV
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate, course } = req.query;
    
    // Build filter
    const filter = {};
    if ((startDate && startDate !== '') || (endDate && endDate !== '')) {
      filter.timestamp = {};
      if (startDate && startDate !== '') filter.timestamp.$gte = new Date(startDate);
      if (endDate && endDate !== '') filter.timestamp.$lte = new Date(endDate);
    }

    // Aggregate attendance data with student info
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $match: course ? { 'student.course': new RegExp(course, 'i') } : {}
      },
      {
        $project: {
          'Student Name': '$student.name',
          'Registration No': '$student.regNo',
          'Course': '$student.course',
          'RFID UID': '$rfidUid',
          'Date': '$date',
          'Time': '$time',
          'Day of Week': '$dayOfWeek',
          'Status': '$status',
          'Timestamp': '$timestamp'
        }
      },
      { $sort: { 'Timestamp': -1 } }
    ];

    const attendanceData = await Attendance.aggregate(pipeline);

    if (attendanceData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No attendance records found for the specified criteria'
      });
    }

    // Convert to CSV
    const parser = new Parser();
    const csv = parser.parse(attendanceData);

    // Set response headers for file download
    const filename = `attendance_export_${moment().format('YYYY-MM-DD_HH-mm-ss')}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(csv);
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export attendance data',
      error: error.message
    });
  }
});

// Simple in-memory cache for stats
const statsCache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

const getCachedStats = (key) => {
  const cached = statsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedStats = (key, data) => {
  statsCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// GET /api/attendance/stats - Get attendance statistics
router.get('/stats', async (req, res) => {
  try {
    const cacheKey = 'attendance-stats';
    
    // Check cache first
    const cachedData = getCachedStats(cacheKey);
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const thisWeekStart = moment().startOf('week').toDate();
    const thisWeekEnd = moment().endOf('week').toDate();

    // Use Promise.all for parallel execution
    const [todayAttendance, weekAttendance, totalAttendance] = await Promise.all([
      Attendance.countDocuments({ date: today }),
      Attendance.countDocuments({
        timestamp: { $gte: thisWeekStart, $lte: thisWeekEnd }
      }),
      Attendance.countDocuments()
    ]);

    // Execute complex aggregations in parallel
    const [courseStats, last7DaysData, topStudents] = await Promise.all([
      // Course-wise attendance stats
      Attendance.aggregate([
        {
          $lookup: {
            from: 'students',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $unwind: '$student' },
        {
          $group: {
            _id: '$student.course',
            count: { $sum: 1 },
            uniqueStudents: { $addToSet: '$studentId' }
          }
        },
        {
          $project: {
            _id: 1,
            count: 1,
            uniqueStudents: { $size: '$uniqueStudents' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Daily attendance for the last 7 days (optimized)
      Attendance.aggregate([
        {
          $match: {
            date: {
              $gte: moment().subtract(6, 'days').format('YYYY-MM-DD'),
              $lte: today
            }
          }
        },
        {
          $group: {
            _id: '$date',
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Most active students (top 10)
      Attendance.aggregate([
        {
          $group: {
            _id: '$studentId',
            attendanceCount: { $sum: 1 },
            lastScan: { $max: '$timestamp' }
          }
        },
        {
          $lookup: {
            from: 'students',
            localField: '_id',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $unwind: '$student' },
        {
          $project: {
            name: '$student.name',
            regNo: '$student.regNo',
            course: '$student.course',
            attendanceCount: 1,
            lastScan: 1
          }
        },
        { $sort: { attendanceCount: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Transform last 7 days data to include missing dates
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days');
      const dateStr = date.format('YYYY-MM-DD');
      const dayData = last7DaysData.find(d => d._id === dateStr);
      last7Days.push({
        date: dateStr,
        day: date.format('dddd'),
        count: dayData ? dayData.count : 0
      });
    }

    const statsData = {
      summary: {
        todayAttendance,
        weekAttendance,
        totalAttendance
      },
      courseStats,
      dailyTrend: last7Days,
      topStudents
    };

    // Cache the results
    setCachedStats(cacheKey, statsData);

    res.json({
      success: true,
      data: statsData
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance statistics',
      error: error.message
    });
  }
});

module.exports = router;