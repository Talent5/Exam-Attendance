import { io } from 'socket.io-client';
import { WS_URL } from '../config/api';
import toast from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket.id);
      this.isConnected = true;
      
      // Join dashboard room for real-time updates
      this.socket.emit('join-dashboard');
      
      toast.success('Connected to real-time updates');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
      toast.error('Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      toast.error('Failed to connect to server');
    });

    this.setupEventListeners();

    return this.socket;
  }

  setupEventListeners() {
    if (!this.socket) return;

    // New attendance scan
    this.socket.on('new-attendance', (data) => {
      console.log('New attendance:', data);
      toast.success(
        `${data.attendance.student?.name || 'Student'} marked present!`,
        {
          duration: 4000,
          icon: '✅',
        }
      );
      
      // Emit custom event for components to listen
      window.dispatchEvent(new CustomEvent('new-attendance', { detail: data }));
    });

    // Updated attendance (student scanned again)
    this.socket.on('attendance-updated', (data) => {
      console.log('Attendance updated:', data);
      toast.success(
        `${data.attendance.student?.name || 'Student'} scanned again`,
        {
          duration: 3000,
          icon: '🔄',
        }
      );
      
      window.dispatchEvent(new CustomEvent('attendance-updated', { detail: data }));
    });

    // Unknown card scanned
    this.socket.on('unknown-card-scan', (data) => {
      console.log('Unknown card scanned:', data);
      toast.error(
        `Unknown RFID card: ${data.rfidUid}`,
        {
          duration: 5000,
          icon: '❌',
        }
      );
      
      window.dispatchEvent(new CustomEvent('unknown-card-scan', { detail: data }));
    });

    // Student enrolled
    this.socket.on('student-enrolled', (data) => {
      console.log('Student enrolled:', data);
      toast.success(
        `New student enrolled: ${data.student.name}`,
        {
          duration: 4000,
          icon: '🎓',
        }
      );
      
      window.dispatchEvent(new CustomEvent('student-enrolled', { detail: data }));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Utility method to emit events
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // Utility method to listen for events
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Utility method to remove event listeners
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;