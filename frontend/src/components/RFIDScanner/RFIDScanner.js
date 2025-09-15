import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import scannerService from '../../services/scanner';
import { formatTimeCAT } from '../../utils/timezone';

const RFIDScanner = ({ selectedExam }) => {
  const [scannerStatus, setScannerStatus] = useState({
    connected: false,
    mode: 'ATTENDANCE',
    lastScan: null,
    isScanning: false,
    consecutiveFailures: 0,
    uptime: '00:00:00'
  });



  // Connect to scanner service
  useEffect(() => {
    // Set up event listeners
    const handleScannerConnect = () => {
      setScannerStatus(prev => ({ ...prev, connected: true }));
      toast.success('Scanner connected');
    };

    const handleScannerDisconnect = () => {
      setScannerStatus(prev => ({ ...prev, connected: false }));
      toast.error('Scanner disconnected');
    };

    const handleStatusUpdate = (status) => {
      setScannerStatus(prev => ({
        ...prev,
        ...status,
        uptime: formatUptime(Date.now() - status.uptime)
      }));
    };

    const handleScan = (scanData) => {
      setScannerStatus(prev => ({
        ...prev,
        lastScan: scanData.timestamp,
        isScanning: false
      }));
      toast.success(`Card scanned: ${scanData.uid}`);
    };

    const handleModeChanged = (data) => {
      setScannerStatus(prev => ({ ...prev, mode: data.mode }));
      toast.success(`Scanner mode changed to ${data.mode}`);
    };

    const handleScannerError = (error) => {
      toast.error(`Scanner error: ${error.message}`);
    };

    // Register event listeners
    scannerService.on('connected', handleScannerConnect);
    scannerService.on('disconnected', handleScannerDisconnect);
    scannerService.on('status', handleStatusUpdate);
    scannerService.on('scan', handleScan);
    scannerService.on('modeChanged', handleModeChanged);
    scannerService.on('scannerError', handleScannerError);

    // Try to connect to scanner via Socket.IO
    try {
      scannerService.connect();
    } catch (error) {
      console.warn('Failed to connect to scanner service, using simulation:', error);
      scannerService.simulateScanner();
    }

    return () => {
      // Cleanup event listeners
      scannerService.off('connected', handleScannerConnect);
      scannerService.off('disconnected', handleScannerDisconnect);
      scannerService.off('status', handleStatusUpdate);
      scannerService.off('scan', handleScan);
      scannerService.off('modeChanged', handleModeChanged);
      scannerService.off('scannerError', handleScannerError);
    };
  }, []);

  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 60000) % 60;
    const hours = Math.floor(ms / 3600000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleModeSwitch = async (mode) => {
    try {
      const success = scannerService.switchMode(mode);
      if (success) {
        toast.success(`Switching scanner to ${mode} mode...`);
        

      } else {
        toast.error('Failed to communicate with scanner');
      }
    } catch (error) {
      toast.error('Failed to switch scanner mode');
    }
  };

  const handleSystemCommand = async (command) => {
    try {
      let success = false;
      
      switch (command) {
        case 'reset':
          success = scannerService.resetScanner();
          if (success) toast.success('Resetting scanner...');
          break;
        case 'test':
          success = scannerService.testScanner();
          if (success) toast.success('Running system test...');
          break;
        case 'status':
          success = scannerService.getStatus();
          if (success) toast.success('Requesting status update...');
          break;
        default:
          break;
      }
      
      if (!success) {
        toast.error('Failed to communicate with scanner');
      }
    } catch (error) {
      toast.error(`Failed to execute ${command} command`);
    }
  };

  const getModeIcon = (mode) => {
    if (mode === 'ATTENDANCE') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      );
    }
  };

  const getStatusColor = () => {
    if (!scannerStatus.connected) return 'text-red-600 bg-red-100';
    if (scannerStatus.consecutiveFailures > 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusText = () => {
    if (!scannerStatus.connected) return 'Disconnected';
    if (scannerStatus.consecutiveFailures > 3) return 'Warning';
    return 'Connected';
  };

  return (
    <div className="space-y-6">
      {/* Scanner Status Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">RFID Scanner Status</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${scannerStatus.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{getStatusText()}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{scannerStatus.mode}</div>
            <div className="text-sm text-gray-600">Current Mode</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{scannerStatus.uptime}</div>
            <div className="text-sm text-gray-600">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{scannerStatus.consecutiveFailures}</div>
            <div className="text-sm text-gray-600">Failures</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {scannerStatus.lastScan ? formatTimeCAT(scannerStatus.lastScan) : 'None'}
            </div>
            <div className="text-sm text-gray-600">Last Scan</div>
          </div>
        </div>
      </div>

      {/* Mode Control Panel */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scanner Mode Control</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Attendance Mode Button */}
          <button
            onClick={() => handleModeSwitch('ATTENDANCE')}
            disabled={!scannerStatus.connected}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              scannerStatus.mode === 'ATTENDANCE'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-center space-x-3">
              {getModeIcon('ATTENDANCE')}
              <div className="text-left">
                <div className="font-semibold">Attendance Mode</div>
                <div className="text-sm opacity-75">Mark student attendance</div>
              </div>
            </div>
          </button>

          {/* Enrollment Mode Button */}
          <button
            onClick={() => handleModeSwitch('ENROLLMENT')}
            disabled={!scannerStatus.connected}
            className={`p-4 rounded-lg border-2 transition-all duration-200 ${
              scannerStatus.mode === 'ENROLLMENT'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center justify-center space-x-3">
              {getModeIcon('ENROLLMENT')}
              <div className="text-left">
                <div className="font-semibold">Enrollment Mode</div>
                <div className="text-sm opacity-75">Register new students</div>
              </div>
            </div>
          </button>
        </div>

        {/* Current Mode Display */}
        <div className={`p-4 rounded-lg ${
          scannerStatus.mode === 'ATTENDANCE' ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center space-x-2">
            {getModeIcon(scannerStatus.mode)}
            <span className="font-medium">
              {scannerStatus.mode === 'ATTENDANCE' 
                ? '📋 Ready to scan cards for attendance marking'
                : '👤 Ready to enroll new students - scan a card to start'
              }
            </span>
          </div>
        </div>
      </div>

      {/* System Commands */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Commands</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => handleSystemCommand('status')}
            disabled={!scannerStatus.connected}
            className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Status
          </button>

          <button
            onClick={() => handleSystemCommand('test')}
            disabled={!scannerStatus.connected}
            className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Test
          </button>

          <button
            onClick={() => handleSystemCommand('reset')}
            disabled={!scannerStatus.connected}
            className="btn-outline text-yellow-600 border-yellow-300 hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>

          <button
            onClick={() => window.open('/api/attendance/export', '_blank')}
            className="btn-outline text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Scans</h3>
        
        <div className="space-y-3">
          {scannerStatus.connected ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Waiting for RFID scans...</p>
              <p className="text-sm">Recent scans will appear here</p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>Scanner disconnected</p>
              <p className="text-sm">Connect your RFID scanner to see scan results</p>
            </div>
          )}
        </div>
      </div>

      {/* Scanner Configuration Info */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scanner Configuration</h3>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Hardware:</strong>
              <ul className="mt-1 text-gray-600">
                <li>• ESP32 Development Board</li>
                <li>• MFRC522 RFID Module</li>
                <li>• Status LEDs (GPIO 2, 4, 16)</li>
                <li>• Buzzer (GPIO 25)</li>
                <li>• Mode Button (GPIO 21)</li>
              </ul>
            </div>
            <div>
              <strong>Network:</strong>
              <ul className="mt-1 text-gray-600">
                <li>• WiFi: {scannerStatus.connected ? 'Connected' : 'Disconnected'}</li>
                <li>• API Endpoint: /api/attendance/scan</li>
                <li>• Enrollment: /api/students</li>
                <li>• Timeout: 15 seconds</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Available Commands:</strong> attendance, enrollment, mode, status, reset, test, cancel</p>
          <p><strong>Hardware Mode Switch:</strong> Press and hold the mode button for 2 seconds to toggle modes</p>
        </div>
      </div>
    </div>
  );
};

export default RFIDScanner;