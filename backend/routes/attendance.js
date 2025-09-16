const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const { Parser } = require('json2csv');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { scanSchema, attendanceQuerySchema } = require('../validators/schemas');

// POST /api/attendance/scan - Record attendance scan from ESP32 (Exam-specific)
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

    const { rfidUid, timestamp, examId, entryType = 'entry' } = value;
    // Convert timestamp to CAT timezone if provided, otherwise use current CAT time
    const scanTime = timestamp ? 
      moment.tz(timestamp, 'Africa/Harare').toDate() : 
      moment.tz('Africa/Harare').toDate();

    // Find student by RFID UID
    const student = await Student.findOne({ rfidUid });
    
    if (!student) {
      // Log unknown card scan
      console.log(`Unknown RFID card scanned: ${rfidUid} at ${scanTime}`);
      
      // Emit real-time update for unknown card
      req.io.to('dashboard').emit('unknown-card-scan', {
        rfidUid,
        timestamp: scanTime,
        examId,
        entryType,
        message: 'Unknown RFID card detected'
      });

      return res.status(404).json({
        success: false,
        message: 'Unknown RFID card. Please enroll the student first.',
        data: { rfidUid, timestamp: scanTime, examId, entryType }
      });
    }

    // If examId is provided, find the specific exam and check enrollment
    let currentExam = null;
    if (examId) {
      const Exam = require('../models/Exam');
      currentExam = await Exam.findOne({ 
        examId: examId, 
        isActive: true,
        status: { $in: ['Scheduled', 'In Progress'] }
      });

      if (!currentExam) {
        return res.status(404).json({
          success: false,
          message: 'Exam not found or not active',
          data: { examId, rfidUid, timestamp: scanTime, entryType }
        });
      }

      // Check if student is enrolled in this exam
      const isEnrolled = currentExam.enrolledStudents.some(
        enrollment => enrollment.studentId.toString() === student._id.toString()
      );

      if (!isEnrolled) {
        // Log unauthorized scan attempt
        console.log(`Student ${student.name} (${student.regNo}) not enrolled in exam ${examId}`);
        
        // Emit real-time update for unauthorized scan
        req.io.to('dashboard').emit('unauthorized-scan', {
          student: {
            name: student.name,
            regNo: student.regNo,
            course: student.course
          },
          examId,
          timestamp: scanTime,
          entryType,
          message: 'Student not enrolled in this exam'
        });

        return res.status(403).json({
          success: false,
          message: `Student ${student.name} is not enrolled in exam ${examId}`,
          data: { 
            student: { name: student.name, regNo: student.regNo, course: student.course },
            examId, 
            timestamp: scanTime,
            entryType
          }
        });
      }

      // Check if exam is within the allowed time window
      const examDate = new Date(currentExam.examDate);
      const [startHour, startMin] = currentExam.startTime.split(':');
      const [endHour, endMin] = currentExam.endTime.split(':');
      
      const examStartTime = new Date(examDate);
      examStartTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
      
      const examEndTime = new Date(examDate);
      examEndTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

      // Allow scanning from grace period before start time
      const gracePeriod = currentExam.attendanceSettings?.lateEntryGracePeriod || 15;
      const allowedStartTime = new Date(examStartTime.getTime() - gracePeriod * 60000);

      if (entryType === 'entry' && scanTime < allowedStartTime) {
        return res.status(400).json({
          success: false,
          message: `Entry scanning not allowed yet. Exam starts at ${currentExam.startTime}`,
          data: { examId, examStartTime: currentExam.startTime, currentTime: scanTime, entryType }
        });
      }

      if (entryType === 'exit' && scanTime > examEndTime) {
        // Allow exit scans even after exam ends
        console.log(`Late exit scan allowed for ${student.name} after exam end time`);
      }
    }

    // Check if already scanned for this exam today
    const today = moment.tz(scanTime, 'Africa/Harare').format('YYYY-MM-DD');
    const attendanceFilter = {
      studentId: student._id,
      date: today
    };
    
    // If exam-specific, check for that exam, otherwise general attendance
    if (currentExam) {
      attendanceFilter.examId = currentExam._id;
    }

    const existingAttendance = await Attendance.findOne(attendanceFilter);

    if (existingAttendance) {
      // Handle entry/exit logic
      if (entryType === 'entry') {
        // Update entry time
        existingAttendance.timestamp = scanTime;
        existingAttendance.time = moment.tz(scanTime, 'Africa/Harare').format('HH:mm:ss');
        existingAttendance.entryType = 'entry';
      } else if (entryType === 'exit') {
        // Add exit information
        existingAttendance.exitTimestamp = scanTime;
        existingAttendance.exitTime = moment.tz(scanTime, 'Africa/Harare').format('HH:mm:ss');
        existingAttendance.entryType = 'exit'; // Update to show last scan type
      }
      
      await existingAttendance.save();

      const populatedAttendance = await Attendance.findById(existingAttendance._id)
        .populate('studentId', 'name regNo course')
        .populate('examId', 'examName examId subject');

      // Clear stats cache since attendance data changed
      statsCache.clear();

      // Emit real-time update
      req.io.to('dashboard').emit('attendance-updated', {
        attendance: populatedAttendance,
        message: entryType === 'exit' ?
          `${student.name} exited ${currentExam?.examId || 'attendance'}` :
          `${student.name} re-entered ${currentExam?.examId || 'attendance'}`
      });

      return res.json({
        success: true,
        message: entryType === 'exit' ?
          'Exit scan recorded successfully' :
          'Entry scan updated successfully',
        data: populatedAttendance
      });
    }

    // Create new attendance record (first scan of the day)
    const catMoment = moment.tz(scanTime, 'Africa/Harare');
    const attendanceData = {
      studentId: student._id,
      rfidUid,
      timestamp: scanTime,
      date: catMoment.format('YYYY-MM-DD'),
      time: catMoment.format('HH:mm:ss'),
      dayOfWeek: catMoment.format('dddd'),
      status: 'present',
      entryType: entryType || 'entry'
    };

    // Handle exit scan as first scan (unusual case)
    if (entryType === 'exit') {
      attendanceData.exitTimestamp = scanTime;
      attendanceData.exitTime = catMoment.format('HH:mm:ss');
      // Keep entry timestamp empty for exit-only scans
      attendanceData.timestamp = null;
      attendanceData.time = null;
    }

    // Add exam reference if scanning for specific exam
    if (currentExam) {
      attendanceData.examId = currentExam._id;
      attendanceData.examInfo = {
        examId: currentExam.examId,
        examName: currentExam.examName,
        subject: currentExam.subject
      };

      // Find seat number if assigned
      const enrollment = currentExam.enrolledStudents.find(
        e => e.studentId.toString() === student._id.toString()
      );
      if (enrollment?.seatNumber) {
        attendanceData.seatNumber = enrollment.seatNumber;
      }
    }

    const attendance = new Attendance(attendanceData);
    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('studentId', 'name regNo course')
      .populate('examId', 'examName examId subject');

    // Clear stats cache since attendance data changed
    statsCache.clear();

    // Emit real-time update
    req.io.to('dashboard').emit('new-attendance', {
      attendance: populatedAttendance,
      message: entryType === 'exit' ?
        `${student.name} recorded exit for ${currentExam?.examId || 'attendance'}` :
        `${student.name} marked present for ${currentExam?.examId || 'attendance'}`
    });

    res.status(201).json({
      success: true,
      message: entryType === 'exit' ?
        `Exit recorded for ${currentExam?.examId || 'attendance'}` :
        `Entry recorded for ${currentExam?.examId || 'attendance'}`,
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
    const filename = `attendance_export_${moment.tz('Africa/Harare').format('YYYY-MM-DD_HH-mm-ss')}.csv`;
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

    const today = moment.tz('Africa/Harare').format('YYYY-MM-DD');
    const thisWeekStart = moment.tz('Africa/Harare').startOf('week').toDate();
    const thisWeekEnd = moment.tz('Africa/Harare').endOf('week').toDate();

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
              $gte: moment.tz('Africa/Harare').subtract(6, 'days').format('YYYY-MM-DD'),
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
      const date = moment.tz('Africa/Harare').subtract(i, 'days');
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