const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const connectDB = require('./config/database');
const { optionalAuth } = require('./middleware/auth');
const User = require('./models/User');

// Import routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const examRoutes = require('./routes/exams');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow localhost for development
      if (origin.includes('localhost')) return callback(null, true);
      
      // Allow any Vercel app domain
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      
      // Allow the specific frontend URL if set
      if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"], 
    credentials: true
  }
}); 

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow any Vercel app domain
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    
    // Allow the specific frontend URL if set
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Optional authentication middleware for all routes
app.use(optionalAuth);

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'RFID Attendance System Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/users', require('./routes/users'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Join dashboard room for real-time updates
  socket.on('join-dashboard', () => {
    socket.join('dashboard');
    console.log('Client joined dashboard room:', socket.id);
  });
});

// Scanner WebSocket namespace for RFID scanner communication
const scannerNamespace = io.of('/scanner');
scannerNamespace.on('connection', (socket) => {
  console.log('Scanner client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Scanner client disconnected:', socket.id);
  });
  
  // Scanner command handling
  socket.on('scanner-command', (data) => {
    console.log('Scanner command received:', data);
    
    // Broadcast command to all connected scanners (ESP32 devices)
    scannerNamespace.emit('command', data);
    
    // Send response back to web client
    socket.emit('command-sent', {
      success: true,
      command: data.command,
      timestamp: Date.now()
    });
  });
  
  // Handle ESP32 scanner status updates
  socket.on('scanner-status', (data) => {
    console.log('Scanner status update:', data);
    
    // Broadcast status to web clients
    scannerNamespace.emit('status-update', data);
  });
  
  // Handle ESP32 scan events
  socket.on('scan-event', (data) => {
    console.log('Scan event from ESP32:', data);
    
    // Broadcast scan event to web clients
    scannerNamespace.emit('scan-result', data);
    
    // Also send to dashboard for real-time updates
    io.to('dashboard').emit('rfid-scan', data);
  });
  
  // Handle mode changes
  socket.on('mode-change', (data) => {
    console.log('Scanner mode change:', data);
    
    // Broadcast mode change to all clients
    scannerNamespace.emit('mode-changed', data);
  });
  
  // Send initial connection confirmation
  socket.emit('connected', {
    message: 'Connected to scanner namespace',
    timestamp: Date.now()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Exam Attendance System Backend Server`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
  
  // Create default admin user if none exists
  try {
    await User.createDefaultAdmin();
  } catch (error) {
    console.error('Error creating default admin:', error.message);
  }
  
  console.log(`✅ Server ready for connections`);
});