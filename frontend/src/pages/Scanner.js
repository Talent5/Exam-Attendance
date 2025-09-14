import React from 'react';
import RFIDScanner from '../components/RFIDScanner/RFIDScanner';

const Scanner = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RFID Scanner Control</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage RFID scanner modes and monitor scanning operations
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Scanner Active</span>
          </div>
        </div>
      </div>

      {/* Scanner Component */}
      <RFIDScanner />
    </div>
  );
};

export default Scanner;