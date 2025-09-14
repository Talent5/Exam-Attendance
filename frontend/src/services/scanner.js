// Import Socket.IO client for WebSocket communication
import io from 'socket.io-client';
import { WS_URL } from '../config/api';

// Scanner WebSocket Service for real-time communication with ESP32 via backend
class ScannerService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = {};
  }

  // Connect to Backend Socket.IO scanner namespace
  connect(url = `${WS_URL}/scanner`) {
    try {
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });
      
      this.socket.on('connect', () => {
        console.log('Scanner Socket.IO connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected', { connected: true });
      });

      this.socket.on('disconnect', () => {
        console.log('Scanner Socket.IO disconnected');
        this.isConnected = false;
        this.emit('disconnected', { connected: false });
      });

      this.socket.on('connect_error', (error) => {
        console.error('Scanner Socket.IO error:', error);
        this.emit('error', { error });
      });

      // Listen for scanner events from backend
      this.socket.on('status-update', (data) => {
        this.emit('status', data);
      });

      this.socket.on('scan-result', (data) => {
        this.emit('scan', data);
      });

      this.socket.on('mode-changed', (data) => {
        this.emit('modeChanged', data);
      });

      this.socket.on('command-sent', (data) => {
        console.log('Command sent confirmation:', data);
      });

    } catch (error) {
      console.error('Failed to connect to scanner:', error);
    }
  }

  // Send command to ESP32 via backend
  sendCommand(command, data = {}) {
    if (!this.isConnected || !this.socket) {
      console.warn('Scanner not connected, cannot send command:', command);
      return false;
    }

    try {
      const message = {
        command,
        data,
        timestamp: Date.now()
      };
      this.socket.emit('scanner-command', message);
      return true;
    } catch (error) {
      console.error('Error sending scanner command:', error);
      return false;
    }
  }

  // Scanner control methods
  switchMode(mode) {
    return this.sendCommand('switch_mode', { mode });
  }

  setAttendanceMode() {
    return this.sendCommand('set_mode', { mode: 'ATTENDANCE' });
  }

  setEnrollmentMode() {
    return this.sendCommand('set_mode', { mode: 'ENROLLMENT' });
  }

  resetScanner() {
    return this.sendCommand('reset');
  }

  testScanner() {
    return this.sendCommand('test');
  }

  getStatus() {
    return this.sendCommand('status');
  }

  cancelEnrollment() {
    return this.sendCommand('cancel_enrollment');
  }

  submitEnrollmentData(data) {
    return this.sendCommand('enrollment_data', data);
  }

  // Event handling
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    const index = this.listeners[event].indexOf(callback);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in scanner event callback:', error);
      }
    });
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.listeners = {};
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  // Simulate scanner for development/testing
  simulateScanner() {
    // This method simulates scanner behavior for testing
    console.log('Starting scanner simulation mode');
    
    // Simulate periodic status updates
    setInterval(() => {
      this.emit('status', {
        connected: true,
        mode: Math.random() > 0.5 ? 'ATTENDANCE' : 'ENROLLMENT',
        uptime: Date.now(),
        consecutiveFailures: Math.floor(Math.random() * 3),
        freeHeap: 150000 + Math.floor(Math.random() * 50000)
      });
    }, 10000);

    // Simulate random scans
    setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of scan
        this.emit('scan', {
          uid: 'SIM' + Math.random().toString(36).substr(2, 8).toUpperCase(),
          timestamp: Date.now(),
          mode: Math.random() > 0.5 ? 'ATTENDANCE' : 'ENROLLMENT'
        });
      }
    }, 5000);

    this.isConnected = true;
    this.emit('connected', { connected: true });
  }
}

// Create singleton instance
const scannerService = new ScannerService();

export default scannerService;