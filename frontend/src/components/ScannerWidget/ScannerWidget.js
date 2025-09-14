import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const ScannerWidget = () => {
  const [scannerStatus, setScannerStatus] = useState({
    connected: false,
    mode: 'ATTENDANCE',
    lastScan: null,
    isScanning: false
  });

  // Simulate scanner status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setScannerStatus(prev => ({
        ...prev,
        connected: Math.random() > 0.1, // 90% connection simulation
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleQuickModeSwitch = async (mode) => {
    try {
      setScannerStatus(prev => ({ ...prev, mode }));
      toast.success(`Scanner switched to ${mode} mode`);
    } catch (error) {
      toast.error('Failed to switch scanner mode');
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">RFID Scanner</h3>
        <Link
          to="/scanner"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          Manage →
        </Link>
      </div>

      {/* Scanner Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            scannerStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}></div>
          <span className="text-sm font-medium text-gray-700">
            {scannerStatus.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          scannerStatus.mode === 'ATTENDANCE' 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {scannerStatus.mode}
        </div>
      </div>

      {/* Quick Mode Switch */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => handleQuickModeSwitch('ATTENDANCE')}
          disabled={!scannerStatus.connected}
          className={`p-2 text-xs rounded transition-colors ${
            scannerStatus.mode === 'ATTENDANCE'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          📋 Attendance
        </button>
        <button
          onClick={() => handleQuickModeSwitch('ENROLLMENT')}
          disabled={!scannerStatus.connected}
          className={`p-2 text-xs rounded transition-colors ${
            scannerStatus.mode === 'ENROLLMENT'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          👤 Enrollment
        </button>
      </div>

      {/* Scanner Instructions */}
      <div className="text-sm text-gray-600">
        {scannerStatus.connected ? (
          scannerStatus.mode === 'ATTENDANCE' ? (
            <p>✨ Ready to scan cards for attendance</p>
          ) : (
            <p>🎓 Ready to enroll new students</p>
          )
        ) : (
          <p>⚠️ Scanner disconnected - check hardware</p>
        )}
      </div>

      {/* Last Scan Info */}
      {scannerStatus.lastScan && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Last scan: {new Date(scannerStatus.lastScan).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerWidget;